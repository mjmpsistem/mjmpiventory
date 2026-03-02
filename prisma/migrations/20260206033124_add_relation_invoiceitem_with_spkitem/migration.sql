/*
  Warnings:

  - Added the required column `spkItemId` to the `invoice_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "invoice_item" ADD COLUMN     "spkItemId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
