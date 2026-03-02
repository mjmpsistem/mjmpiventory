/*
  Warnings:

  - You are about to drop the column `spkItemId` on the `spk_material_usage` table. All the data in the column will be lost.
  - Added the required column `spkId` to the `spk_material_usage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "spk_material_usage" DROP CONSTRAINT "spk_material_usage_spkItemId_fkey";

-- AlterTable
ALTER TABLE "spk_material_usage" DROP COLUMN "spkItemId",
ADD COLUMN     "spkId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "spk_material_usage_spkId_idx" ON "spk_material_usage"("spkId");

-- CreateIndex
CREATE INDEX "spk_material_usage_materialId_idx" ON "spk_material_usage"("materialId");

-- AddForeignKey
ALTER TABLE "spk_material_usage" ADD CONSTRAINT "spk_material_usage_spkId_fkey" FOREIGN KEY ("spkId") REFERENCES "spk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
