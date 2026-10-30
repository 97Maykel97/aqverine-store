import {
  accountOrderDetailSchema,
  accountOrdersSchema,
  accountProfileSchema,
} from "@/features/account/model/account-contracts";
import type { ProfileFormFields } from "@/features/account/model/profile-form";

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 401) throw new Error("SESSION_EXPIRED");
  if (!response.ok) throw new Error("REQUEST_FAILED");
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error("INVALID_RESPONSE");
  }
}

export async function fetchAccountProfile() {
  const response = await fetch("/api/account/profile", { credentials: "same-origin", cache: "no-store" });
  return accountProfileSchema.parse(await readJson(response));
}

export async function saveAccountProfile(fields: ProfileFormFields) {
  const response = await fetch("/api/account/profile", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: fields.fullName.trim() || null,
      phone: fields.phone.trim() || null,
    }),
  });
  return accountProfileSchema.parse(await readJson(response));
}

export async function fetchAccountOrders(page: number) {
  const response = await fetch(`/api/account/orders?page=${page}&limit=10`, {
    credentials: "same-origin", cache: "no-store",
  });
  return accountOrdersSchema.parse(await readJson(response));
}

export async function fetchAccountOrder(orderId: string) {
  const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
    credentials: "same-origin", cache: "no-store",
  });
  return accountOrderDetailSchema.parse(await readJson(response));
}
