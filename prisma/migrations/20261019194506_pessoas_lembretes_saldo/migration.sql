-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "pessoa" TEXT;

-- AlterTable
ALTER TABLE "FinanceData" ADD COLUMN     "investimentoGuardado" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Parcelamento" ADD COLUMN     "pessoa" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lembreteEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pessoas" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "SaldoGuardado" (
    "id" SERIAL NOT NULL,
    "mes" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SaldoGuardado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaldoGuardado_userId_mes_key" ON "SaldoGuardado"("userId", "mes");

-- AddForeignKey
ALTER TABLE "SaldoGuardado" ADD CONSTRAINT "SaldoGuardado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

