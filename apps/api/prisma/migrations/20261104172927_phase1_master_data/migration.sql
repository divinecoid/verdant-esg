-- CreateEnum
CREATE TYPE "EsgGroup" AS ENUM ('ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE');

-- CreateTable
CREATE TABLE "EsgTheme" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "EsgGroup" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsgTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsgMetric" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "scope" TEXT,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsgMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataInputAttribute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'decimal',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataInputAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmissionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionFactorValue" (
    "id" TEXT NOT NULL,
    "emissionFactorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(20,6) NOT NULL,

    CONSTRAINT "EmissionFactorValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseYearGhg" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaseYearGhg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EsgTheme_code_key" ON "EsgTheme"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EsgMetric_code_key" ON "EsgMetric"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DataInputAttribute_code_key" ON "DataInputAttribute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactor_code_key" ON "EmissionFactor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactorValue_emissionFactorId_year_key" ON "EmissionFactorValue"("emissionFactorId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "BaseYearGhg_code_key" ON "BaseYearGhg"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BaseYearGhg_year_key" ON "BaseYearGhg"("year");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfig_code_key" ON "AppConfig"("code");

-- AddForeignKey
ALTER TABLE "EsgMetric" ADD CONSTRAINT "EsgMetric_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "EsgTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionFactorValue" ADD CONSTRAINT "EmissionFactorValue_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
