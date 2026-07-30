import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

// Em dev o Next recarrega os modulos a cada alteracao; sem o cache global
// abririamos uma conexao nova (e um novo handle do SQLite) a cada reload.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL nao definida. Copie .env.example para .env.");
  }

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
