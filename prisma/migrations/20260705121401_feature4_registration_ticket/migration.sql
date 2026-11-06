/*
  Warnings:

  - A unique constraint covering the columns `[eventRegistrationId,formId]` on the table `FormResponse` will be added. If there are existing duplicate values, this will fail.
  - Made the column `eventRegistrationId` on table `FormResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "FormResponse" DROP CONSTRAINT "FormResponse_eventRegistrationId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "seatsTaken" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FormResponse" ALTER COLUMN "eventRegistrationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "eventRegistrationId" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "participantSnapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_eventRegistrationId_key" ON "Ticket"("eventRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrToken_key" ON "Ticket"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_eventRegistrationId_formId_key" ON "FormResponse"("eventRegistrationId", "formId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "EventRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
