-- CreateTable
CREATE TABLE "spk_retur_material_usage" (
    "id" UUID NOT NULL,
    "spkReturId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "quantityNeeded" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spk_retur_material_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spk_retur_material_usage_spkReturId_idx" ON "spk_retur_material_usage"("spkReturId");

-- CreateIndex
CREATE INDEX "spk_retur_material_usage_materialId_idx" ON "spk_retur_material_usage"("materialId");

-- AddForeignKey
ALTER TABLE "spk_retur_material_usage" ADD CONSTRAINT "spk_retur_material_usage_spkReturId_fkey" FOREIGN KEY ("spkReturId") REFERENCES "spk_retur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_retur_material_usage" ADD CONSTRAINT "spk_retur_material_usage_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
