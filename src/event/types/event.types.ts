import { Prisma } from '@prisma/client';

export type EventRegistrationWithEvent = Prisma.EventRegistrationGetPayload<{
  include: { event: true };
}>;
