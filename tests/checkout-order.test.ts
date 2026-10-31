import { beforeEach, describe, expect, it, vi } from "vitest";

import { startCheckout } from "@/features/checkout/api/checkout-service";
import { CheckoutError, checkoutRequestSchema } from "@/features/checkout/model/checkout-input";
import type { PaymentProvider } from "@/features/payments/model/payment-provider";

const database = vi.hoisted(() => ({
  paymentFindMany: vi.fn(),
  paymentFindUnique: vi.fn(),
  paymentUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    payment: {
      findMany: database.paymentFindMany,
      findUnique: database.paymentFindUnique,
      updateMany: database.paymentUpdateMany,
    },
    $transaction: database.transaction,
  }),
}));

const userId = "71149471-df55-469e-a293-8a19d8a1fa81";
const variantId = "d94ff063-4bb9-4845-9b90-3d02be65ee50";
const orderId = "d7de2cef-16ab-4b38-9346-c5e4b6a693d7";
const paymentId = "89fc4f7a-40e5-46e6-aa56-6f19e461ddcf";

const input = checkoutRequestSchema.parse({
  idempotencyKey: "adf00919-c5cb-4b10-9f97-c2c77dcb0206",
  name: "Alex Stone",
  email: "alex@example.test",
  phone: "+1 555 123 4567",
  comment: "",
  consent: true,
});

function setupCheckout(stock: number) {
  const transaction = {
    payment: { findUnique: vi.fn(async () => null) },
    cart: { findUnique: vi.fn(async () => ({
      items: [{
        variantId,
        quantity: 2,
        variant: {
          sku: "essential-t-shirt-0-M",
          color: "Белый",
          size: "M",
          stock,
          isActive: true,
          priceMinor: null,
          product: {
            id: "17331117-6415-4b5a-af26-b695b62873b8",
            name: "Футболка Essential",
            status: "PUBLISHED",
            archivedAt: null,
            priceMinor: 2900,
            currency: "USD",
          },
        },
      }],
    })) },
    productVariant: { updateMany: vi.fn(async () => ({ count: 1 })) },
    order: { create: vi.fn(async () => ({ id: orderId, payments: [{ id: paymentId }] })) },
  };
  database.transaction.mockImplementation(async (run: (client: typeof transaction) => Promise<unknown>) => run(transaction));
  const provider: PaymentProvider = {
    name: "stripe",
    createPayment: vi.fn(async () => ({ providerPaymentId: "cs_test_123", redirectUrl: "https://checkout.stripe.com/c/pay/test" })),
    recoverRedirectUrl: vi.fn(async () => null),
    verifyWebhook: vi.fn(async () => null),
  };
  return { transaction, provider };
}

beforeEach(() => {
  vi.clearAllMocks();
  database.paymentFindMany.mockResolvedValue([]);
  database.paymentFindUnique.mockResolvedValue(null);
  database.paymentUpdateMany.mockResolvedValue({ count: 1 });
});

describe("checkout order reservation", () => {
  it("revalidates the cart, reserves stock and writes immutable order snapshots", async () => {
    const { transaction, provider } = setupCheckout(3);

    await expect(startCheckout(userId, input, provider)).resolves.toEqual({
      orderId, redirectUrl: "https://checkout.stripe.com/c/pay/test",
    });
    expect(transaction.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: variantId, isActive: true, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(transaction.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        subtotalMinor: 5800,
        totalMinor: 5800,
        status: "PENDING_PAYMENT",
        items: { create: [expect.objectContaining({
          productName: "Футболка Essential",
          color: "Белый",
          size: "M",
          unitPriceMinor: 2900,
          quantity: 2,
          lineTotalMinor: 5800,
        })] },
      }),
    }));
    expect(provider.createPayment).toHaveBeenCalledTimes(1);
  });

  it("rejects an insufficient variant before creating an order or contacting Stripe", async () => {
    const { transaction, provider } = setupCheckout(1);

    await expect(startCheckout(userId, input, provider)).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    } satisfies Partial<CheckoutError>);
    expect(transaction.productVariant.updateMany).not.toHaveBeenCalled();
    expect(transaction.order.create).not.toHaveBeenCalled();
    expect(provider.createPayment).not.toHaveBeenCalled();
  });
});
