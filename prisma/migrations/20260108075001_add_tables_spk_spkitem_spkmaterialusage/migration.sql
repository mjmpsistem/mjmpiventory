-- CreateTable
CREATE TABLE "spk" (
    "id" UUID NOT NULL,
    "spkNumber" TEXT NOT NULL,
    "leadId" INTEGER NOT NULL,
    "tglSpk" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUE',
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spk_item" (
    "id" UUID NOT NULL,
    "spkId" UUID NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "fulfillmentMethod" TEXT NOT NULL DEFAULT 'FROM_STOCK',
    "productionRequestId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spk_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spk_material_usage" (
    "id" UUID NOT NULL,
    "spkItemId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "quantityNeeded" DOUBLE PRECISION NOT NULL,
    "isSufficient" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "spk_material_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spk_spkNumber_key" ON "spk"("spkNumber");

-- CreateIndex
CREATE INDEX "spk_status_idx" ON "spk"("status");

-- CreateIndex
CREATE INDEX "spk_spkNumber_idx" ON "spk"("spkNumber");

-- AddForeignKey
ALTER TABLE "spk" ADD CONSTRAINT "spk_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk" ADD CONSTRAINT "spk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_item" ADD CONSTRAINT "spk_item_spkId_fkey" FOREIGN KEY ("spkId") REFERENCES "spk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_item" ADD CONSTRAINT "spk_item_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_material_usage" ADD CONSTRAINT "spk_material_usage_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_material_usage" ADD CONSTRAINT "spk_material_usage_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
