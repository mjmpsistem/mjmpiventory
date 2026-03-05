-- DropForeignKey
ALTER TABLE "shipping_item" DROP CONSTRAINT "shipping_item_spkItemId_fkey";

-- AlterTable
ALTER TABLE "shipping_item" ADD COLUMN     "spkReturItemId" UUID,
ALTER COLUMN "spkItemId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "shipping_item_spkReturItemId_idx" ON "shipping_item"("spkReturItemId");

-- AddForeignKey
ALTER TABLE "shipping_item" ADD CONSTRAINT "shipping_item_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_item" ADD CONSTRAINT "shipping_item_spkReturItemId_fkey" FOREIGN KEY ("spkReturItemId") REFERENCES "spk_retur_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
