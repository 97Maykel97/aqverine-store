import type { NextRequest } from "next/server";

import { accountErrorResponse, accountJson, getAccountRequestContext, readAccountBody } from "@/features/account/api/account-http";
import { getAccountProfile, updateAccountProfile } from "@/features/account/api/account-service";
import { profileUpdateSchema } from "@/features/account/model/account-input";
import { isSameOrigin } from "@/features/auth/api/http";

export async function GET(request: NextRequest) {
  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  try {
    return context.finish(accountJson(await getAccountProfile(context.userId, context.email)));
  } catch {
    return context.finish(accountErrorResponse());
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return accountJson({ message: "Недопустимый запрос." }, 403);
  const parsed = profileUpdateSchema.safeParse(await readAccountBody(request));
  if (!parsed.success) return accountJson({ message: "Проверьте имя и телефон." }, 400);
  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  try {
    return context.finish(accountJson(await updateAccountProfile(context.userId, context.email, parsed.data)));
  } catch {
    return context.finish(accountErrorResponse());
  }
}
