-- CreateTable
CREATE TABLE "ScannedEmail" (
    "id" TEXT NOT NULL,
    "imapAccountId" TEXT NOT NULL,
    "uid" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "emailDate" TIMESTAMP(3),
    "textSnippet" TEXT NOT NULL,
    "isRelevant" BOOLEAN NOT NULL,
    "summary" TEXT,
    "publisherGuess" TEXT,
    "proposedDate" TEXT,
    "proposedTime" TEXT,
    "location" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScannedEmail_imapAccountId_uid_key" ON "ScannedEmail"("imapAccountId", "uid");

-- AddForeignKey
ALTER TABLE "ScannedEmail" ADD CONSTRAINT "ScannedEmail_imapAccountId_fkey" FOREIGN KEY ("imapAccountId") REFERENCES "ImapAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
