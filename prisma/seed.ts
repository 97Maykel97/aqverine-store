import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { getProductImage, mockProducts } from "../src/features/catalog/model/mock-products";
import { PrismaClient, ProductStatus } from "../src/generated/prisma/client";

config({ path: ".env.local" });

async function seedCatalog() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to seed the catalog");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const product of mockProducts) {
      await prisma.$transaction(async (transaction) => {
        const storedProduct = await transaction.product.upsert({
          where: { slug: product.slug },
          update: {},
          create: {
            slug: product.slug,
            name: product.name,
            description: product.description,
            category: product.category,
            composition: product.composition,
            careInstructions: "Бережная стирка при 30°C",
            priceMinor: product.price,
            currency: "USD",
            status: ProductStatus.PUBLISHED,
          },
        });

        await transaction.productVariant.createMany({
          data: product.variants.map((variant) => ({
            productId: storedProduct.id,
            sku: variant.id,
            color: variant.color,
            size: variant.size,
            stock: variant.stock,
          })),
          skipDuplicates: true,
        });

        await transaction.productImage.createMany({
          data: Object.entries(product.imagesByColor).map(([color, localPath], sortOrder) => ({
            productId: storedProduct.id,
            color,
            localPath,
            altText: getProductImage(product, color).alt,
            sortOrder,
          })),
          skipDuplicates: true,
        });
      });
    }

    console.info(`Catalog seed completed: ${mockProducts.length} products`);
  } finally {
    await prisma.$disconnect();
  }
}

seedCatalog().catch(() => {
  console.error("Catalog seed failed. Check DATABASE_URL and migration status.");
  process.exitCode = 1;
});
