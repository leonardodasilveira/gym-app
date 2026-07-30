-- CreateTable
CREATE TABLE "Aluno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "dataNascimento" DATETIME,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alunoId" TEXT NOT NULL,
    "dataAvaliacao" DATETIME NOT NULL,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Avaliacao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medida" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "avaliacaoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "direito" REAL,
    "esquerdo" REAL,
    "valor" REAL,
    CONSTRAINT "Medida_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Teste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "avaliacaoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "Teste_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tentativa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testeId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "repeticoes" INTEGER NOT NULL,
    "cargaValor" REAL NOT NULL,
    "cargaUnidade" TEXT NOT NULL,
    "tempoValor" REAL NOT NULL,
    "tempoUnidade" TEXT NOT NULL,
    CONSTRAINT "Tentativa_testeId_fkey" FOREIGN KEY ("testeId") REFERENCES "Teste" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Avaliacao_alunoId_dataAvaliacao_idx" ON "Avaliacao"("alunoId", "dataAvaliacao");

-- CreateIndex
CREATE UNIQUE INDEX "Medida_avaliacaoId_codigo_key" ON "Medida"("avaliacaoId", "codigo");

-- CreateIndex
CREATE INDEX "Teste_avaliacaoId_idx" ON "Teste"("avaliacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Teste_avaliacaoId_codigo_key" ON "Teste"("avaliacaoId", "codigo");

-- CreateIndex
CREATE INDEX "Tentativa_testeId_idx" ON "Tentativa"("testeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tentativa_testeId_ordem_key" ON "Tentativa"("testeId", "ordem");
