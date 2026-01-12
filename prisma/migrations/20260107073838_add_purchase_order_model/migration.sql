-- CreateTable
CREATE TABLE "purchase_order" (
    "id" UUID NOT NULL,
    "kepada" TEXT NOT NULL,
    "nomorPO" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jatuhTempo" TIMESTAMP(3) NOT NULL,
    "keteranganTambahan" TEXT,
    "hormatKami" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_item" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "ukuran" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "noticeMerkJenis" TEXT,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_nomorPO_key" ON "purchase_order"("nomorPO");

-- CreateIndex
CREATE INDEX "purchase_order_nomorPO_idx" ON "purchase_order"("nomorPO");

-- CreateIndex
CREATE INDEX "purchase_order_userId_idx" ON "purchase_order"("userId");

-- CreateIndex
CREATE INDEX "purchase_order_tanggal_idx" ON "purchase_order"("tanggal");

-- CreateIndex
CREATE INDEX "purchase_order_item_purchaseOrderId_idx" ON "purchase_order_item"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
