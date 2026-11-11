-- CreateTable
CREATE TABLE "ConexaoBanco" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "nomeBanco" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ultimaSync" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ConexaoBanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransacaoBanco" (
    "id" SERIAL NOT NULL,
    "externoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "cartao" BOOLEAN NOT NULL,
    "categoriaBanco" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendente',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conexaoId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TransacaoBanco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConexaoBanco_itemId_key" ON "ConexaoBanco"("itemId");

-- CreateIndex
CREATE INDEX "ConexaoBanco_userId_idx" ON "ConexaoBanco"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransacaoBanco_externoId_key" ON "TransacaoBanco"("externoId");

-- CreateIndex
CREATE INDEX "TransacaoBanco_userId_estado_idx" ON "TransacaoBanco"("userId", "estado");

-- AddForeignKey
ALTER TABLE "ConexaoBanco" ADD CONSTRAINT "ConexaoBanco_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoBanco" ADD CONSTRAINT "TransacaoBanco_conexaoId_fkey" FOREIGN KEY ("conexaoId") REFERENCES "ConexaoBanco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoBanco" ADD CONSTRAINT "TransacaoBanco_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
