import { createHash } from 'crypto';
import { DeepMockProxy } from 'jest-mock-extended';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReturnMessageDto } from '../dto/return-message.dto';

/**
 * Central mock "database" for DiscussionCrudService unit tests.
 *
 * Unlike DiscussionService (which mocks two collaborator services),
 * DiscussionCrudService talks to Prisma directly, so the fixtures here are
 * raw row shapes and the wiring targets `PrismaService` methods. Structural
 * lookups (room existence, read status, serial-number claim, event/
 * registration queries) are fully simulated from one seeded room/event
 * "table" via applyCentralMockImplementations, so most tests just call the
 * service against a fixture id and assert — no per-test mockResolvedValue
 * plumbing. Row-shape-sensitive methods (createMessage, the paginated
 * message queries) still take a per-test `mockResolvedValueOnce` for the
 * exact Prisma response being asserted against, but pull their raw rows
 * from the shared builders/fixtures below instead of ad-hoc literals.
 */

// ---- deterministic UUID v4 ids ---------------------------------------------
function uuidFrom(tag: string): string {
  const hex = createHash('sha256').update(tag).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ---- sender profiles ---------------------------------------------------------
// Covers mapToReturnMessageDto's fallback rules: nickname-over-firstName,
// '' fallback when both are empty, '' fallback for a missing imageUrl.

export const USERS = {
  ORGANIZER_MAIN: {
    id: uuidFrom('crud-organizer-main'),
    name: 'Alex Organizer',
    imageUrl: 'https://img.example.com/organizer-main.png',
  },
  ORGANIZER_OTHER: {
    id: uuidFrom('crud-organizer-other'),
    name: 'Riley Rival',
    imageUrl: 'https://img.example.com/organizer-other.png',
  },
  // name and imageUrl both null on the underlying profile
  ORGANIZER_NAME_EMPTY: {
    id: uuidFrom('crud-organizer-empty'),
    name: null as string | null,
    imageUrl: null as string | null,
  },
  PARTICIPANT_MAIN: {
    id: uuidFrom('crud-participant-main'),
    firstName: 'Jane',
    nickname: 'JJ',
    imageUrl: 'https://img.example.com/participant-main.png',
  },
  // nickname empty → falls back to firstName
  PARTICIPANT_NICKNAME_EMPTY: {
    id: uuidFrom('crud-participant-nickname-empty'),
    firstName: 'Sam',
    nickname: '',
    imageUrl: 'https://img.example.com/participant-2.png',
  },
  // nickname and firstName both empty, imageUrl null
  PARTICIPANT_NAME_EMPTY: {
    id: uuidFrom('crud-participant-name-empty'),
    firstName: '',
    nickname: '',
    imageUrl: null as string | null,
  },
};

function organizerInclude(user: {
  id: string;
  name: string | null;
  imageUrl: string | null;
}) {
  return { id: user.id, name: user.name, imageUrl: user.imageUrl };
}

function participantInclude(user: {
  id: string;
  firstName: string;
  nickname: string;
  imageUrl: string | null;
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    nickname: user.nickname,
    imageUrl: user.imageUrl,
  };
}

// ---- raw message row builders -------------------------------------------------

export function buildRawParticipantMessage(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: uuidFrom(`raw-message-${Math.random()}`),
    roomId: uuidFrom('unassigned-room'),
    content: 'hello world',
    isAnnouncement: false,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    serialNumber: 1,
    senderParticipantId: USERS.PARTICIPANT_MAIN.id,
    senderOrganizerId: null,
    senderParticipant: participantInclude(USERS.PARTICIPANT_MAIN),
    senderOrganizer: null,
    ...overrides,
  };
}

export function buildRawOrganizerMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: uuidFrom(`raw-message-${Math.random()}`),
    roomId: uuidFrom('unassigned-room'),
    content: 'hello world',
    isAnnouncement: false,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    serialNumber: 1,
    senderParticipantId: null,
    senderOrganizerId: USERS.ORGANIZER_MAIN.id,
    senderParticipant: null,
    senderOrganizer: organizerInclude(USERS.ORGANIZER_MAIN),
    ...overrides,
  };
}

export function mapRawToExpected(raw: Record<string, any>): ReturnMessageDto {
  return {
    id: raw.id,
    content: raw.content,
    isAnnouncement: raw.isAnnouncement,
    sender: raw.senderOrganizerId
      ? {
          id: raw.senderOrganizer.id,
          role: Role.ORGANIZER,
          name: raw.senderOrganizer.name ?? '',
          imageUrl: raw.senderOrganizer.imageUrl ?? '',
        }
      : {
          id: raw.senderParticipant.id,
          role: Role.PARTICIPANT,
          name: raw.senderParticipant.nickname || raw.senderParticipant.firstName || '',
          imageUrl: raw.senderParticipant.imageUrl ?? '',
        },
    createdAt: raw.createdAt,
    serialNumber: raw.serialNumber,
  };
}

// ---- room fixtures -------------------------------------------------------------

interface RoomFixture {
  id: string;
  eventId: string;
  organizerId: string;
  confirmedParticipantIds: string[];
  lastSerialNumber: number;
  // ascending chronological order, mirrors real query results before any
  // direction-specific ordering is applied
  messages: Record<string, any>[];
  readStatus: {
    organizer: Record<string, any> | null;
    participant: Record<string, any> | null;
  };
}

const ROOM_MAIN_ID = uuidFrom('crud-room-main');
const EVENT_MAIN_ID = uuidFrom('crud-event-main');

// 9 regular messages (alternating organizer/participant sender) followed by
// 3 announcements (organizer sender) — serialNumber 1..12, one minute apart.
function buildRoomMainMessages(): Record<string, any>[] {
  const messages: Record<string, any>[] = [];
  for (let i = 0; i < 9; i++) {
    const isOrganizer = i % 2 === 0;
    const builder = isOrganizer ? buildRawOrganizerMessage : buildRawParticipantMessage;
    messages.push(
      builder({
        id: uuidFrom(`crud-room-main-message-${i}`),
        roomId: ROOM_MAIN_ID,
        content: `message ${i}`,
        createdAt: new Date(Date.UTC(2026, 7, 1, 0, i)),
        serialNumber: i + 1,
      }),
    );
  }
  for (let i = 9; i < 12; i++) {
    messages.push(
      buildRawOrganizerMessage({
        id: uuidFrom(`crud-room-main-message-${i}`),
        roomId: ROOM_MAIN_ID,
        content: `announcement ${i}`,
        isAnnouncement: true,
        createdAt: new Date(Date.UTC(2026, 7, 1, 0, i)),
        serialNumber: i + 1,
      }),
    );
  }
  return messages;
}

const ROOM_MAIN_MESSAGES = buildRoomMainMessages();

/**
 * Generates `count` sequential, ascending-chronological regular messages
 * (alternating organizer/participant sender) for an arbitrary roomId — for
 * getPaginatedMessagesByCursor/getLatestAnnouncements tests that need a
 * specific total message count rather than ROOM_MAIN's fixed 12.
 */
export function buildSequentialMessages(
  count: number,
  roomId: string,
): Record<string, any>[] {
  return Array.from({ length: count }, (_, i) => {
    const isOrganizer = i % 2 === 0;
    const builder = isOrganizer ? buildRawOrganizerMessage : buildRawParticipantMessage;
    return builder({
      id: uuidFrom(`seq-message-${roomId}-${i}`),
      roomId,
      content: `message ${i}`,
      createdAt: new Date(Date.UTC(2026, 7, 1, 0, i)),
      serialNumber: i + 1,
    });
  });
}

const ROOM_MAIN: RoomFixture = {
  id: ROOM_MAIN_ID,
  eventId: EVENT_MAIN_ID,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id, USERS.PARTICIPANT_NICKNAME_EMPTY.id],
  lastSerialNumber: 12,
  messages: ROOM_MAIN_MESSAGES,
  readStatus: {
    organizer: {
      roomId: ROOM_MAIN_ID,
      readerOrganizerId: USERS.ORGANIZER_MAIN.id,
      readerParticipantId: null,
      lastReadMessageId: ROOM_MAIN_MESSAGES[5].id, // serialNumber 6
      lastReadSerialNumber: 6,
    },
    participant: {
      roomId: ROOM_MAIN_ID,
      readerOrganizerId: null,
      readerParticipantId: USERS.PARTICIPANT_MAIN.id,
      lastReadMessageId: ROOM_MAIN_MESSAGES[2].id, // serialNumber 3
      lastReadSerialNumber: 3,
    },
  },
};

const ROOM_EMPTY_ID = uuidFrom('crud-room-empty');
const EVENT_EMPTY_ID = uuidFrom('crud-event-empty');

const ROOM_EMPTY: RoomFixture = {
  id: ROOM_EMPTY_ID,
  eventId: EVENT_EMPTY_ID,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [],
  lastSerialNumber: 0,
  messages: [],
  readStatus: { organizer: null, participant: null },
};

export const ROOMS = { ROOM_MAIN, ROOM_EMPTY };

export const NOT_FOUND_ROOM_ID = uuidFrom('crud-room-not-found');
export const NOT_FOUND_EVENT_ID = uuidFrom('crud-event-not-found');
export const NOT_FOUND_MESSAGE_ID = uuidFrom('crud-message-not-found');

// message ids used as upsertLastReadMessage arguments — the id itself is
// arbitrary (upsertLastReadMessage doesn't look it up), just needs a fixed,
// named value rather than each test minting its own.
export const READ_STATUS_NEW_MESSAGE_ID = uuidFrom('read-status-new-message');
export const READ_STATUS_FIRST_READ_MESSAGE_ID = uuidFrom('read-status-first-read-message');

// ---- event / registration fixtures (getParticipantEventsWithRoom, getOrganizerEventsWithRoom) --

const EVENT_ARCHIVED_ID = uuidFrom('crud-event-archived');
const EVENT_NO_ROOM_ID = uuidFrom('crud-event-no-room');

export const EVENTS = {
  MAIN: {
    id: EVENT_MAIN_ID,
    organizerId: USERS.ORGANIZER_MAIN.id,
    status: 'PUBLISHED' as const,
    discussionRoom: { id: ROOM_MAIN_ID },
  },
  ARCHIVED: {
    id: EVENT_ARCHIVED_ID,
    organizerId: USERS.ORGANIZER_MAIN.id,
    status: 'CONCLUDED' as const,
    discussionRoom: { id: uuidFrom('crud-room-archived') },
  },
  NO_ROOM: {
    id: EVENT_NO_ROOM_ID,
    organizerId: USERS.ORGANIZER_MAIN.id,
    status: 'PUBLISHED' as const,
    discussionRoom: null,
  },
};

export const EVENT_REGISTRATIONS = [
  { participantId: USERS.PARTICIPANT_MAIN.id, status: 'CONFIRMED', event: EVENTS.MAIN },
  { participantId: USERS.PARTICIPANT_MAIN.id, status: 'CONFIRMED', event: EVENTS.ARCHIVED },
  // cancelled registration for the same participant — must never be returned
  { participantId: USERS.PARTICIPANT_MAIN.id, status: 'CANCELLED', event: EVENTS.NO_ROOM },
];

// ---- createMessage fixtures --------------------------------------------------
// The exact raw row prisma.message.create resolves is inherently per-scenario
// (that's what's under test), so these are pre-built here rather than reused
// from ROOM_MAIN — but they're still fixed named fixtures the spec only
// references, not values it constructs itself.
// serialNumber 13 = ROOM_MAIN.lastSerialNumber (12) + 1, the value the
// central $queryRaw mock claims for the first message created in a test.

const CLAIMED_SERIAL_NUMBER = ROOM_MAIN.lastSerialNumber + 1;

export const CREATE_MESSAGE_ROWS = {
  PARTICIPANT_REGULAR: buildRawParticipantMessage({
    id: uuidFrom('create-message-participant-regular'),
    roomId: ROOM_MAIN_ID,
    content: 'hello world',
    serialNumber: CLAIMED_SERIAL_NUMBER,
  }),
  ORGANIZER_ANNOUNCEMENT: buildRawOrganizerMessage({
    id: uuidFrom('create-message-organizer-announcement'),
    roomId: ROOM_MAIN_ID,
    content: 'important update',
    isAnnouncement: true,
    serialNumber: CLAIMED_SERIAL_NUMBER,
  }),
  PARTICIPANT_NICKNAME_EMPTY: buildRawParticipantMessage({
    id: uuidFrom('create-message-participant-nickname-empty'),
    roomId: ROOM_MAIN_ID,
    content: 'hi',
    senderParticipantId: USERS.PARTICIPANT_NICKNAME_EMPTY.id,
    senderParticipant: participantInclude(USERS.PARTICIPANT_NICKNAME_EMPTY),
    serialNumber: CLAIMED_SERIAL_NUMBER,
  }),
  PARTICIPANT_NAME_EMPTY: buildRawParticipantMessage({
    id: uuidFrom('create-message-participant-name-empty'),
    roomId: ROOM_MAIN_ID,
    content: 'hi',
    senderParticipantId: USERS.PARTICIPANT_NAME_EMPTY.id,
    senderParticipant: participantInclude(USERS.PARTICIPANT_NAME_EMPTY),
    serialNumber: CLAIMED_SERIAL_NUMBER,
  }),
  ORGANIZER_NAME_EMPTY: buildRawOrganizerMessage({
    id: uuidFrom('create-message-organizer-name-empty'),
    roomId: ROOM_MAIN_ID,
    content: 'hi',
    senderOrganizerId: USERS.ORGANIZER_NAME_EMPTY.id,
    senderOrganizer: organizerInclude(USERS.ORGANIZER_NAME_EMPTY),
    serialNumber: CLAIMED_SERIAL_NUMBER,
  }),
};

// ---- getPaginatedMessagesByCursor fixtures -------------------------------------
// Named rooms of different sizes so every direction/cursor/more-pages
// combination reads from a fixed, pre-built message list instead of each
// test generating its own.

const PAGINATION_ROOM_LARGE_ID = uuidFrom('pagination-room-large'); // 26 messages
const PAGINATION_ROOM_MEDIUM_ID = uuidFrom('pagination-room-medium'); // 11 messages
const PAGINATION_ROOM_SMALL_ID = uuidFrom('pagination-room-small'); // 5 messages
const PAGINATION_ROOM_TINY_ID = uuidFrom('pagination-room-tiny'); // 3 messages

export const PAGINATION_ROOMS = {
  LARGE: { id: PAGINATION_ROOM_LARGE_ID, messages: buildSequentialMessages(26, PAGINATION_ROOM_LARGE_ID) },
  MEDIUM: { id: PAGINATION_ROOM_MEDIUM_ID, messages: buildSequentialMessages(11, PAGINATION_ROOM_MEDIUM_ID) },
  SMALL: { id: PAGINATION_ROOM_SMALL_ID, messages: buildSequentialMessages(5, PAGINATION_ROOM_SMALL_ID) },
  TINY: { id: PAGINATION_ROOM_TINY_ID, messages: buildSequentialMessages(3, PAGINATION_ROOM_TINY_ID) },
};

export const PAGINATION_CURSOR_ID = uuidFrom('pagination-cursor');
export const PAGINATION_EMPTY_PAGE_CURSOR_ID = uuidFrom('pagination-empty-page-cursor');

// ---- getLatestAnnouncements fixtures --------------------------------------------

const ANNOUNCEMENTS_ROOM_ID = uuidFrom('announcements-room');

export const ANNOUNCEMENTS_ROOM = {
  id: ANNOUNCEMENTS_ROOM_ID,
  // newest-first, matching the raw prisma.message.findMany order (desc)
  // before the service reverses it to chronological order
  messages: [
    buildRawOrganizerMessage({
      id: uuidFrom('announcement-a'),
      roomId: ANNOUNCEMENTS_ROOM_ID,
      isAnnouncement: true,
      createdAt: new Date('2026-08-01T00:02:00Z'),
    }),
    buildRawOrganizerMessage({
      id: uuidFrom('announcement-b'),
      roomId: ANNOUNCEMENTS_ROOM_ID,
      isAnnouncement: true,
      createdAt: new Date('2026-08-01T00:01:00Z'),
    }),
    buildRawOrganizerMessage({
      id: uuidFrom('announcement-c'),
      roomId: ANNOUNCEMENTS_ROOM_ID,
      isAnnouncement: true,
      createdAt: new Date('2026-08-01T00:00:00Z'),
    }),
  ],
};

// ---- central wiring ---------------------------------------------------------

/**
 * Wires PrismaService mock method implementations from the fixtures above.
 * Call once per test in beforeEach, after mockReset. Structural fixtures
 * (rooms, read statuses, serial numbers) are deep-cloned fresh on every call
 * so mutations from one test (upsert, serial-number claim) never leak into
 * the next.
 */
export function applyCentralMockImplementations(
  prismaMock: DeepMockProxy<PrismaService>,
): void {
  const rooms = new Map<string, RoomFixture>(
    [ROOM_MAIN, ROOM_EMPTY].map((r) => [r.id, structuredClone(r)]),
  );

  const findRoom = (roomId: string) => rooms.get(roomId);
  const findRoomByEventId = (eventId: string) =>
    [...rooms.values()].find((r) => r.eventId === eventId);
  const findMessageById = (messageId: string) => {
    for (const room of rooms.values()) {
      const found = room.messages.find((m) => m.id === messageId);
      if (found) return found;
    }
    return undefined;
  };

  (prismaMock as any).$transaction.mockImplementation((fn: any) => fn(prismaMock));

  (prismaMock as any).$queryRaw.mockImplementation(async (_strings: any, roomId: string) => {
    const room = findRoom(roomId);
    if (!room) return [];
    room.lastSerialNumber += 1;
    return [{ lastSerialNumber: room.lastSerialNumber }];
  });

  prismaMock.message.create.mockResolvedValue(buildRawParticipantMessage() as any);

  (prismaMock.message.findFirst as any).mockImplementation(async (args: any) => {
    const room = findRoom(args.where.roomId);
    if (!room || room.messages.length === 0) return null;
    return room.messages[room.messages.length - 1] as any;
  });

  (prismaMock.message.findUnique as any).mockImplementation(async (args: any) => {
    const message = findMessageById(args.where.id);
    if (!message) return null;
    if (args.select?.serialNumber) return { serialNumber: message.serialNumber } as any;
    if (args.select?.createdAt) return { createdAt: message.createdAt } as any;
    return message as any;
  });

  (prismaMock.message.count as any).mockImplementation(async (args: any) => {
    const room = findRoom(args.where.roomId);
    if (!room) return 0;
    const gt: Date = args.where.createdAt.gt;
    return room.messages.filter((m) => m.createdAt.getTime() > gt.getTime()).length;
  });

  (prismaMock.discussionRoom.findUnique as any).mockImplementation(async (args: any) => {
    const room = args.where.id ? findRoom(args.where.id) : findRoomByEventId(args.where.eventId);
    if (!room) return null;

    if (args.select?.lastSerialNumber) {
      return { lastSerialNumber: room.lastSerialNumber } as any;
    }
    if (args.select?.id) {
      return { id: room.id } as any;
    }
    if (args.select?.event) {
      return {
        event: {
          organizerId: room.organizerId,
          eventRegistrations: room.confirmedParticipantIds.map((participantId) => ({
            participantId,
          })),
        },
      } as any;
    }
    return room as any;
  });

  (prismaMock.roomReadStatus.findUnique as any).mockImplementation(async (args: any) => {
    const key = args.where.roomId_readerOrganizerId ?? args.where.roomId_readerParticipantId;
    const room = findRoom(key.roomId);
    if (!room) return null;
    const status = args.where.roomId_readerOrganizerId
      ? room.readStatus.organizer
      : room.readStatus.participant;
    return (status as any) ?? null;
  });

  (prismaMock.roomReadStatus.upsert as any).mockImplementation(async (args: any) => {
    const isOrganizer = !!args.where.roomId_readerOrganizerId;
    const key = isOrganizer
      ? args.where.roomId_readerOrganizerId
      : args.where.roomId_readerParticipantId;
    const room = findRoom(key.roomId);
    if (!room) throw new Error('fixture room not found');

    const branch = isOrganizer ? 'organizer' : 'participant';
    const existing = room.readStatus[branch];
    const result = existing ? { ...existing, ...args.update } : { ...args.create };
    room.readStatus[branch] = result;
    return result as any;
  });

  (prismaMock.eventRegistration.findMany as any).mockImplementation(async (args: any) => {
    const { participantId, event: eventFilter } = args.where;
    let regs = EVENT_REGISTRATIONS.filter(
      (r) => r.participantId === participantId && r.status === 'CONFIRMED',
    );
    if (eventFilter?.status?.in) {
      regs = regs.filter((r) => eventFilter.status.in.includes(r.event.status));
    }
    return regs as any;
  });

  (prismaMock.event.findMany as any).mockImplementation(async (args: any) => {
    const { organizerId, status } = args.where;
    let events = Object.values(EVENTS).filter((e) => e.organizerId === organizerId);
    if (status?.in) {
      events = events.filter((e) => status.in.includes(e.status));
    }
    return events as any;
  });
}

export { uuidFrom };
