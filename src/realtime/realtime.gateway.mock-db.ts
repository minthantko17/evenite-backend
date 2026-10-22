import { CheckInMethod, Role, TicketStatus } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import type {
  AttendanceCheckedInPayload,
  AttendanceUndonePayload,
} from '../attendance/events/attendance.events';

/**
 * Fixtures for RealtimeGateway unit tests.
 *
 * JwtService is mocked by the spec. This file provides JWT payloads for each
 * role, a fake socket, a fake socket.io server that records every
 * `server.to(channel).emit(message, data)` as an entry in `emissions`, and
 * the event payloads the @OnEvent handlers receive.
 */

export const EVENT_ID = '11111111-1111-4111-8111-111111111111';
export const ORGANIZER_PROFILE_ID = '22222222-2222-4222-8222-222222222222';
export const PARTICIPANT_PROFILE_ID = '33333333-3333-4333-8333-333333333333';
export const REGISTRATION_ID = '44444444-4444-4444-8444-444444444444';
export const TICKET_ID = '55555555-5555-4555-8555-555555555555';
export const ATTENDANCE_ID = '66666666-6666-4666-8666-666666666666';

export const ORGANIZER_CHANNEL = `user:ORGANIZER:${ORGANIZER_PROFILE_ID}`;
export const PARTICIPANT_CHANNEL = `user:PARTICIPANT:${PARTICIPANT_PROFILE_ID}`;

export const CHECKED_IN_AT = new Date('2026-05-20T10:15:00.000Z');
export const COUNTS = { registered: 10, checkedIn: 4 };

export const SNAPSHOT = {
  firstName: 'Alice',
  lastName: 'Smith',
  nickname: 'Ali',
  studentId: '650610001',
  major: 'Computer Engineering',
};

// ---- JWT payloads -------------------------------------------------------------

function buildJwtPayload(
  overrides: Partial<JwtAccessPayload>,
): JwtAccessPayload {
  return {
    sub: 'user-1',
    email: 'user@example.com',
    currentRole: null,
    isVerified: true,
    universityId: 'university-1',
    participantProfileId: null,
    organizerProfileId: null,
    hasCreatedProfile: true,
    ...overrides,
  };
}

export const ORGANIZER_JWT = buildJwtPayload({
  currentRole: Role.ORGANIZER,
  organizerProfileId: ORGANIZER_PROFILE_ID,
});

export const PARTICIPANT_JWT = buildJwtPayload({
  currentRole: Role.PARTICIPANT,
  participantProfileId: PARTICIPANT_PROFILE_ID,
});

// profile not yet created: no role / profile ids
export const NO_PROFILE_JWT = buildJwtPayload({
  currentRole: null,
  hasCreatedProfile: false,
});

// role says PARTICIPANT but the profile id is missing
export const PARTICIPANT_WITHOUT_PROFILE_JWT = buildJwtPayload({
  currentRole: Role.PARTICIPANT,
  participantProfileId: null,
});

// ---- socket / server factories -------------------------------------------------

export function createMockSocket(
  overrides: Record<string, unknown> = {},
): Socket {
  return {
    id: 'socket-1',
    handshake: { auth: {}, headers: {} },
    data: {},
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Socket;
}

export interface Emission {
  channel: string;
  message: string;
  data: unknown;
}

export interface MockServerRig {
  server: Server;
  emissions: Emission[];
}

export function createMockServerRig(): MockServerRig {
  const emissions: Emission[] = [];
  const server = {
    to: (channel: string) => ({
      emit: (message: string, data: unknown) => {
        emissions.push({ channel, message, data });
      },
    }),
  } as unknown as Server;
  return { server, emissions };
}

// ---- event payloads ---------------------------------------------------------------

export function buildCheckedInPayload(
  method: CheckInMethod = CheckInMethod.QR_SCAN,
): AttendanceCheckedInPayload {
  return {
    eventId: EVENT_ID,
    organizerProfileId: ORGANIZER_PROFILE_ID,
    participantProfileId: PARTICIPANT_PROFILE_ID,
    attendance: {
      id: ATTENDANCE_ID,
      registrationId: REGISTRATION_ID,
      method,
      checkedInAt: CHECKED_IN_AT,
      ticket: { id: TICKET_ID, status: TicketStatus.USED },
      participantSnapshot: SNAPSHOT,
    },
    counts: COUNTS,
  };
}

export const UNDONE_PAYLOAD: AttendanceUndonePayload = {
  eventId: EVENT_ID,
  organizerProfileId: ORGANIZER_PROFILE_ID,
  participantProfileId: PARTICIPANT_PROFILE_ID,
  registrationId: REGISTRATION_ID,
  ticketId: TICKET_ID,
  counts: COUNTS,
};

export const REGISTRATION_PAYLOAD = {
  eventId: EVENT_ID,
  organizerProfileId: ORGANIZER_PROFILE_ID,
  participantProfileId: PARTICIPANT_PROFILE_ID,
};

export const FEEDBACK_PAYLOAD = {
  eventId: EVENT_ID,
  organizerProfileId: ORGANIZER_PROFILE_ID,
};
