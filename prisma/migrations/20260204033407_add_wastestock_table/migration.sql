-- CreateTable
CREATE TABLE "waste_stock" (
    "id" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "spkId" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waste_stock_materialId_idx" ON "waste_stock"("materialId");

-- CreateIndex
CREATE INDEX "waste_stock_spkId_idx" ON "waste_stock"("spkId");

-- AddForeignKey
ALTER TABLE "waste_stock" ADD CONSTRAINT "waste_stock_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_stock" ADD CONSTRAINT "waste_stock_spkId_fkey" FOREIGN KEY ("spkId") REFERENCES "spk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
