/*
  Warnings:

  - A unique constraint covering the columns `[spkReturNumber]` on the table `production_request` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "production_request" DROP CONSTRAINT "production_request_spkNumber_fkey";

-- AlterTable
ALTER TABLE "production_request" ADD COLUMN     "spkReturNumber" TEXT,
ALTER COLUMN "spkNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "spk_retur_item" ADD COLUMN     "itemId" UUID,
ADD COLUMN     "productionRequestId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "production_request_spkReturNumber_key" ON "production_request"("spkReturNumber");

-- AddForeignKey
ALTER TABLE "production_request" ADD CONSTRAINT "production_request_spkNumber_fkey" FOREIGN KEY ("spkNumber") REFERENCES "spk"("spkNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_request" ADD CONSTRAINT "production_request_spkReturNumber_fkey" FOREIGN KEY ("spkReturNumber") REFERENCES "spk_retur"("spkNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_item" ADD CONSTRAINT "spk_retur_item_productionRequestId_fkey" FOREIGN KEY ("productionRequestId") REFERENCES "production_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_item" ADD CONSTRAINT "spk_retur_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
