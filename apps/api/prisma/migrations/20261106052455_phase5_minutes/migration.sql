-- CreateTable
CREATE TABLE "MinutesOfMeeting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "notes" TEXT NOT NULL,
    "attachmentName" TEXT,
    "attachmentKey" TEXT,
    "attachmentMime" TEXT,
    "attachmentSize" INTEGER,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinutesOfMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MinutesOfMeeting_companyId_eventDate_idx" ON "MinutesOfMeeting"("companyId", "eventDate");

-- AddForeignKey
ALTER TABLE "MinutesOfMeeting" ADD CONSTRAINT "MinutesOfMeeting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
