-- CreateTable
CREATE TABLE "daily_production_log" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_production_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_production_activity" (
    "id" UUID NOT NULL,
    "productionLogId" UUID NOT NULL,
    "processName" TEXT NOT NULL,
    "resultQty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "wasteQty" DOUBLE PRECISION NOT NULL,
    "wasteUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_production_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_production_log_date_idx" ON "daily_production_log"("date");

-- CreateIndex
CREATE INDEX "daily_production_log_shift_idx" ON "daily_production_log"("shift");

-- AddForeignKey
ALTER TABLE "daily_production_log" ADD CONSTRAINT "daily_production_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_production_activity" ADD CONSTRAINT "daily_production_activity_productionLogId_fkey" FOREIGN KEY ("productionLogId") REFERENCES "daily_production_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
