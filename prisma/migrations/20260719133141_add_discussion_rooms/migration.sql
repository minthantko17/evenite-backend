-- CreateTable
CREATE TABLE "DiscussionRoom" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAnnouncement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderParticipantId" TEXT,
    "senderOrganizerId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomRead" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readerParticipantId" TEXT,
    "readerOrganizerId" TEXT,

    CONSTRAINT "RoomRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionRoom_eventId_key" ON "DiscussionRoom"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomRead_roomId_readerParticipantId_key" ON "RoomRead"("roomId", "readerParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomRead_roomId_readerOrganizerId_key" ON "RoomRead"("roomId", "readerOrganizerId");

-- AddForeignKey
ALTER TABLE "DiscussionRoom" ADD CONSTRAINT "DiscussionRoom_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderParticipantId_fkey" FOREIGN KEY ("senderParticipantId") REFERENCES "ParticipantProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderOrganizerId_fkey" FOREIGN KEY ("senderOrganizerId") REFERENCES "OrganizerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRead" ADD CONSTRAINT "RoomRead_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRead" ADD CONSTRAINT "RoomRead_readerParticipantId_fkey" FOREIGN KEY ("readerParticipantId") REFERENCES "ParticipantProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRead" ADD CONSTRAINT "RoomRead_readerOrganizerId_fkey" FOREIGN KEY ("readerOrganizerId") REFERENCES "OrganizerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
