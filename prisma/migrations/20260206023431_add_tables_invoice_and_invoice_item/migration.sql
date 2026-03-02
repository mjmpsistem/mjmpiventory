-- AlterTable
ALTER TABLE "payment_history" ADD COLUMN     "invoiceId" UUID;

-- CreateTable
CREATE TABLE "invoice" (
    "id" UUID NOT NULL,
    "nomorInvoice" TEXT NOT NULL,
    "spkId" UUID NOT NULL,
    "leadId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "diskon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pajakPpn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pajakPph" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaTambahan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "jatuhTempo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "namaBarang" TEXT NOT NULL,
    "qtyAktual" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "hargaSatuan" DOUBLE PRECISION NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_nomorInvoice_key" ON "invoice"("nomorInvoice");

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_spkId_fkey" FOREIGN KEY ("spkId") REFERENCES "spk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
