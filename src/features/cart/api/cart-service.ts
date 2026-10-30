import { Prisma, ProductStatus } from "@/generated/prisma/client";
import { CartDomainError, planGuestCartMerge, type MergeCartInput, type SetCartItemInput } from "@/features/cart/model/server-cart";
import { getPrisma } from "@/shared/lib/prisma";

async function withCartTransaction<T>(run: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getPrisma().$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error("Cart transaction retry limit reached");
}

export async function getCartSnapshot(userId: string) {
  const cart = await getPrisma().cart.findUnique({
    where: { userId },
    select: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          variantId: true,
          quantity: true,
          variant: {
            select: {
              sku: true, color: true, size: true, stock: true, priceMinor: true, isActive: true,
              product: {
                select: {
                  slug: true, name: true, priceMinor: true, currency: true, status: true, archivedAt: true,
                  images: { orderBy: { sortOrder: "asc" }, select: { color: true, localPath: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const items = (cart?.items ?? []).map(({ variantId, quantity, variant }) => {
    const priceMinor = variant.priceMinor ?? variant.product.priceMinor;
    const image = variant.product.images.find((item) => item.color === variant.color) ?? variant.product.images[0];
    return {
      variantId,
      sku: variant.sku,
      slug: variant.product.slug,
      name: variant.product.name,
      color: variant.color,
      size: variant.size,
      quantity,
      availableStock: variant.stock,
      available: variant.isActive && variant.product.status === ProductStatus.PUBLISHED &&
        !variant.product.archivedAt && quantity <= variant.stock,
      unitPriceMinor: priceMinor,
      lineTotalMinor: priceMinor * quantity,
      currency: variant.product.currency,
      imageUrl: image?.localPath ?? null,
    };
  });

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalMinor: items.reduce((sum, item) => sum + item.lineTotalMinor, 0),
    currency: items[0]?.currency ?? "USD",
  };
}

export async function setCartItem(userId: string, input: SetCartItemInput) {
  await withCartTransaction(async (transaction) => {
    const cart = await transaction.cart.findUnique({ where: { userId }, select: { id: true } });
    if (input.quantity === 0) {
      if (cart) await transaction.cartItem.deleteMany({ where: { cartId: cart.id, variantId: input.variantId } });
      return;
    }

    const variant = await transaction.productVariant.findUnique({
      where: { id: input.variantId },
      select: { id: true, stock: true, isActive: true, product: { select: { status: true, archivedAt: true, currency: true } } },
    });
    if (!variant || !variant.isActive || variant.product.status !== ProductStatus.PUBLISHED ||
      variant.product.archivedAt || variant.product.currency !== "USD") {
      throw new CartDomainError("PRODUCT_UNAVAILABLE");
    }
    if (input.quantity > variant.stock) throw new CartDomainError("INSUFFICIENT_STOCK", variant.stock);

    const activeCart = cart ?? await transaction.cart.create({ data: { userId }, select: { id: true } });
    await transaction.cartItem.upsert({
      where: { cartId_variantId: { cartId: activeCart.id, variantId: input.variantId } },
      create: { cartId: activeCart.id, variantId: input.variantId, quantity: input.quantity },
      update: { quantity: input.quantity },
    });
  });

  return getCartSnapshot(userId);
}

export async function mergeGuestCart(userId: string, input: MergeCartInput) {
  const result = await withCartTransaction(async (transaction) => {
    const cart = await transaction.cart.upsert({
      where: { userId }, update: {}, create: { userId }, select: { id: true },
    });
    const prior = await transaction.cartMergeEvent.findUnique({
      where: { cartId_mergeKey: { cartId: cart.id, mergeKey: input.mergeKey } },
      select: { id: true },
    });
    if (prior) return { merged: false, skipped: [] as string[], adjusted: [] as string[] };

    const requested = new Map<string, number>();
    for (const line of input.lines) {
      requested.set(line.sku, (requested.get(line.sku) ?? 0) + line.quantity);
    }
    const variants = await transaction.productVariant.findMany({
      where: {
        sku: { in: [...requested.keys()] },
        isActive: true,
        product: { status: ProductStatus.PUBLISHED, archivedAt: null, currency: "USD" },
      },
      select: { id: true, sku: true, stock: true },
    });
    const existing = await transaction.cartItem.findMany({
      where: { cartId: cart.id, variantId: { in: variants.map((variant) => variant.id) } },
      select: { variantId: true, quantity: true },
    });
    const existingByVariant = new Map(existing.map((line) => [line.variantId, line.quantity]));
    const plan = planGuestCartMerge(input.lines, variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      stock: variant.stock,
      existingQuantity: existingByVariant.get(variant.id) ?? 0,
    })));

    for (const { variantId, quantity } of plan.updates) {
      if (quantity === 0) {
        await transaction.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
      } else {
        await transaction.cartItem.upsert({
          where: { cartId_variantId: { cartId: cart.id, variantId } },
          create: { cartId: cart.id, variantId, quantity },
          update: { quantity },
        });
      }
    }

    await transaction.cartMergeEvent.create({ data: { cartId: cart.id, mergeKey: input.mergeKey } });
    return { merged: true, skipped: plan.skipped, adjusted: plan.adjusted };
  });

  return { ...result, cart: await getCartSnapshot(userId) };
}
