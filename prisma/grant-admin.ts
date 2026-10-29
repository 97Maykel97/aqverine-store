import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { z } from "zod";

import { PrismaClient, UserRole } from "../src/generated/prisma/client";

config({ path: ".env.local" });

async function grantAdmin() {
  const args = process.argv.slice(2);
  const userId = args[args.indexOf("--user-id") + 1];
  if (!args.includes("--confirm") || !z.uuid().safeParse(userId).success) {
    throw new Error("Usage: npm run db:grant-admin -- --user-id <confirmed-supabase-user-uuid> --confirm");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new Error("Verified local user not found. Complete sign-in first.");
    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });
    console.info("Admin role granted to an existing verified user.");
  } finally {
    await prisma.$disconnect();
  }
}

grantAdmin().catch((error: unknown) => {
  const safeMessage = error instanceof Error && (
    error.message.startsWith("Usage:") || error.message.startsWith("Verified local user")
  ) ? error.message : "Admin grant failed. Check the database connection and user ID.";
  console.error(safeMessage);
  process.exitCode = 1;
});
