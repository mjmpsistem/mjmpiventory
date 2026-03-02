-- AlterTable
ALTER TABLE "spk" ADD COLUMN     "shippingId" UUID;

-- CreateTable
CREATE TABLE "shipping" (
    "id" UUID NOT NULL,
    "spkId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "tglKirim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimasiTiba" TIMESTAMP(3),
    "catatan" TEXT,
    "fotoBuktiUrl" TEXT,
    "penerimaNama" TEXT,
    "waktuSampai" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_spkId_key" ON "shipping"("spkId");

-- AddForeignKey
ALTER TABLE "spk" ADD CONSTRAINT "spk_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "shipping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping" ADD CONSTRAINT "shipping_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
