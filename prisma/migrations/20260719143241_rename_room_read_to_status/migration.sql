/*
  Warnings:

  - You are about to drop the `RoomRead` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoomRead" DROP CONSTRAINT "RoomRead_readerOrganizerId_fkey";

-- DropForeignKey
ALTER TABLE "RoomRead" DROP CONSTRAINT "RoomRead_readerParticipantId_fkey";

-- DropForeignKey
ALTER TABLE "RoomRead" DROP CONSTRAINT "RoomRead_roomId_fkey";

-- DropTable
DROP TABLE "RoomRead";

-- CreateTable
CREATE TABLE "RoomReadStatus" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readerParticipantId" TEXT,
    "readerOrganizerId" TEXT,

    CONSTRAINT "RoomReadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomReadStatus_roomId_readerParticipantId_key" ON "RoomReadStatus"("roomId", "readerParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomReadStatus_roomId_readerOrganizerId_key" ON "RoomReadStatus"("roomId", "readerOrganizerId");

-- AddForeignKey
ALTER TABLE "RoomReadStatus" ADD CONSTRAINT "RoomReadStatus_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReadStatus" ADD CONSTRAINT "RoomReadStatus_readerParticipantId_fkey" FOREIGN KEY ("readerParticipantId") REFERENCES "ParticipantProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReadStatus" ADD CONSTRAINT "RoomReadStatus_readerOrganizerId_fkey" FOREIGN KEY ("readerOrganizerId") REFERENCES "OrganizerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
