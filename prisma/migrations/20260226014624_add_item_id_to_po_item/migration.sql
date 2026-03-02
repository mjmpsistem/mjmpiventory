-- AlterTable
ALTER TABLE "purchase_order_item" ADD COLUMN     "itemId" UUID;

-- CreateIndex
CREATE INDEX "purchase_order_item_itemId_idx" ON "purchase_order_item"("itemId");

-- AddForeignKey
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
