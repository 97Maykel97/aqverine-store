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
  orderUserId: string;
  customerEmail: string;
  lines: { name: string; color: string; size: string; quantity: number; unitPriceMinor: number }[];
};

const STALE_UNSTARTED_PAYMENT_MS = 45 * 60 * 1000;

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
      id: true, orderId: true, providerPaymentId: true, status: true,
      order: {
        select: {
          userId: true, contactEmail: true,
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

async function cancelUnstartedPayment(paymentId: string) {
  await withCheckoutTransaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true, providerPaymentId: true, orderId: true,
        order: { select: { status: true, items: { select: { variantId: true, quantity: true } } } },
      },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING || payment.providerPaymentId ||
      payment.order.status !== OrderStatus.PENDING_PAYMENT) return;

    for (const item of payment.order.items) {
      if (!item.variantId) throw new CheckoutError("PRODUCT_UNAVAILABLE");
      await transaction.productVariant.update({
        where: { id: item.variantId }, data: { stock: { increment: item.quantity } },
      });
    }
    await transaction.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.FAILED } });
    await transaction.order.update({ where: { id: payment.orderId }, data: { status: OrderStatus.CANCELLED } });
  });
}

async function releaseStaleUnstartedPayments(userId: string) {
  const stale = await getPrisma().payment.findMany({
    where: {
      status: PaymentStatus.PENDING,
      providerPaymentId: null,
      createdAt: { lt: new Date(Date.now() - STALE_UNSTARTED_PAYMENT_MS) },
      order: { userId, status: OrderStatus.PENDING_PAYMENT },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true },
  });
  for (const payment of stale) await cancelUnstartedPayment(payment.id);
}

export async function startCheckout(userId: string, input: CheckoutRequest, provider: PaymentProvider) {
  await releaseStaleUnstartedPayments(userId);
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
  if (reservation.status !== PaymentStatus.PENDING) throw new CheckoutError("PAYMENT_UNAVAILABLE");

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
