import { beforeEach, describe, expect, it, vi } from "vitest";

import { retryOrderPayment } from "@/features/checkout/api/checkout-service";
import type { PaymentProvider } from "@/features/payments/model/payment-provider";

const database = vi.hoisted(() => ({ paymentFindUnique: vi.fn(), paymentUpdateMany: vi.fn(), transaction: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    payment: { findUnique: database.paymentFindUnique, updateMany: database.paymentUpdateMany },
    $transaction: database.transaction,
  }),
}));

const userId = "71149471-df55-469e-a293-8a19d8a1fa81";
const orderId = "d7de2cef-16ab-4b38-9346-c5e4b6a693d7";
const variantId = "d94ff063-4bb9-4845-9b90-3d02be65ee50";
const paymentId = "89fc4f7a-40e5-46e6-aa56-6f19e461ddcf";
const idempotencyKey = "adf00919-c5cb-4b10-9f97-c2c77dcb0206";

function setup(priceMinor = 2900, owner = userId) {
  const transaction = {
    payment: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: paymentId })),
    },
    order: {
      findFirst: vi.fn(async ({ where }: { where: { userId: string } }) => where.userId === owner ? ({
        id: orderId, userId: owner, status: "CANCELLED", contactEmail: "buyer@example.test",
        totalMinor: 5800, subtotalMinor: 5800, currency: "USD",
        items: [{ variantId, productName: "Футболка Essential", color: "Чёрный", size: "M", quantity: 2, unitPriceMinor: 2900 }],
        payments: [{ status: "FAILED" }],
      }) : null),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    productVariant: {
      findUnique: vi.fn(async () => ({ isActive: true, stock: 3, priceMinor: null, product: {
        status: "PUBLISHED", archivedAt: null, currency: "USD", priceMinor,
      } })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  database.transaction.mockImplementation(async (run: (client: typeof transaction) => Promise<unknown>) => run(transaction));
  const provider: PaymentProvider = {
    name: "stripe",
    createPayment: vi.fn(async () => ({ providerPaymentId: "cs_test_retry", redirectUrl: "https://checkout.stripe.com/c/pay/retry" })),
    recoverRedirectUrl: vi.fn(async () => null),
    verifyWebhook: vi.fn(async () => null),
  };
  return { transaction, provider };
}

beforeEach(() => {
  vi.clearAllMocks();
  database.paymentFindUnique.mockResolvedValue(null);
  database.paymentUpdateMany.mockResolvedValue({ count: 1 });
});

describe("failed order payment retry", () => {
  it("reserves current stock and creates a new payment for the same order", async () => {
    const { transaction, provider } = setup();

    await expect(retryOrderPayment(userId, orderId, idempotencyKey, provider)).resolves.toEqual({
      orderId, redirectUrl: "https://checkout.stripe.com/c/pay/retry",
    });
    expect(transaction.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: variantId, isActive: true, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(transaction.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderId, idempotencyKey, amountMinor: 5800 }),
    }));
    expect(provider.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      paymentId, orderId, idempotencyKey: paymentId,
    }));
  });

  it("rejects a changed price before reserving stock or contacting Stripe", async () => {
    const { transaction, provider } = setup(3900);

    await expect(retryOrderPayment(userId, orderId, idempotencyKey, provider)).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    expect(transaction.productVariant.updateMany).not.toHaveBeenCalled();
    expect(provider.createPayment).not.toHaveBeenCalled();
  });

  it("does not reveal or retry an order owned by another user", async () => {
    const { transaction, provider } = setup(2900, "another-user");

    await expect(retryOrderPayment(userId, orderId, idempotencyKey, provider)).rejects.toMatchObject({ code: "ORDER_UNAVAILABLE" });
    expect(transaction.payment.create).not.toHaveBeenCalled();
    expect(provider.createPayment).not.toHaveBeenCalled();
  });
});
