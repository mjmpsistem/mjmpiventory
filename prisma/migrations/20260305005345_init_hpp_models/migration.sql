-- CreateTable
CREATE TABLE "hpp_template" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "listrik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatorBlowing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatorCutting" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "management" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ongkir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hpp_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spk_item_hpp" (
    "id" UUID NOT NULL,
    "spkItemId" UUID NOT NULL,
    "totalBahanBaku" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listrik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatorBlowing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatorCutting" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "management" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ongkir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHppKeseluruhan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHppPerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hargaJualPerKg" DOUBLE PRECISION DEFAULT 0,
    "profitNominal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitPersen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spk_item_hpp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hpp_template_name_key" ON "hpp_template"("name");

-- CreateIndex
CREATE UNIQUE INDEX "spk_item_hpp_spkItemId_key" ON "spk_item_hpp"("spkItemId");

-- AddForeignKey
ALTER TABLE "spk_item_hpp" ADD CONSTRAINT "spk_item_hpp_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
