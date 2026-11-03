const PRODUCT_IMAGE_BUCKET = "aqverine-products";

export function getStorageImageUrl(storageKey: string | null): string | null {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!storageKey || !origin) return null;
  try {
    const path = storageKey.split("/").map(encodeURIComponent).join("/");
    return new URL(`/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`, origin).toString();
  } catch {
    return null;
  }
}

export { PRODUCT_IMAGE_BUCKET };
