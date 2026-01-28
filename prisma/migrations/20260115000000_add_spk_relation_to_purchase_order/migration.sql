-- AlterTable
ALTER TABLE "purchase_order" ADD COLUMN "spkId" UUID;
ALTER TABLE "purchase_order" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "purchase_order_spkId_idx" ON "purchase_order"("spkId");
CREATE INDEX "purchase_order_status_idx" ON "purchase_order"("status");

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_spkId_fkey" FOREIGN KEY ("spkId") REFERENCES "spk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
