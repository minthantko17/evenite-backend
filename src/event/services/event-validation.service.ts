import { ForbiddenException, Injectable } from '@nestjs/common';
import { InvalidPromptException } from '../exceptions/invalid-prompt.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';
import { EventNotFoundException } from '../exceptions/event-not-found.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatusChangeException } from '../exceptions/event-status-change.exception';
import { EventStatus } from '@prisma/client';

@Injectable()
export class EventValidationService {
  constructor(private readonly prisma: PrismaService) {}

  validatePromptText(prompt: string): void {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
      throw new InvalidPromptException("Prompt field can't be empty");
    }

    // invalid if prompt doesn't contain any english or thai alphanumeric character
    if (!/[a-zA-Z0-9\u0E00-\u0E7F]/.test(trimmed)) {
      throw new InvalidPromptException('Invalid Input');
    }
  }

  validatePublishDateRange(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new InvalidDateRangeException();
    }
  }

  async validateEventExists(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new EventNotFoundException();
    }
  }

  async validateEventOwnership(
    eventId: string,
    organizerProfileId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new EventNotFoundException();
    }

    if (event.organizerId !== organizerProfileId) {
      throw new ForbiddenException(
        'You do not have permission to edit this event.',
      );
    }
  }

  validateStatusTransition(
    currentStatus: EventStatus,
    newStatus: EventStatus,
  ): void {
    const allowedTransitions: Partial<Record<EventStatus, EventStatus[]>> = {
      [EventStatus.PUBLISHED]: [
        EventStatus.ONGOING,
        EventStatus.CONCLUDED,
        EventStatus.CANCELLED,
      ],
      [EventStatus.ONGOING]: [
        EventStatus.PUBLISHED,
        EventStatus.CONCLUDED,
        EventStatus.CANCELLED,
      ],
    };

    const allowed = allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new EventStatusChangeException(
        `Cannot transition from ${currentStatus} to ${newStatus}.`,
      );
    }
  }
}
