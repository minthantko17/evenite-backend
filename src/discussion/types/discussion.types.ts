import { Prisma } from '@prisma/client';

export type EventWithDiscussionRoom = Prisma.EventGetPayload<{
  include: {
    discussionRoom: true;
  };
}>;
