-- CreateTable
CREATE TABLE "spk_item_hpp_material" (
    "id" UUID NOT NULL,
    "spkItemHppId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "hargaSatuan" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spk_item_hpp_material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spk_item_hpp_material_spkItemHppId_idx" ON "spk_item_hpp_material"("spkItemHppId");

-- CreateIndex
CREATE INDEX "spk_item_hpp_material_materialId_idx" ON "spk_item_hpp_material"("materialId");

-- AddForeignKey
ALTER TABLE "spk_item_hpp_material" ADD CONSTRAINT "spk_item_hpp_material_spkItemHppId_fkey" FOREIGN KEY ("spkItemHppId") REFERENCES "spk_item_hpp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_item_hpp_material" ADD CONSTRAINT "spk_item_hpp_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
