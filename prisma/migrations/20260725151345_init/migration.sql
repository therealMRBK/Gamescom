-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HOCH', 'MITTEL', 'NIEDRIG');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('AAA', 'SIMULATION', 'INDIE', 'SONSTIGE');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('GAMESCOM_BIZ', 'MEET_TO_MATCH', 'DIREKT_EMAIL', 'GAMES_PRESS', 'SONSTIGE');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NICHT_KONTAKTIERT', 'ANGEFRAGT', 'NACHGEFASST', 'BESTAETIGT', 'ABGELEHNT');

-- CreateEnum
CREATE TYPE "FocusArea" AS ENUM ('VIDEO', 'ARTIKEL', 'SOCIAL');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('HANDS_ON', 'ARTIKEL', 'SOCIAL_LIVE', 'REVIEW');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('GEPLANT', 'AUFNAHME_GEMACHT', 'ENTWURF', 'VEROEFFENTLICHT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "focusArea" "FocusArea",
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherEntry" (
    "id" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "games" TEXT[],
    "hall" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MITTEL',
    "category" "Category",
    "contactChannel" "ContactChannel" NOT NULL DEFAULT 'SONSTIGE',
    "contactStatus" "ContactStatus" NOT NULL DEFAULT 'NICHT_KONTAKTIERT',
    "contactPersonName" TEXT,
    "contactPersonEmail" TEXT,
    "notes" TEXT,
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "oldStatus" "ContactStatus",
    "newStatus" "ContactStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisherEntryId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "hall" TEXT,
    "stand" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAssignment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AppointmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "format" "ContentFormat" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'GEPLANT',
    "embargoAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "link" TEXT,
    "notes" TEXT,

    CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "onSite" BOOLEAN NOT NULL DEFAULT true,
    "timeFrom" TEXT,
    "timeTo" TEXT,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PublisherEntry_contactStatus_idx" ON "PublisherEntry"("contactStatus");

-- CreateIndex
CREATE INDEX "PublisherEntry_priority_idx" ON "PublisherEntry"("priority");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentAssignment_appointmentId_userId_key" ON "AppointmentAssignment"("appointmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPiece_appointmentId_key" ON "ContentPiece"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_userId_day_key" ON "Availability"("userId", "day");

-- AddForeignKey
ALTER TABLE "PublisherEntry" ADD CONSTRAINT "PublisherEntry_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PublisherEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_publisherEntryId_fkey" FOREIGN KEY ("publisherEntryId") REFERENCES "PublisherEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAssignment" ADD CONSTRAINT "AppointmentAssignment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAssignment" ADD CONSTRAINT "AppointmentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
