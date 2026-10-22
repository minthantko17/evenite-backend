import { DeepMockProxy } from 'jest-mock-extended';
import {
  CheckInMethod,
  Event,
  EventStatus,
  Prisma,
  TicketStatus,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EventValidationService } from '../event/services/event-validation.service';
import {
  AttendanceCrudService,
  AttendanceWithTicket,
  TicketWithAttendance,
} from './services/attendance-crud.service';
import { AttendanceValidationService } from './services/attendance-validation.service';
import { TicketNotActiveException } from './exceptions/ticket-not-active.exception';
import {
  EVENT_ID,
  ORGANIZER_ID,
  QR_TOKEN,
  SNAPSHOT,
  buildAttendance,
  buildAttendanceWithTicket,
  buildTicketWithAttendance,
} from './services/attendance-crud.service.mock-db';

/**
 * Central mock "database" for AttendanceService unit tests.
 *
 * PrismaService ($transaction only), AttendanceCrudService,
 * AttendanceValidationService, EventValidationService and EventEmitter2 are
 * mocked collaborators. applyCentralMockImplementations wires them to a quiet
 * default (owner of a PUBLISHED event, an ACTIVE ticket, a transaction that
 * simply runs its callback) so most tests only override the single thing they
 * are about. validateTicketActive and the two mappers are simulated centrally
 * so the service's branching is visible end to end.
 */

export { EVENT_ID, ORGANIZER_ID, QR_TOKEN };

export const REGISTRATION_ID = 'registration-a';
export const OTHER_ORGANIZER_ID = '44444444-4444-4444-8444-444444444444';
export const COUNTS = { registered: 10, checkedIn: 4 };

// ---- event fixtures -----------------------------------------------------------

export const EVENT_PUBLISHED = {
  id: EVENT_ID,
  organizerId: ORGANIZER_ID,
  status: EventStatus.PUBLISHED,
} as Event;

// ---- ticket / attendance fixtures -----------------------------------------------

// a participant who has not checked in yet
export const TICKET_ACTIVE = buildTicketWithAttendance('a');

// created by the transaction on the happy path
export const ATTENDANCE_CREATED = buildAttendance('a');

// the winner's records when another check-in got there first
export const ATTENDANCE_WINNER = buildAttendance('a', {
  checkedInAt: new Date('2026-05-20T10:14:00.000Z'),
});
export const TICKET_USED = buildTicketWithAttendance('a', ATTENDANCE_WINNER, {
  status: TicketStatus.USED,
});

export const TICKET_USED_NO_ATTENDANCE = buildTicketWithAttendance('a', null, {
  status: TicketStatus.USED,
});
export const TICKET_CANCELLED = buildTicketWithAttendance('a', null, {
  status: TicketStatus.CANCELLED,
});
export const TICKET_EXPIRED = buildTicketWithAttendance('a', null, {
  status: TicketStatus.EXPIRED,
});

// a checked-in participant, as the undo flow reads it
export const ATTENDANCE_WITH_TICKET: AttendanceWithTicket =
  buildAttendanceWithTicket('a');

// ---- Prisma error fixtures -------------------------------------------------------

export const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

export const foreignKeyViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Foreign key failed', {
    code: 'P2003',
    clientVersion: 'test',
  });

// ---- simulated mappers ------------------------------------------------------------

// what mapToReturnAttendanceDto is simulated to return
export function fakeReturnDto(
  attendance: ReturnType<typeof buildAttendance>,
  ticket: { id: string; eventRegistrationId: string; status: TicketStatus },
) {
  return {
    id: attendance.id,
    registrationId: ticket.eventRegistrationId,
    method: attendance.method,
    checkedInAt: attendance.checkedInAt,
    ticket: { id: ticket.id, status: ticket.status },
    participantSnapshot: SNAPSHOT,
  };
}

// what mapToListItemDto is simulated to return
export function fakeListItem(ticket: TicketWithAttendance) {
  return {
    registrationId: ticket.eventRegistrationId,
    ticket: { id: ticket.id, status: ticket.status },
    participantSnapshot: SNAPSHOT,
    attendance: ticket.attendance
      ? {
          id: ticket.attendance.id,
          method: ticket.attendance.method,
          checkedInAt: ticket.attendance.checkedInAt,
        }
      : null,
  };
}

export const METHOD_BY_ENTRY = {
  QR: CheckInMethod.QR_SCAN,
  MANUAL: CheckInMethod.MANUAL,
} as const;

// ---- wiring ---------------------------------------------------------------------

export function applyCentralMockImplementations(mocks: {
  prisma: DeepMockProxy<PrismaService>;
  tx: object;
  crud: DeepMockProxy<AttendanceCrudService>;
  validation: DeepMockProxy<AttendanceValidationService>;
  eventValidation: DeepMockProxy<EventValidationService>;
  emitter: DeepMockProxy<EventEmitter2>;
}): void {
  const { prisma, tx, crud, validation, eventValidation } = mocks;

  // the transaction simply runs its callback with the fake client
  (prisma.$transaction as jest.Mock).mockImplementation(
    (callback: (client: object) => unknown) => callback(tx),
  );

  eventValidation.validateEventOwnership.mockResolvedValue({
    organizerProfileId: ORGANIZER_ID,
  });
  eventValidation.validateEventExists.mockResolvedValue(EVENT_PUBLISHED);

  validation.validateEventCheckable.mockReturnValue({
    message: 'Event is open for check-in.',
  });
  validation.validateTicketActive.mockImplementation((status) => {
    if (status !== TicketStatus.ACTIVE)
      throw new TicketNotActiveException(status);
    return { message: 'Ticket is active.' };
  });
  validation.validateNoFeedbackSubmitted.mockResolvedValue({
    message: 'No feedback submitted.',
  });

  crud.findTicketByQrToken.mockResolvedValue(TICKET_ACTIVE);
  crud.findTicketByRegistrationId.mockResolvedValue(TICKET_ACTIVE);
  crud.findTicketById.mockResolvedValue(TICKET_ACTIVE);
  crud.findAttendanceById.mockResolvedValue(ATTENDANCE_WITH_TICKET);
  crud.markTicketUsed.mockResolvedValue(true);
  crud.createAttendance.mockResolvedValue(ATTENDANCE_CREATED);
  crud.deleteAttendance.mockResolvedValue(true);
  crud.reactivateTicket.mockResolvedValue(undefined);
  crud.getAttendanceSummary.mockResolvedValue({ ...COUNTS });
  crud.mapToReturnAttendanceDto.mockImplementation((attendance, ticket) =>
    fakeReturnDto(attendance, ticket),
  );
  crud.mapToListItemDto.mockImplementation((ticket) => fakeListItem(ticket));
}
