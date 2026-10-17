-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "dia" INTEGER;

-- AlterTable
ALTER TABLE "FinanceData" ADD COLUMN     "alertaEnviado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alertaEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cartoes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "orcamentos" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ContaFixa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dia" INTEGER NOT NULL,
    "categoria" TEXT,
    "mesInicio" TEXT NOT NULL,
    "mesFim" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ContaFixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "alvo" DOUBLE PRECISION NOT NULL,
    "guardado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserva" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContaFixa_userId_idx" ON "ContaFixa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_userId_chave_mes_key" ON "Pagamento"("userId", "chave", "mes");

-- CreateIndex
CREATE INDEX "Meta_userId_idx" ON "Meta"("userId");

-- AddForeignKey
ALTER TABLE "ContaFixa" ADD CONSTRAINT "ContaFixa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A meta que ficava em cada mês vira uma meta de verdade (a do mês mais recente de cada usuário)
INSERT INTO "Meta" ("nome", "alvo", "guardado", "reserva", "userId")
SELECT DISTINCT ON (f."userId") 'Minha meta', f."meta", 0, false, f."userId"
FROM "FinanceData" f
WHERE f."meta" > 0
ORDER BY f."userId", f."mesReferencia" DESC;
