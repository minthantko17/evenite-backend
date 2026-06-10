import { Prisma } from '@prisma/client';

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    participantProfile: true;
    organizerProfile: true;
  };
}>;
