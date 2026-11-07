import { NextResponse, type NextRequest } from "next/server";

import { allowAuthAttempt } from "@/features/auth/model/rate-limit";
import { applyVerifiedPaymentEvent } from "@/features/payments/api/payment-webhook-service";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";
import { InvalidPaymentSignatureError } from "@/features/payments/model/payment-provider";

const MAX_WEBHOOK_BYTES = 256 * 1024;

function response(status: number) {
  return NextResponse.json({ received: status === 200 }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature") ?? request.headers.get("x-aqverine-demo-signature");
  if (!signature) return response(401);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_WEBHOOK_BYTES) return response(413);
  const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAuthAttempt("payment-webhook", source, 100)) return response(429);

  const provider = getPaymentProvider();
  if (!provider) return response(503);
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) return response(413);
    const event = await provider.verifyWebhook(rawBody, signature);
    if (event) await applyVerifiedPaymentEvent(event);
    return response(200);
  } catch (error) {
    if (error instanceof InvalidPaymentSignatureError) return response(401);
    console.error("Payment webhook processing failed");
    return response(503);
  }
}
