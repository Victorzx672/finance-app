-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceData" (
    "id" SERIAL NOT NULL,
    "mesReferencia" TEXT NOT NULL,
    "renda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gastosFixos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gastosVariaveis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentualInvestimento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "meta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "FinanceData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "financeId" INTEGER NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_usuario_key" ON "User"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceData_userId_mesReferencia_key" ON "FinanceData"("userId", "mesReferencia");

-- AddForeignKey
ALTER TABLE "FinanceData" ADD CONSTRAINT "FinanceData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_financeId_fkey" FOREIGN KEY ("financeId") REFERENCES "FinanceData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
