import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalPrisma = globalThis as typeof globalThis & { aqverinePrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  if (!globalPrisma.aqverinePrisma) {
    globalPrisma.aqverinePrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return globalPrisma.aqverinePrisma;
}
