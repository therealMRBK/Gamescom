-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "icsSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "icsUid" TEXT;

-- AlterTable
ALTER TABLE "ImapAccount" ADD COLUMN     "calendarPushEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPort" INTEGER NOT NULL DEFAULT 587,
ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_icsUid_key" ON "Appointment"("icsUid");

