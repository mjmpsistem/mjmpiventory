-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "transaction_source_idx" ON "transaction"("source");
