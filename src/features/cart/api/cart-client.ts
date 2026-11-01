import { catalogVariantLookupSchema, parseMergeResponse, serverCartSchema, type ServerCart } from "@/features/cart/model/cart-contracts";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error("CART_RESPONSE_INVALID");
  }
}

export async function fetchServerCart(): Promise<ServerCart | null> {
  const response = await fetch("/api/cart", { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("CART_UNAVAILABLE");
  return serverCartSchema.parse(await readJson(response));
}

export async function mergeStoredCart(mergeKey: string, lines: readonly { sku: string; quantity: number }[]) {
  const response = await fetch("/api/cart/merge", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mergeKey, lines }),
  });
  if (!response.ok) throw new Error("CART_MERGE_FAILED");
  return parseMergeResponse(await readJson(response));
}

export async function updateServerCartItem(variantId: string, quantity: number): Promise<ServerCart> {
  const response = await fetch("/api/cart/items", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId, quantity }),
  });
  if (!response.ok) throw new Error("CART_UPDATE_FAILED");
  return serverCartSchema.parse(await readJson(response));
}

export async function resolveServerVariantId(slug: string, sku: string): Promise<string> {
  const response = await fetch(`/api/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("PRODUCT_UNAVAILABLE");
  const product = catalogVariantLookupSchema.parse(await readJson(response));
  const match = product.variants.find((variant) => variant.sku === sku);
  if (!match) throw new Error("PRODUCT_UNAVAILABLE");
  return match.id;
}
