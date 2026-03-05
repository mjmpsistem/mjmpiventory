-- AlterTable
ALTER TABLE "spk_retur" ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "spk_retur_item_spkReturId_idx" ON "spk_retur_item"("spkReturId");
