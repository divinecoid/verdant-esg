-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('PERIODIC', 'AD_HOC');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NOT_STARTED', 'ON_GOING', 'SUBMITTED', 'NEED_REVISION', 'APPROVED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'NEED_REVISION');

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "RequestType" NOT NULL,
    "frequency" "Frequency",
    "companyId" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "notes" TEXT,
    "remarks" TEXT,
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewLevel" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequestValue" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "value" TEXT,
    "dataStatus" TEXT,
    "description" TEXT,
    "comment" TEXT,

    CONSTRAINT "DataRequestValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequestAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataRequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewApproval" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "remarks" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSchedule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "dueDays" INTEGER NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptureSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataRequest_number_key" ON "DataRequest"("number");

-- CreateIndex
CREATE INDEX "DataRequest_companyId_status_idx" ON "DataRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "DataRequest_status_reviewLevel_idx" ON "DataRequest"("status", "reviewLevel");

-- CreateIndex
CREATE UNIQUE INDEX "DataRequestValue_requestId_metricId_key" ON "DataRequestValue"("requestId", "metricId");

-- CreateIndex
CREATE UNIQUE INDEX "DataRequestAttachment_storageKey_key" ON "DataRequestAttachment"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSchedule_companyId_frequency_key" ON "CaptureSchedule"("companyId", "frequency");

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "MetricMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequestValue" ADD CONSTRAINT "DataRequestValue_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequestValue" ADD CONSTRAINT "DataRequestValue_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EsgMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequestAttachment" ADD CONSTRAINT "DataRequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewApproval" ADD CONSTRAINT "ReviewApproval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSchedule" ADD CONSTRAINT "CaptureSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
