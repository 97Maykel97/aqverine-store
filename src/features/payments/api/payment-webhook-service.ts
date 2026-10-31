import { OrderStatus, PaymentStatus, Prisma, WebhookEventStatus } from "@/generated/prisma/client";

import type { VerifiedPaymentEvent } from "@/features/payments/model/payment-provider";
import { getPrisma } from "@/shared/lib/prisma";

async function withWebhookTransaction<T>(run: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getPrisma().$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error("Payment transaction retry limit reached");
}

export async function applyVerifiedPaymentEvent(event: VerifiedPaymentEvent) {
  return withWebhookTransaction(async (transaction) => {
    const key = { provider_providerEventId: { provider: event.provider, providerEventId: event.eventId } };
    const prior = await transaction.paymentWebhookEvent.findUnique({ where: key, select: { id: true } });
    if (prior) return "duplicate" as const;

    const payment = await transaction.payment.findUnique({
      where: { id: event.paymentId },
      select: {
        id: true, provider: true, providerPaymentId: true, status: true, amountMinor: true, currency: true,
        order: {
          select: {
            id: true, userId: true, status: true,
            items: { select: { variantId: true, quantity: true } },
          },
        },
      },
    });
    const matches = payment && payment.provider === event.provider && payment.amountMinor === event.amountMinor &&
      payment.currency === event.currency && (!event.providerPaymentId || !payment.providerPaymentId ||
        payment.providerPaymentId === event.providerPaymentId);
    const validTransition = matches && (
      (event.outcome === "paid" && payment.status === PaymentStatus.PENDING && payment.order.status === OrderStatus.PENDING_PAYMENT) ||
      ((event.outcome === "cancelled" || event.outcome === "failed") && payment.status === PaymentStatus.PENDING &&
        payment.order.status === OrderStatus.PENDING_PAYMENT) ||
      (event.outcome === "refunded" && payment.status === PaymentStatus.PAID &&
        (payment.order.status === OrderStatus.PAID || payment.order.status === OrderStatus.PROCESSING ||
          payment.order.status === OrderStatus.COMPLETED))
    );

    const recorded = await transaction.paymentWebhookEvent.create({
      data: {
        provider: event.provider,
        providerEventId: event.eventId,
        eventType: event.eventType,
        paymentId: payment?.id ?? null,
        payloadHash: event.payloadHash,
        status: validTransition ? WebhookEventStatus.RECEIVED : WebhookEventStatus.IGNORED,
        processedAt: validTransition ? null : new Date(),
      },
      select: { id: true },
    });
    if (!validTransition || !payment) return "ignored" as const;

    if (event.outcome === "paid") {
      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          ...(event.providerPaymentId && !payment.providerPaymentId ? { providerPaymentId: event.providerPaymentId } : {}),
        },
      });
      await transaction.order.update({ where: { id: payment.order.id }, data: { status: OrderStatus.PAID, paidAt: new Date() } });
      const cart = await transaction.cart.findUnique({ where: { userId: payment.order.userId }, select: { id: true } });
      if (cart) {
        for (const item of payment.order.items) {
          if (item.variantId) {
            await transaction.cartItem.deleteMany({
              where: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity },
            });
          }
        }
      }
    } else if (event.outcome === "cancelled" || event.outcome === "failed") {
      for (const item of payment.order.items) {
        if (!item.variantId) throw new Error("Reserved variant is missing");
        await transaction.productVariant.update({
          where: { id: item.variantId }, data: { stock: { increment: item.quantity } },
        });
      }
      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          status: event.outcome === "cancelled" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED,
          ...(event.providerPaymentId && !payment.providerPaymentId ? { providerPaymentId: event.providerPaymentId } : {}),
        },
      });
      await transaction.order.update({ where: { id: payment.order.id }, data: { status: OrderStatus.CANCELLED } });
    } else {
      await transaction.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
      await transaction.order.update({ where: { id: payment.order.id }, data: { status: OrderStatus.REFUNDED } });
    }

    await transaction.paymentWebhookEvent.update({
      where: { id: recorded.id },
      data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
    });
    return "processed" as const;
  });
}
