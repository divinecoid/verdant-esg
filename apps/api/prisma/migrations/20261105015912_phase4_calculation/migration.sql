-- CreateTable
CREATE TABLE "CalculationRun" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "requestId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runById" TEXT,
    "runByName" TEXT NOT NULL,
    "errorCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationResultLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "themeName" TEXT NOT NULL,
    "esgGroup" "EsgGroup" NOT NULL,
    "scope" TEXT,
    "unit" TEXT,
    "inputValue" TEXT,
    "formulaCode" TEXT,
    "formulaExpression" TEXT,
    "emissionFactor" DECIMAL(20,6),
    "result" DECIMAL(24,6),
    "variables" JSONB,
    "error" TEXT,

    CONSTRAINT "CalculationResultLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalculationRun_number_key" ON "CalculationRun"("number");

-- CreateIndex
CREATE INDEX "CalculationRun_requestId_runAt_idx" ON "CalculationRun"("requestId", "runAt");

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationResultLine" ADD CONSTRAINT "CalculationResultLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationResultLine" ADD CONSTRAINT "CalculationResultLine_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EsgMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
