-- AlterTable
ALTER TABLE "spk_retur_item" ADD COLUMN     "overproductionChoice" TEXT;

-- AlterTable
ALTER TABLE "spk_retur_material_usage" ADD COLUMN     "remainingQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
