/*
  Warnings:

  - Added the required column `satuan` to the `sales_order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sales_order" ADD COLUMN     "inventory_item_id" UUID,
ADD COLUMN     "is_custom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satuan" TEXT NOT NULL,
ALTER COLUMN "jenis_barang" DROP NOT NULL,
ALTER COLUMN "ukuran_barang" DROP NOT NULL,
ALTER COLUMN "spesifikasi_barang" DROP NOT NULL,
ALTER COLUMN "tgl_order" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
