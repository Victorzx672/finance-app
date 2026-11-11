-- DropForeignKey
ALTER TABLE "TransacaoBanco" DROP CONSTRAINT "TransacaoBanco_conexaoId_fkey";

-- AlterTable
ALTER TABLE "TransacaoBanco" ALTER COLUMN "conexaoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TransacaoBanco" ADD CONSTRAINT "TransacaoBanco_conexaoId_fkey" FOREIGN KEY ("conexaoId") REFERENCES "ConexaoBanco"("id") ON DELETE SET NULL ON UPDATE CASCADE;
