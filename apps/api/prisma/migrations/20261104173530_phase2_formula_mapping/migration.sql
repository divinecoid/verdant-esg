-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricMapping" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricMappingItem" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,

    CONSTRAINT "MetricMappingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Formula_code_key" ON "Formula"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MetricMapping_companyId_version_key" ON "MetricMapping"("companyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MetricMappingItem_mappingId_metricId_key" ON "MetricMappingItem"("mappingId", "metricId");

-- AddForeignKey
ALTER TABLE "Formula" ADD CONSTRAINT "Formula_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EsgMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMapping" ADD CONSTRAINT "MetricMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMappingItem" ADD CONSTRAINT "MetricMappingItem_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "MetricMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMappingItem" ADD CONSTRAINT "MetricMappingItem_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "EsgTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMappingItem" ADD CONSTRAINT "MetricMappingItem_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "EsgMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
