/*
  Warnings:

  - You are about to drop the column `shippingId` on the `spk` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "spk" DROP CONSTRAINT "spk_shippingId_fkey";

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "deductedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceType" TEXT NOT NULL DEFAULT 'PARTIAL';

-- AlterTable
ALTER TABLE "spk" DROP COLUMN "shippingId";

-- AlterTable
ALTER TABLE "spk_item" ADD COLUMN     "invoicedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "itemStatus" TEXT NOT NULL DEFAULT 'QUEUE',
ADD COLUMN     "producedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shippedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "shipping_item" (
    "id" UUID NOT NULL,
    "shippingId" UUID NOT NULL,
    "spkItemId" UUID NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_item_shippingId_idx" ON "shipping_item"("shippingId");

-- CreateIndex
CREATE INDEX "shipping_item_spkItemId_idx" ON "shipping_item"("spkItemId");

-- AddForeignKey
ALTER TABLE "shipping_item" ADD CONSTRAINT "shipping_item_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "shipping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_item" ADD CONSTRAINT "shipping_item_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
