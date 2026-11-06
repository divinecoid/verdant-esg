-- CreateEnum
CREATE TYPE "MetricAggregation" AS ENUM ('SUM', 'AVERAGE', 'LATEST');

-- CreateEnum
CREATE TYPE "TargetDirection" AS ENUM ('AT_MOST', 'AT_LEAST');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CLOSED');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "CalculationResultLine" ADD COLUMN     "inputUnit" TEXT;

-- AlterTable
ALTER TABLE "EsgMetric" ADD COLUMN     "aggregation" "MetricAggregation" NOT NULL DEFAULT 'SUM',
ADD COLUMN     "resultUnit" TEXT,
ADD COLUMN     "standardRefs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MetricTarget" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(24,6) NOT NULL,
    "direction" "TargetDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "occurredAt" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "lostDays" INTEGER,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reportedAt" DATE NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "dueDate" DATE,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "owner" TEXT,
    "mitigation" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "reviewDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "regulation" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'NON_COMPLIANT',
    "dueDate" DATE,
    "lastReviewedAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetricTarget_metricId_companyId_year_key" ON "MetricTarget"("metricId", "companyId", "year");

-- CreateIndex
CREATE INDEX "Incident_companyId_occurredAt_idx" ON "Incident"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditFinding_companyId_status_idx" ON "AuditFinding"("companyId", "status");

-- CreateIndex
CREATE INDEX "Risk_companyId_status_idx" ON "Risk"("companyId", "status");

-- CreateIndex
CREATE INDEX "ComplianceItem_companyId_status_idx" ON "ComplianceItem"("companyId", "status");

-- AddForeignKey
ALTER TABLE "MetricTarget" ADD CONSTRAINT "MetricTarget_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EsgMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricTarget" ADD CONSTRAINT "MetricTarget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
