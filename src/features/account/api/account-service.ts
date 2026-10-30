import { getPrisma } from "@/shared/lib/prisma";
import type { ProfileUpdateInput } from "@/features/account/model/account-input";

export async function getAccountProfile(userId: string, email: string) {
  const profile = await getPrisma().profile.findUnique({
    where: { userId },
    select: { fullName: true, phone: true },
  });
  return { email, fullName: profile?.fullName ?? null, phone: profile?.phone ?? null };
}

export async function updateAccountProfile(userId: string, email: string, input: ProfileUpdateInput) {
  const profile = await getPrisma().profile.upsert({
    where: { userId },
    create: { userId, fullName: input.fullName ?? null, phone: input.phone ?? null },
    update: input,
    select: { fullName: true, phone: true },
  });
  return { email, fullName: profile.fullName, phone: profile.phone };
}

const orderSelect = {
  id: true,
  number: true,
  status: true,
  totalMinor: true,
  currency: true,
  createdAt: true,
  items: {
    select: { productName: true, color: true, size: true, quantity: true, unitPriceMinor: true, lineTotalMinor: true },
  },
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { status: true },
  },
};

export async function listAccountOrders(userId: string, page: number, limit: number) {
  const prisma = getPrisma();
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: orderSelect,
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return {
    items: orders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
      totalMinor: order.totalMinor,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      items: order.items,
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getAccountOrder(userId: string, orderId: string) {
  const order = await getPrisma().order.findFirst({
    where: { id: orderId, userId },
    select: {
      ...orderSelect,
      subtotalMinor: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      comment: true,
      paidAt: true,
    },
  });
  if (!order) return null;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.payments[0]?.status ?? null,
    subtotalMinor: order.subtotalMinor,
    totalMinor: order.totalMinor,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    contact: { name: order.contactName, phone: order.contactPhone, email: order.contactEmail },
    comment: order.comment,
    items: order.items,
  };
}
