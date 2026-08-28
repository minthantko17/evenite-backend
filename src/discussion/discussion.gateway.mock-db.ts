import { createHash } from 'crypto';
import { DeepMockProxy } from 'jest-mock-extended';
import { Server, Socket } from 'socket.io';
import { Role } from '@prisma/client';
import { DiscussionService } from './discussion.service';
import { ReturnMessageDto } from './dto/return-message.dto';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

/**
 * Central mock "database" for DiscussionGateway unit tests.
 *
 * DiscussionGateway has no Prisma access of its own — it delegates to
 * DiscussionService (mocked) and JwtService (mocked), and drives socket.io's
 * Server/Socket (also mocked, no real sockets opened). The fixtures here are
 * JWT payloads, message DTOs, and socket/server factories; central wiring
 * only needs to cover DiscussionService.getRoomMemberIds, since that's the
 * one call every "send succeeds" test exercises via pushChatListUpdate.
 */

function uuidFrom(tag: string): string {
  const hex = createHash('sha256').update(tag).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ---- ids ----------------------------------------------------------------------

export const USERS = {
  ORGANIZER_MAIN: { id: uuidFrom('gateway-organizer-main') },
  PARTICIPANT_MAIN: { id: uuidFrom('gateway-participant-main') },
  PARTICIPANT_OTHER: { id: uuidFrom('gateway-participant-other') },
};

export const ROOM_ID = uuidFrom('gateway-room-main');
export const EVENT_ID = uuidFrom('gateway-event-main');
export const USER_ID = uuidFrom('gateway-user-main');

// ---- JWT payload fixtures -------------------------------------------------------

export function buildPayload(overrides: Partial<JwtAccessPayload> = {}): JwtAccessPayload {
  return {
    sub: USER_ID,
    email: 'user@example.com',
    currentRole: Role.PARTICIPANT,
    isVerified: true,
    universityId: 'uni-1',
    participantProfileId: USERS.PARTICIPANT_MAIN.id,
    organizerProfileId: null,
    hasCreatedProfile: true,
    ...overrides,
  };
}

export const ORGANIZER_PAYLOAD = buildPayload({
  currentRole: Role.ORGANIZER,
  participantProfileId: null,
  organizerProfileId: USERS.ORGANIZER_MAIN.id,
});

export const PARTICIPANT_PAYLOAD = buildPayload({
  currentRole: Role.PARTICIPANT,
  participantProfileId: USERS.PARTICIPANT_MAIN.id,
  organizerProfileId: null,
});

// profile not yet created — no role/profile id assigned
export const NO_PROFILE_PAYLOAD = buildPayload({
  currentRole: null,
  participantProfileId: null,
  organizerProfileId: null,
});

// ---- socket / server factories -------------------------------------------------

export function createMockSocket(overrides: Record<string, any> = {}): Socket {
  return {
    id: 'socket-1',
    handshake: { auth: {}, headers: {} },
    data: {},
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Socket;
}

export interface MockServerRig {
  server: Server;
  toMock: jest.Mock;
  roomEmitMock: jest.Mock;
  inMock: jest.Mock;
  fetchSocketsMock: jest.Mock;
}

export function createMockServerRig(): MockServerRig {
  const roomEmitMock = jest.fn();
  const toMock = jest.fn(() => ({ emit: roomEmitMock }));
  const fetchSocketsMock = jest.fn().mockResolvedValue([]);
  const inMock = jest.fn(() => ({ fetchSockets: fetchSocketsMock }));
  return {
    server: { to: toMock, in: inMock } as unknown as Server,
    toMock,
    roomEmitMock,
    inMock,
    fetchSocketsMock,
  };
}

// ---- message fixtures -----------------------------------------------------------

export const ORGANIZER_MESSAGE: ReturnMessageDto = {
  id: uuidFrom('gateway-organizer-message'),
  content: 'hello',
  isAnnouncement: false,
  sender: {
    id: USERS.ORGANIZER_MAIN.id,
    role: Role.ORGANIZER,
    name: 'John',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 2,
};

export const PARTICIPANT_MESSAGE: ReturnMessageDto = {
  id: uuidFrom('gateway-participant-message'),
  content: 'hello',
  isAnnouncement: false,
  sender: {
    id: USERS.PARTICIPANT_MAIN.id,
    role: Role.PARTICIPANT,
    name: 'Jane',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 1,
};

export const ANNOUNCEMENT_MESSAGE: ReturnMessageDto = {
  id: uuidFrom('gateway-announcement-message'),
  content: 'important update',
  isAnnouncement: true,
  sender: {
    id: USERS.ORGANIZER_MAIN.id,
    role: Role.ORGANIZER,
    name: 'John',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 3,
};

// ---- central wiring ---------------------------------------------------------

export function applyCentralMockImplementations(
  discussionServiceMock: DeepMockProxy<DiscussionService>,
): void {
  discussionServiceMock.getRoomMemberIds.mockResolvedValue({
    organizerProfileId: USERS.ORGANIZER_MAIN.id,
    participantProfileIds: [USERS.PARTICIPANT_MAIN.id],
  });
}

export { uuidFrom };
