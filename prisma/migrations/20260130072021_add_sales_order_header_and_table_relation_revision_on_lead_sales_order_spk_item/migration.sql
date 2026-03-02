/*
  Warnings:

  - You are about to drop the column `harga` on the `sales_order` table. All the data in the column will be lost.
  - You are about to drop the column `lead_id` on the `sales_order` table. All the data in the column will be lost.
  - You are about to drop the column `spesifikasi_barang` on the `sales_order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sales_order" DROP CONSTRAINT "sales_order_lead_id_fkey";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "ketebalan" TEXT,
ADD COLUMN     "spesifikasi_tambahan" TEXT,
ADD COLUMN     "warna" TEXT;

-- AlterTable
ALTER TABLE "sales_order" DROP COLUMN "harga",
DROP COLUMN "lead_id",
DROP COLUMN "spesifikasi_barang",
ADD COLUMN     "harga_satuan" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "harga_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "header_id" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ketebalan_barang" TEXT,
ADD COLUMN     "pcs_per_pack" INTEGER,
ADD COLUMN     "spesifikasi_tambahan" TEXT,
ADD COLUMN     "warna_barang" TEXT;

-- AlterTable
ALTER TABLE "spk" ADD COLUMN     "soHeaderId" INTEGER;

-- CreateTable
CREATE TABLE "sales_order_header" (
    "id" SERIAL NOT NULL,
    "nomor_so" TEXT NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_order_header_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_header_nomor_so_key" ON "sales_order_header"("nomor_so");

-- AddForeignKey
ALTER TABLE "sales_order_header" ADD CONSTRAINT "sales_order_header_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_header_id_fkey" FOREIGN KEY ("header_id") REFERENCES "sales_order_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk" ADD CONSTRAINT "spk_soHeaderId_fkey" FOREIGN KEY ("soHeaderId") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
