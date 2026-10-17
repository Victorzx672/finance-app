-- CreateTable
CREATE TABLE "Parcelamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valorParcela" DOUBLE PRECISION NOT NULL,
    "totalParcelas" INTEGER NOT NULL,
    "mesInicio" TEXT NOT NULL,
    "cartao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Parcelamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parcelamento_userId_idx" ON "Parcelamento"("userId");

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

