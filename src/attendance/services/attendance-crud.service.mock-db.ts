import {
  Attendance,
  CheckInMethod,
  Ticket,
  TicketStatus,
} from '@prisma/client';
import {
  AttendanceWithTicket,
  TicketWithAttendance,
} from './attendance-crud.service';

/**
 * Fixture builders for AttendanceCrudService unit tests.
 *
 * PrismaService (and the transaction client) are mocked by the spec; this
 * file only provides the rows Prisma would return and the DTOs the mappers
 * are expected to produce from them.
 */

export const EVENT_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_EVENT_ID = '99999999-9999-4999-8999-999999999999';
export const ORGANIZER_ID = '22222222-2222-4222-8222-222222222222';
export const QR_TOKEN = '33333333-3333-4333-8333-333333333333';

export const CHECKED_IN_AT = new Date('2026-05-20T10:15:00.000Z');

export const SNAPSHOT = {
  firstName: 'Alice',
  lastName: 'Smith',
  nickname: 'Ali',
  studentId: '650610001',
  major: 'Computer Engineering',
};

// the registration-side include every ticket query uses
export const REGISTRATION_PARTICIPANT = {
  eventRegistration: { select: { participantId: true } },
};

export function buildAttendance(
  tag: string,
  overrides: Partial<Attendance> = {},
): Attendance {
  return {
    id: `attendance-${tag}`,
    ticketId: `ticket-${tag}`,
    eventId: EVENT_ID,
    checkedInById: ORGANIZER_ID,
    method: CheckInMethod.QR_SCAN,
    checkedInAt: CHECKED_IN_AT,
    ...overrides,
  };
}

export function buildTicket(
  tag: string,
  overrides: Partial<Ticket> = {},
): Ticket {
  return {
    id: `ticket-${tag}`,
    eventRegistrationId: `registration-${tag}`,
    qrToken: QR_TOKEN,
    status: TicketStatus.ACTIVE,
    participantSnapshot: SNAPSHOT,
    issuedAt: new Date('2026-05-19T08:00:00.000Z'),
    ...overrides,
  };
}

export function buildTicketWithAttendance(
  tag: string,
  attendance: Attendance | null = null,
  overrides: Partial<Ticket> = {},
): TicketWithAttendance {
  return {
    ...buildTicket(tag, overrides),
    eventRegistration: { participantId: `participant-${tag}` },
    attendance,
  };
}

export function buildAttendanceWithTicket(tag: string): AttendanceWithTicket {
  return {
    ...buildAttendance(tag),
    ticket: {
      ...buildTicket(tag, { status: TicketStatus.USED }),
      eventRegistration: { participantId: `participant-${tag}` },
    },
  };
}

// expected list row for a ticket (what mapToListItemDto should produce)
export function expectedListItem(ticket: TicketWithAttendance) {
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
