import { EventStatus } from '@prisma/client';

export const ACTIVE_ROOM_STATUSES: EventStatus[] = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
  EventStatus.ONGOING,
];

export const ARCHIVED_ROOM_STATUSES: EventStatus[] = [
  EventStatus.CONCLUDED,
  EventStatus.CANCELLED,
];
