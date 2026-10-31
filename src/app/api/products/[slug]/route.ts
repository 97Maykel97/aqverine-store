import { NextResponse } from "next/server";

import { findPublishedProduct } from "@/features/catalog/api/catalog-service";
import { productSlugSchema } from "@/features/catalog/model/catalog-query";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = productSlugSchema.safeParse((await params).slug);
  if (!parsed.success) return NextResponse.json({ message: "Некорректный адрес товара." }, { status: 400 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ message: "Товар временно недоступен." }, { status: 503 });
  }

  try {
    const product = await findPublishedProduct(parsed.data);
    if (!product) return NextResponse.json({ message: "Товар не найден." }, { status: 404 });
    return NextResponse.json(product, { headers: { "Cache-Control": "public, max-age=0, s-maxage=30" } });
  } catch {
    console.error("Product lookup failed");
    return NextResponse.json({ message: "Товар временно недоступен." }, { status: 503 });
  }
}
