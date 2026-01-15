/*
  Warnings:

  - Added the required column `updatedAt` to the `spk_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "reservedStock" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "spk_item" ADD COLUMN     "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "itemId" UUID,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "spk_item" ADD CONSTRAINT "spk_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
