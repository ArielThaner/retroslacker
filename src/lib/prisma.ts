import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const dbPath = process.env.DATABASE_PATH
  ? process.env.DATABASE_PATH
  : path.join(process.cwd(), "dev.db");

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
