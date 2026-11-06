-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'CONCLUDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "category" TEXT[],
    "bannerUrl" TEXT,
    "location" JSONB NOT NULL,
    "mapLink" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "seatLimit" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "hasCatering" BOOLEAN NOT NULL DEFAULT false,
    "isCateringFree" BOOLEAN NOT NULL DEFAULT false,
    "cateringDescription" JSONB,
    "agenda" JSONB,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactLineId" TEXT,
    "externalRegistrationUrl" TEXT,
    "remarks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
