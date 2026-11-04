import { OrderStatus, PaymentStatus, Prisma, ProductStatus } from "@/generated/prisma/client";

import { CheckoutError, type CheckoutRequest } from "@/features/checkout/model/checkout-input";
import type { PaymentProvider } from "@/features/payments/model/payment-provider";
import { getPrisma } from "@/shared/lib/prisma";

const MAX_MONEY_MINOR = 2_147_483_647;

type ReservedPayment = {
  id: string;
  orderId: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  provider: string;
  orderStatus: OrderStatus;
  orderUserId: string;
  customerEmail: string;
  lines: { name: string; color: string; size: string; quantity: number; unitPriceMinor: number }[];
};

async function withCheckoutTransaction<T>(run: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getPrisma().$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new CheckoutError("RETRY_CONFLICT");
}

async function findReservedPayment(idempotencyKey: string): Promise<ReservedPayment | null> {
  const payment = await getPrisma().payment.findUnique({
    where: { idempotencyKey },
    select: {
      id: true, orderId: true, providerPaymentId: true, status: true, provider: true,
      order: {
        select: {
          userId: true, contactEmail: true, status: true,
          items: { select: { productName: true, color: true, size: true, quantity: true, unitPriceMinor: true } },
        },
      },
    },
  });
  return payment ? {
    id: payment.id,
    orderId: payment.orderId,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    provider: payment.provider,
    orderStatus: payment.order.status,
    orderUserId: payment.order.userId,
    customerEmail: payment.order.contactEmail,
    lines: payment.order.items.map((item) => ({
      name: item.productName,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
    })),
  } : null;
}

async function reserveOrder(userId: string, input: CheckoutRequest, providerName: PaymentProvider["name"]): Promise<ReservedPayment> {
  return withCheckoutTransaction(async (transaction) => {
    const existing = await transaction.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (existing) throw new CheckoutError("RETRY_CONFLICT");

    const cart = await transaction.cart.findUnique({
      where: { userId },
      select: {
        items: {
          select: {
            variantId: true, quantity: true,
            variant: {
              select: {
                sku: true, color: true, size: true, stock: true, isActive: true, priceMinor: true,
                product: {
                  select: { id: true, name: true, status: true, archivedAt: true, priceMinor: true, currency: true },
                },
              },
            },
          },
        },
      },
    });
    if (!cart?.items.length) throw new CheckoutError("EMPTY_CART");

    const lines = [...cart.items].sort((left, right) => left.variantId.localeCompare(right.variantId)).map((item) => {
      const { variant } = item;
      if (!variant.isActive || variant.product.status !== ProductStatus.PUBLISHED || variant.product.archivedAt ||
        variant.product.currency !== "USD") throw new CheckoutError("PRODUCT_UNAVAILABLE");
      if (item.quantity > variant.stock) throw new CheckoutError("INSUFFICIENT_STOCK");
      const unitPriceMinor = variant.priceMinor ?? variant.product.priceMinor;
      const lineTotalMinor = unitPriceMinor * item.quantity;
      if (!Number.isSafeInteger(lineTotalMinor) || lineTotalMinor < 1 || lineTotalMinor > MAX_MONEY_MINOR) {
        throw new CheckoutError("INVALID_TOTAL");
      }
      return {
        variantId: item.variantId,
        productId: variant.product.id,
        productName: variant.product.name,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor,
      };
    });
    const totalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
    if (!Number.isSafeInteger(totalMinor) || totalMinor < 1 || totalMinor > MAX_MONEY_MINOR) {
      throw new CheckoutError("INVALID_TOTAL");
    }

    for (const line of lines) {
      const updated = await transaction.productVariant.updateMany({
        where: { id: line.variantId, isActive: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count !== 1) throw new CheckoutError("INSUFFICIENT_STOCK");
    }

    const order = await transaction.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        subtotalMinor: totalMinor,
        totalMinor,
        currency: "USD",
        contactName: input.name,
        contactPhone: input.phone,
        contactEmail: input.email,
        comment: input.comment || null,
        consentAt: new Date(),
        items: { create: lines },
        payments: {
          create: {
            provider: providerName,
            idempotencyKey: input.idempotencyKey,
            amountMinor: totalMinor,
            currency: "USD",
          },
        },
      },
      select: { id: true, payments: { select: { id: true } } },
    });
    return {
      id: order.payments[0].id,
      orderId: order.id,
      providerPaymentId: null,
      status: PaymentStatus.PENDING,
      provider: providerName,
      orderStatus: OrderStatus.PENDING_PAYMENT,
      orderUserId: userId,
      customerEmail: input.email,
      lines: lines.map((line) => ({
        name: line.productName,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
      })),
    };
  });
}

async function reserveRetryPayment(userId: string, orderId: string, idempotencyKey: string, providerName: string): Promise<ReservedPayment> {
  return withCheckoutTransaction(async (transaction) => {
    const existing = await transaction.payment.findUnique({ where: { idempotencyKey }, select: { id: true } });
    if (existing) throw new CheckoutError("RETRY_CONFLICT");

    const order = await transaction.order.findFirst({
      where: { id: orderId, userId, status: OrderStatus.CANCELLED },
      select: {
        id: true, userId: true, status: true, contactEmail: true, totalMinor: true, subtotalMinor: true, currency: true,
        items: { select: { variantId: true, productName: true, color: true, size: true, quantity: true, unitPriceMinor: true } },
        payments: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { status: true } },
      },
    });
    if (!order || !order.items.length || !order.payments.length ||
      (order.payments[0].status !== PaymentStatus.CANCELLED && order.payments[0].status !== PaymentStatus.FAILED)) {
      throw new CheckoutError("ORDER_UNAVAILABLE");
    }
    if (order.currency !== "USD") throw new CheckoutError("PRODUCT_UNAVAILABLE");

    const items = [...order.items].sort((left, right) => (left.variantId ?? "").localeCompare(right.variantId ?? ""));
    let currentTotal = 0;
    for (const item of items) {
      if (!item.variantId) throw new CheckoutError("PRODUCT_UNAVAILABLE");
      const variant = await transaction.productVariant.findUnique({
        where: { id: item.variantId },
        select: {
          isActive: true, stock: true, priceMinor: true,
          product: { select: { status: true, archivedAt: true, currency: true, priceMinor: true } },
        },
      });
      if (!variant?.isActive || variant.product.status !== ProductStatus.PUBLISHED || variant.product.archivedAt ||
        variant.product.currency !== "USD") throw new CheckoutError("PRODUCT_UNAVAILABLE");
      if ((variant.priceMinor ?? variant.product.priceMinor) !== item.unitPriceMinor) throw new CheckoutError("PRICE_CHANGED");
      if (variant.stock < item.quantity) throw new CheckoutError("INSUFFICIENT_STOCK");
      currentTotal += item.unitPriceMinor * item.quantity;
    }
    if (!Number.isSafeInteger(currentTotal) || currentTotal !== order.totalMinor || currentTotal !== order.subtotalMinor) {
      throw new CheckoutError("INVALID_TOTAL");
    }

    for (const item of items) {
      if (!item.variantId) throw new CheckoutError("PRODUCT_UNAVAILABLE");
      const result = await transaction.productVariant.updateMany({
        where: { id: item.variantId, isActive: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count !== 1) throw new CheckoutError("INSUFFICIENT_STOCK");
    }
    const resumed = await transaction.order.updateMany({
      where: { id: order.id, userId, status: OrderStatus.CANCELLED },
      data: { status: OrderStatus.PENDING_PAYMENT },
    });
    if (resumed.count !== 1) throw new CheckoutError("ORDER_UNAVAILABLE");
    const payment = await transaction.payment.create({
      data: { orderId: order.id, provider: providerName, idempotencyKey, amountMinor: order.totalMinor, currency: "USD" },
      select: { id: true },
    });
    return {
      id: payment.id,
      orderId: order.id,
      providerPaymentId: null,
      status: PaymentStatus.PENDING,
      provider: providerName,
      orderStatus: OrderStatus.PENDING_PAYMENT,
      orderUserId: userId,
      customerEmail: order.contactEmail,
      lines: items.map((item) => ({
        name: item.productName, color: item.color, size: item.size,
        quantity: item.quantity, unitPriceMinor: item.unitPriceMinor,
      })),
    };
  });
}

export async function startCheckout(userId: string, input: CheckoutRequest, provider: PaymentProvider) {
  let reservation = await findReservedPayment(input.idempotencyKey);
  if (!reservation) {
    try {
      reservation = await reserveOrder(userId, input, provider.name);
    } catch (error) {
      const duplicateKey = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if ((!duplicateKey) && (!(error instanceof CheckoutError) || error.code !== "RETRY_CONFLICT")) throw error;
      reservation = await findReservedPayment(input.idempotencyKey);
      if (!reservation) throw error;
    }
  }
  if (reservation.orderUserId !== userId) throw new CheckoutError("RETRY_CONFLICT");
  return activateReservedPayment(reservation, provider);
}

export async function retryOrderPayment(userId: string, orderId: string, idempotencyKey: string, provider: PaymentProvider) {
  let reservation = await findReservedPayment(idempotencyKey);
  if (!reservation) {
    try {
      reservation = await reserveRetryPayment(userId, orderId, idempotencyKey, provider.name);
    } catch (error) {
      const duplicateKey = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!duplicateKey && (!(error instanceof CheckoutError) || error.code !== "RETRY_CONFLICT")) throw error;
      reservation = await findReservedPayment(idempotencyKey);
      if (!reservation) throw error;
    }
  }
  if (reservation.orderUserId !== userId || reservation.orderId !== orderId) throw new CheckoutError("RETRY_CONFLICT");
  return activateReservedPayment(reservation, provider);
}

async function activateReservedPayment(reservation: ReservedPayment, provider: PaymentProvider) {
  if (reservation.status !== PaymentStatus.PENDING || reservation.orderStatus !== OrderStatus.PENDING_PAYMENT ||
    reservation.provider !== provider.name) throw new CheckoutError("PAYMENT_UNAVAILABLE");

  if (reservation.providerPaymentId) {
    const redirectUrl = await provider.recoverRedirectUrl(reservation.providerPaymentId);
    if (!redirectUrl) throw new CheckoutError("PAYMENT_UNAVAILABLE");
    return { orderId: reservation.orderId, redirectUrl };
  }

  try {
    const created = await provider.createPayment({
      paymentId: reservation.id,
      orderId: reservation.orderId,
      customerEmail: reservation.customerEmail,
      currency: "USD",
      idempotencyKey: reservation.id,
      lines: reservation.lines,
    });
    await getPrisma().payment.updateMany({
      where: { id: reservation.id, status: PaymentStatus.PENDING },
      data: { providerPaymentId: created.providerPaymentId },
    });
    return { orderId: reservation.orderId, redirectUrl: created.redirectUrl };
  } catch {
    throw new CheckoutError("PAYMENT_UNAVAILABLE");
  }
}
