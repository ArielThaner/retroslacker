import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db");
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();
globalForPrisma.prisma = prisma;
