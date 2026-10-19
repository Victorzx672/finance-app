-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guardadoGeral" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RendaFixa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "mesInicio" TEXT NOT NULL,
    "mesFim" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RendaFixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RendaFixa_userId_idx" ON "RendaFixa"("userId");

-- AddForeignKey
ALTER TABLE "RendaFixa" ADD CONSTRAINT "RendaFixa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

