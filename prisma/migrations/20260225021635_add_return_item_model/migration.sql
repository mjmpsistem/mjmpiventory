-- CreateTable
CREATE TABLE "return_item" (
    "id" UUID NOT NULL,
    "shippingItemId" UUID NOT NULL,
    "spkItemId" UUID NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_item_shippingItemId_idx" ON "return_item"("shippingItemId");

-- CreateIndex
CREATE INDEX "return_item_spkItemId_idx" ON "return_item"("spkItemId");

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_shippingItemId_fkey" FOREIGN KEY ("shippingItemId") REFERENCES "shipping_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_spkItemId_fkey" FOREIGN KEY ("spkItemId") REFERENCES "spk_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
