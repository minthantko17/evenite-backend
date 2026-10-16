import { Injectable } from '@nestjs/common';
import { EventStatus, TicketStatus } from '@prisma/client';
import { EventNotCheckableException } from '../exceptions/event-not-checkable.exception';
import { TicketNotActiveException } from '../exceptions/ticket-not-active.exception';

// check-in is open for the whole life of an event until it concludes
const CHECKABLE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
  EventStatus.ONGOING,
];

@Injectable()
export class AttendanceValidationService {
  validateEventCheckable(status: EventStatus): { message: string } {
    if (!CHECKABLE_EVENT_STATUSES.includes(status)) {
      throw new EventNotCheckableException();
    }
    return { message: 'Event is open for check-in.' };
  }

  validateTicketActive(status: TicketStatus): { message: string } {
    if (status !== TicketStatus.ACTIVE) {
      throw new TicketNotActiveException(status);
    }
    return { message: 'Ticket is active.' };
  }
}
