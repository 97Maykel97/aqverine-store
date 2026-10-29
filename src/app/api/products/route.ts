import { NextResponse, type NextRequest } from "next/server";

import { listPublishedProducts } from "@/features/catalog/api/catalog-service";
import { parseCatalogQuery } from "@/features/catalog/model/catalog-query";

export async function GET(request: NextRequest) {
  const parsed = parseCatalogQuery(request.nextUrl.searchParams);
  if (!parsed.success) return NextResponse.json({ message: "Некорректные параметры каталога." }, { status: 400 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ message: "Каталог временно недоступен." }, { status: 503 });
  }

  try {
    const catalog = await listPublishedProducts(parsed.data);
    return NextResponse.json(catalog, { headers: { "Cache-Control": "public, max-age=0, s-maxage=30" } });
  } catch {
    console.error("Catalog lookup failed");
    return NextResponse.json({ message: "Каталог временно недоступен." }, { status: 503 });
  }
}
