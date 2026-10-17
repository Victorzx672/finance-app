-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('VERIFICACAO', 'RECUPERACAO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "emailVerificado" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TokenEmail" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TokenEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenEmail_tokenHash_key" ON "TokenEmail"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "TokenEmail" ADD CONSTRAINT "TokenEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

