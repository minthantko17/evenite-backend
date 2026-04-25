/*
  Warnings:

  - You are about to drop the column `externalRegistrationUrl` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "externalRegistrationUrl",
ADD COLUMN     "externalUrl" TEXT;
