-- DropForeignKey
ALTER TABLE "invoice_item" DROP CONSTRAINT "invoice_item_spkItemId_fkey";

-- AlterTable
ALTER TABLE "invoice_item" ADD COLUMN     "spkReturItemId" UUID,
ALTER COLUMN "spkItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_spkReturItemId_fkey" FOREIGN KEY ("spkReturItemId") REFERENCES "spk_retur_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_item" ADD CONSTRAINT "spk_retur_item_originalSpkItemId_fkey" FOREIGN KEY ("originalSpkItemId") REFERENCES "spk_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
