-- AlterTable
ALTER TABLE "spk_item" ADD COLUMN     "actualQty" DOUBLE PRECISION,
ADD COLUMN     "wasteQty" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "spk_material_usage" ADD COLUMN     "remainingQty" DOUBLE PRECISION DEFAULT 0;
