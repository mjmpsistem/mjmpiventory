-- DropForeignKey
ALTER TABLE "spk_item" DROP CONSTRAINT "spk_item_salesOrderId_fkey";

-- AlterTable
ALTER TABLE "spk_item" ALTER COLUMN "salesOrderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "spk_item" ADD CONSTRAINT "spk_item_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
