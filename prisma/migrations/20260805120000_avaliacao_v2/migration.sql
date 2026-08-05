-- Modelo de avaliacao v2 (docs/evaluation-model-v2-proposal.md).
--
-- `Teste` e `Tentativa` sao removidas e substituidas por `MedidaVelocidade`,
-- uma linha por exercicio (opcao A da secao 11.2 da proposta). Os dados
-- descartados sao exclusivamente do seed ficticio: a importacao da planilha
-- real nunca aconteceu (secao 13), entao nao ha dado de atleta a migrar. Nao
-- existe criterio automatico honesto para escolher "a melhor tentativa" — a
-- escolha e do professor e passa a ser feita fora do sistema.

-- DropTable
DROP TABLE "Tentativa";

-- DropTable
DROP TABLE "Teste";

-- CreateTable
CREATE TABLE "MedidaVelocidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "avaliacaoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cargaKg" REAL,
    "tempoSegundos" REAL,
    CONSTRAINT "MedidaVelocidade_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MedidaVelocidade_avaliacaoId_idx" ON "MedidaVelocidade"("avaliacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "MedidaVelocidade_avaliacaoId_codigo_key" ON "MedidaVelocidade"("avaliacaoId", "codigo");

-- RedefineTable
-- `Medida.unidade` passa a aceitar NULL: os quatro saltos novos ficam sem
-- unidade confirmada ate o cliente responder (bloqueio B6). SQLite nao tem
-- ALTER COLUMN, entao a tabela e recriada com os dados preservados.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Medida" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "avaliacaoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidade" TEXT,
    "direito" REAL,
    "esquerdo" REAL,
    "valor" REAL,
    CONSTRAINT "Medida_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "Avaliacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Medida" ("id", "avaliacaoId", "codigo", "unidade", "direito", "esquerdo", "valor")
SELECT "id", "avaliacaoId", "codigo", "unidade", "direito", "esquerdo", "valor" FROM "Medida";

DROP TABLE "Medida";

ALTER TABLE "new_Medida" RENAME TO "Medida";

CREATE UNIQUE INDEX "Medida_avaliacaoId_codigo_key" ON "Medida"("avaliacaoId", "codigo");

PRAGMA foreign_keys=ON;
