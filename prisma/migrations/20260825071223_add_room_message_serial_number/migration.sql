/*
  Warnings:

  - Added the required column `serialNumber` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiscussionRoom" ADD COLUMN     "lastSerialNumber" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "serialNumber" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RoomReadStatus" ADD COLUMN     "lastReadSerialNumber" INTEGER NOT NULL DEFAULT 0;
