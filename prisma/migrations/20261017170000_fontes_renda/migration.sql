-- CreateTable
CREATE TABLE "FonteRenda" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "financeId" INTEGER NOT NULL,

    CONSTRAINT "FonteRenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FonteRenda_financeId_idx" ON "FonteRenda"("financeId");

-- AddForeignKey
ALTER TABLE "FonteRenda" ADD CONSTRAINT "FonteRenda_financeId_fkey" FOREIGN KEY ("financeId") REFERENCES "FinanceData"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Converte a renda já salva em uma fonte de renda por mês
INSERT INTO "FonteRenda" ("nome", "valor", "financeId")
SELECT 'Renda', "renda", "id" FROM "FinanceData" WHERE "renda" > 0;
