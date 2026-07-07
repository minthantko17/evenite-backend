import { Injectable, ForbiddenException } from '@nestjs/common';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventNotRegisterableException } from '../exceptions/event-not-registerable.exception';
import { AlreadyRegisteredException } from '../exceptions/already-registered.exception';
import { RegistrationAlreadyCancelledException } from '../exceptions/registration-already-cancelled.exception';
import { RegistrationNotCancellableException } from '../exceptions/registration-not-cancellable.exception';
import { RegistrationNotFoundException } from '../exceptions/registration-not-found.exception';

@Injectable()
export class RegistrationValidationService {
  constructor(private readonly prisma: PrismaService) {}

  // only PUBLISHED or ONGOING events can be registered
  validateEventRegisterable(status: EventStatus): { message: string } {
    const registerableStatuses: EventStatus[] = [
      EventStatus.PUBLISHED,
      EventStatus.ONGOING,
    ];
    if (!registerableStatuses.includes(status)) {
      throw new EventNotRegisterableException();
    }
    return { message: 'Event is accepting registrations.' };
  }

  // participant's uni must match event's uni
  validateSameUniversity(
    participantUniversityId: string,
    eventUniversityId: string,
  ): { message: string } {
    if (participantUniversityId !== eventUniversityId) {
      throw new ForbiddenException(
        'You can only register for events within your university.',
      );
    }
    return { message: 'University matches.' };
  }

  async validateNotAlreadyRegistered(
    eventId: string,
    participantProfileId: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.eventRegistration.findUnique({
      where: {
        participantId_eventId: {
          participantId: participantProfileId,
          eventId,
        },
      },
      select: { status: true },
    });

    // CANCELLED registrations can be re-registered
    if (existing && existing.status !== RegistrationStatus.CANCELLED) {
      throw new AlreadyRegisteredException();
    }
    return { message: 'Participant is not already registered.' };
  }

  validateCancellable(
    registration: { status: RegistrationStatus },
    event: { status: EventStatus; startAt: Date | null },
  ): { message: string } {
    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new RegistrationAlreadyCancelledException();
    }

    const nonCancellableStatuses: EventStatus[] = [
      EventStatus.ONGOING,
      EventStatus.CONCLUDED,
      EventStatus.CANCELLED,
    ];
    if (nonCancellableStatuses.includes(event.status)) {
      throw new RegistrationNotCancellableException(
        'Cannot cancel after event has started or ended.',
      );
    }

    // if startAt is null → allow cancel (safe fallback)
    if (event.startAt && event.startAt <= new Date()) {
      throw new RegistrationNotCancellableException(
        'Cannot cancel after event start time has passed.',
      );
    }

    return { message: 'Registration can be cancelled.' };
  }

  async validateTicketOwnership(
  ticketId: string,
  participantProfileId: string,
): Promise<{ message: string }> {
  const ticket = await this.prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      eventRegistration: {
        select: { participantId: true },
      },
    },
  });

  // intentionally return only Reg not found to avoid leaking ticket existence
  if (!ticket || ticket.eventRegistration.participantId !== participantProfileId) {
    throw new RegistrationNotFoundException();
  }

  return { message: 'Ticket ownership validated.' };
}
}
