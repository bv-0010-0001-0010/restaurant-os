-- CreateTable
CREATE TABLE "PayRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "taxRatePct" DOUBLE PRECISION NOT NULL,
    "superRatePct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "superCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayRun_periodStart_idx" ON "PayRun"("periodStart");

-- CreateIndex
CREATE INDEX "Payslip_payRunId_idx" ON "Payslip"("payRunId");

-- CreateIndex
CREATE INDEX "Payslip_userId_idx" ON "Payslip"("userId");

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
