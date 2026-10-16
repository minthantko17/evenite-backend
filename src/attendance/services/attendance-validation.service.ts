import { Injectable } from '@nestjs/common';
import { EventStatus, FormType, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventNotCheckableException } from '../exceptions/event-not-checkable.exception';
import { TicketNotActiveException } from '../exceptions/ticket-not-active.exception';
import { FeedbackAlreadySubmittedException } from '../exceptions/feedback-already-submitted.exception';

// check-in is open for the whole life of an event until it concludes
const CHECKABLE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
  EventStatus.ONGOING,
];

@Injectable()
export class AttendanceValidationService {
  constructor(private readonly prisma: PrismaService) {}

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

  // a check-in can't be undone once the participant has given feedback,
  // since feedback requires attendance
  async validateNoFeedbackSubmitted(
    registrationId: string,
  ): Promise<{ message: string }> {
    const feedbackCount = await this.prisma.formResponse.count({
      where: {
        eventRegistrationId: registrationId,
        form: { type: FormType.FEEDBACK },
      },
    });
    if (feedbackCount > 0) {
      throw new FeedbackAlreadySubmittedException();
    }
    return { message: 'No feedback submitted.' };
  }
}
