import { createHash } from 'crypto';
import { Event, EventStatus, Role } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';
import { DiscussionValidationService } from './services/discussion-validation.service';
import { DiscussionCrudService } from './services/discussion-crud.service';
import { ReturnMessageDto, ReturnMessageSenderDto } from './dto/return-message.dto';
import { ReturnMessagePageDto } from './dto/return-message-page.dto';
import { ReturnRoomReadStatusDto } from './dto/return-room-read-status.dto';
import { EventWithDiscussionRoom } from './types/discussion.types';
import { RoomNotFoundException } from './exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from './exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from './exceptions/room-read-only.exception';
import { MessageContentInvalidException } from './exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from './exceptions/announcement-not-allowed.exception';

/**
 * Central mock "database" for DiscussionService unit tests.
 *
 * Every test in discussion.service.spec.ts reads its fixtures from here and
 * wires collaborator mocks once (via applyCentralMockImplementations) instead
 * of hand-rolling mockResolvedValue/mockRejectedValue chains per test. Add a
 * new room/user/message scenario here rather than inlining ad-hoc mock setup
 * in a test.
 */

// ---- deterministic UUID v4 ids ---------------------------------------------
// Real UUID v4 shape (version nibble = 4, variant nibble in [8,9,a,b]),
// derived deterministically from a readable tag so failures are traceable
// back to the fixture that produced them.
function uuidFrom(tag: string): string {
  const hex = createHash('sha256').update(tag).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const MAX_MESSAGE_LENGTH = 2000;

// ---- users ------------------------------------------------------------------

export const USERS = {
  ORGANIZER_MAIN: {
    id: uuidFrom('organizer-main'),
    name: 'Alex Organizer',
    imageUrl: '',
  },
  ORGANIZER_OTHER: {
    id: uuidFrom('organizer-other'),
    name: 'Riley Rival',
    imageUrl: '',
  },
  PARTICIPANT_MAIN: {
    id: uuidFrom('participant-main'),
    name: 'Jane Doe',
    imageUrl: '',
  },
  PARTICIPANT_OTHER: {
    id: uuidFrom('participant-other'),
    name: 'Sam Stranger',
    imageUrl: '',
  },
};

export function organizerSender(id: string): ReturnMessageSenderDto {
  const user = Object.values(USERS).find((u) => u.id === id);
  return { id, role: Role.ORGANIZER, name: user?.name ?? '', imageUrl: '' };
}

export function participantSender(id: string): ReturnMessageSenderDto {
  const user = Object.values(USERS).find((u) => u.id === id);
  return { id, role: Role.PARTICIPANT, name: user?.name ?? '', imageUrl: '' };
}

/**
 * The id createMessage's central mock implementation assigns to the Nth
 * message created within a single test (the counter is reset fresh by
 * applyCentralMockImplementations every beforeEach). Lets tests predict the
 * exact ReturnMessageDto returned by sendMessage/sendAnnouncement.
 */
export function nthCreatedMessageId(n: number): string {
  return uuidFrom(`created-message-${n}`);
}

// ---- room fixtures ------------------------------------------------------------

interface MockRoomFixture {
  id: string;
  event: Event;
  organizerId: string;
  confirmedParticipantIds: string[];
  isWritable: boolean;
  lastSerialNumber: number;
  messages: ReturnMessageDto[]; // regular messages, chronological order
  announcements: ReturnMessageDto[]; // chronological order
  lastMessage: ReturnMessageDto | null;
  messagePage: ReturnMessagePageDto; // canned page result for pagination calls
  readStatus: {
    organizer: ReturnRoomReadStatusDto | null;
    participant: ReturnRoomReadStatusDto | null;
  };
}

function buildEvent(tag: string, overrides: Partial<Event>): Event {
  return {
    id: uuidFrom(`event-${tag}`),
    organizerId: USERS.ORGANIZER_MAIN.id,
    universityId: uuidFrom('university-main'),
    title: { en: 'Orientation', th: 'ปฐมนิเทศ' },
    description: null,
    category: [],
    bannerUrl: 'https://example.com/banner.png',
    location: null,
    mapLink: null,
    isOnline: false,
    startAt: new Date('2026-08-01T08:00:00Z'),
    endAt: new Date('2026-08-01T10:00:00Z'),
    seatLimit: null,
    seatsTaken: 0,
    status: EventStatus.PUBLISHED,
    hasCatering: false,
    isCateringFree: false,
    cateringDescription: null,
    agenda: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    contactLineId: null,
    externalUrl: null,
    remarks: null,
    ...overrides,
  } as Event;
}

// --- Room 1: ROOM_ACTIVE — PUBLISHED, writable, has message + read history ---
// Organizer has read up through msg2 (unread: the announcement).
// Participant has never read (no read-status record at all).

const EVENT_ACTIVE = buildEvent('active', { status: EventStatus.PUBLISHED });
const ROOM_ACTIVE_ID = uuidFrom('room-active');

const ACTIVE_MSG_1: ReturnMessageDto = {
  id: uuidFrom('room-active-message-1'),
  content: 'Hi everyone!',
  isAnnouncement: false,
  sender: participantSender(USERS.PARTICIPANT_MAIN.id),
  createdAt: new Date('2026-08-01T10:00:00Z'),
  serialNumber: 1,
};
const ACTIVE_MSG_2: ReturnMessageDto = {
  id: uuidFrom('room-active-message-2'),
  content: 'Welcome, glad you could join!',
  isAnnouncement: false,
  sender: organizerSender(USERS.ORGANIZER_MAIN.id),
  createdAt: new Date('2026-08-01T10:05:00Z'),
  serialNumber: 2,
};
const ACTIVE_ANNOUNCEMENT_1: ReturnMessageDto = {
  id: uuidFrom('room-active-announcement-1'),
  content: 'Event starts at 10am sharp.',
  isAnnouncement: true,
  sender: organizerSender(USERS.ORGANIZER_MAIN.id),
  createdAt: new Date('2026-08-01T10:10:00Z'),
  serialNumber: 3,
};

const ROOM_ACTIVE: MockRoomFixture = {
  id: ROOM_ACTIVE_ID,
  event: EVENT_ACTIVE,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id],
  isWritable: true,
  lastSerialNumber: 3,
  messages: [ACTIVE_MSG_1, ACTIVE_MSG_2],
  announcements: [ACTIVE_ANNOUNCEMENT_1],
  lastMessage: ACTIVE_ANNOUNCEMENT_1,
  messagePage: {
    messages: [ACTIVE_MSG_1, ACTIVE_MSG_2, ACTIVE_ANNOUNCEMENT_1],
    hasMoreOlder: false,
    hasMoreNewer: false,
    oldestCursor: ACTIVE_MSG_1.id,
    newestCursor: ACTIVE_ANNOUNCEMENT_1.id,
  },
  readStatus: {
    organizer: {
      roomId: ROOM_ACTIVE_ID,
      lastReadMessageId: ACTIVE_MSG_2.id,
      lastReadSerialNumber: 2,
    },
    participant: null,
  },
};

// --- Room 2: ROOM_NEVER_READ_EMPTY — PUBLISHED, writable, no messages -------
// Organizer: no read-status record at all (never read).
// Participant: read-status record exists but lastReadMessageId is null
// (room was empty the last time they marked it read).

const EVENT_EMPTY = buildEvent('empty', { status: EventStatus.PUBLISHED });
const ROOM_NEVER_READ_EMPTY_ID = uuidFrom('room-never-read-empty');

const ROOM_NEVER_READ_EMPTY: MockRoomFixture = {
  id: ROOM_NEVER_READ_EMPTY_ID,
  event: EVENT_EMPTY,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id],
  isWritable: true,
  lastSerialNumber: 0,
  messages: [],
  announcements: [],
  lastMessage: null,
  messagePage: {
    messages: [],
    hasMoreOlder: false,
    hasMoreNewer: false,
    oldestCursor: null,
    newestCursor: null,
  },
  readStatus: {
    organizer: null,
    participant: {
      roomId: ROOM_NEVER_READ_EMPTY_ID,
      lastReadMessageId: null,
      lastReadSerialNumber: 0,
    },
  },
};

// --- Room 3: ROOM_CANCELLED — CANCELLED event → always read-only -----------

const EVENT_CANCELLED = buildEvent('cancelled', { status: EventStatus.CANCELLED });
const ROOM_CANCELLED_ID = uuidFrom('room-cancelled');

const ROOM_CANCELLED: MockRoomFixture = {
  id: ROOM_CANCELLED_ID,
  event: EVENT_CANCELLED,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id],
  isWritable: false,
  lastSerialNumber: 0,
  messages: [],
  announcements: [],
  lastMessage: null,
  messagePage: {
    messages: [],
    hasMoreOlder: false,
    hasMoreNewer: false,
    oldestCursor: null,
    newestCursor: null,
  },
  readStatus: { organizer: null, participant: null },
};

// --- Room 4: ROOM_CONCLUDED_GRACE — CONCLUDED, within the 72h grace window --
// (endAt is recent) → still writable.

const EVENT_CONCLUDED_GRACE = buildEvent('concluded-grace', {
  status: EventStatus.CONCLUDED,
  startAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  endAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
});
const ROOM_CONCLUDED_GRACE_ID = uuidFrom('room-concluded-grace');

const ROOM_CONCLUDED_GRACE: MockRoomFixture = {
  id: ROOM_CONCLUDED_GRACE_ID,
  event: EVENT_CONCLUDED_GRACE,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id],
  isWritable: true,
  lastSerialNumber: 0,
  messages: [],
  announcements: [],
  lastMessage: null,
  messagePage: {
    messages: [],
    hasMoreOlder: false,
    hasMoreNewer: false,
    oldestCursor: null,
    newestCursor: null,
  },
  readStatus: { organizer: null, participant: null },
};

// --- Room 5: ROOM_CONCLUDED_EXPIRED — CONCLUDED, past the 72h grace window -

const EVENT_CONCLUDED_EXPIRED = buildEvent('concluded-expired', {
  status: EventStatus.CONCLUDED,
  startAt: new Date(Date.now() - 100 * 60 * 60 * 1000),
  endAt: new Date(Date.now() - 98 * 60 * 60 * 1000),
});
const ROOM_CONCLUDED_EXPIRED_ID = uuidFrom('room-concluded-expired');

const ROOM_CONCLUDED_EXPIRED: MockRoomFixture = {
  id: ROOM_CONCLUDED_EXPIRED_ID,
  event: EVENT_CONCLUDED_EXPIRED,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id],
  isWritable: false,
  lastSerialNumber: 0,
  messages: [],
  announcements: [],
  lastMessage: null,
  messagePage: {
    messages: [],
    hasMoreOlder: false,
    hasMoreNewer: false,
    oldestCursor: null,
    newestCursor: null,
  },
  readStatus: { organizer: null, participant: null },
};

// --- Room 6: ROOM_NO_BANNER — PUBLISHED, event.bannerUrl is null -----------
// organizer-only room (no confirmed participant) used for the room-list
// bannerUrl-fallback and empty-membership assertions.

const EVENT_NO_BANNER = buildEvent('no-banner', {
  status: EventStatus.PUBLISHED,
  bannerUrl: null,
});
const ROOM_NO_BANNER_ID = uuidFrom('room-no-banner');

const ROOM_NO_BANNER: MockRoomFixture = {
  id: ROOM_NO_BANNER_ID,
  event: EVENT_NO_BANNER,
  organizerId: USERS.ORGANIZER_MAIN.id,
  confirmedParticipantIds: [],
  isWritable: true,
  lastSerialNumber: 0,
  messages: [],
  announcements: [],
  lastMessage: null,
  messagePage: {
    messages: [],
    hasMoreOlder: false,
    hasMoreNewer: false,
    oldestCursor: null,
    newestCursor: null,
  },
  readStatus: { organizer: null, participant: null },
};

export const ROOMS = {
  ROOM_ACTIVE,
  ROOM_NEVER_READ_EMPTY,
  ROOM_CANCELLED,
  ROOM_CONCLUDED_GRACE,
  ROOM_CONCLUDED_EXPIRED,
  ROOM_NO_BANNER,
};

const ALL_ROOMS: MockRoomFixture[] = Object.values(ROOMS);

// --- Event with no DiscussionRoom — exercises "filter out roomless events" -
// on both getCreatedDiscussionRooms and getJoinedDiscussionRooms without any
// per-test setup: it's just always present in the organizer's/participant's
// event list and must never show up in the mapped result.

const EVENT_NO_ROOM = buildEvent('no-room', { status: EventStatus.PUBLISHED });

const ROOMLESS_EVENTS: Array<{
  event: Event;
  organizerId: string;
  confirmedParticipantIds: string[];
}> = [
  {
    event: EVENT_NO_ROOM,
    organizerId: USERS.ORGANIZER_MAIN.id,
    confirmedParticipantIds: [USERS.PARTICIPANT_MAIN.id],
  },
];

// --- ids that deliberately don't exist in any fixture above -----------------

export const NOT_FOUND_ROOM_ID = uuidFrom('room-not-found');
export const NOT_FOUND_EVENT_ID = uuidFrom('event-not-found');
export const NOT_FOUND_MESSAGE_ID = uuidFrom('message-not-found');

// ---- lookup helpers ---------------------------------------------------------

function findRoomById(roomId: string): MockRoomFixture | undefined {
  return ALL_ROOMS.find((r) => r.id === roomId);
}

function findRoomByEventId(eventId: string): MockRoomFixture | undefined {
  return ALL_ROOMS.find((r) => r.event.id === eventId);
}

function findMessageById(
  messageId: string,
): ReturnMessageDto | undefined {
  for (const room of ALL_ROOMS) {
    const found = [...room.messages, ...room.announcements].find(
      (m) => m.id === messageId,
    );
    if (found) return found;
  }
  return undefined;
}

function toEventWithDiscussionRoom(
  room: MockRoomFixture,
): EventWithDiscussionRoom {
  return {
    ...room.event,
    discussionRoom: { id: room.id } as EventWithDiscussionRoom['discussionRoom'],
  } as EventWithDiscussionRoom;
}

function toRoomlessEventWithDiscussionRoom(event: Event): EventWithDiscussionRoom {
  return { ...event, discussionRoom: null } as unknown as EventWithDiscussionRoom;
}

// ---- central wiring ---------------------------------------------------------

/**
 * Wires validationServiceMock/crudServiceMock implementations from the
 * fixtures above. Call this once per test in beforeEach, after mockReset —
 * individual tests then just call the service with fixture ids/dtos and
 * assert, instead of repeating mock setup.
 */
export function applyCentralMockImplementations(
  validationServiceMock: DeepMockProxy<DiscussionValidationService>,
  crudServiceMock: DeepMockProxy<DiscussionCrudService>,
): void {
  let createdMessageCounter = 0;

  // -- DiscussionValidationService --

  validationServiceMock.validateRoomExists.mockImplementation(
    async (roomId: string) => {
      const room = findRoomById(roomId);
      if (!room) throw new RoomNotFoundException();
      return { roomId: room.id, event: room.event };
    },
  );

  validationServiceMock.validateRoomAccess.mockImplementation(
    async (
      event: Event,
      role: Role,
      participantProfileId: string | null,
      organizerProfileId: string | null,
    ) => {
      const room = findRoomByEventId(event.id);
      if (!room) throw new RoomAccessDeniedException();

      if (role === Role.ORGANIZER && organizerProfileId === room.organizerId) {
        return { message: 'Organizer has access to this room.' };
      }
      if (
        role === Role.PARTICIPANT &&
        !!participantProfileId &&
        room.confirmedParticipantIds.includes(participantProfileId)
      ) {
        return { message: 'Participant has access to this room.' };
      }
      throw new RoomAccessDeniedException();
    },
  );

  validationServiceMock.validateRoomWritable.mockImplementation(
    (event: Event) => {
      const room = findRoomByEventId(event.id);
      if (room && !room.isWritable) {
        throw new RoomReadOnlyException();
      }
      return { message: 'Discussion room is writable.' };
    },
  );

  validationServiceMock.validateMessageContent.mockImplementation(
    (content: string) => {
      const trimmed = content.trim();
      if (trimmed.length === 0) {
        throw new MessageContentInvalidException('Message cannot be empty.');
      }
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        throw new MessageContentInvalidException(
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
        );
      }
      return content;
    },
  );

  validationServiceMock.validateAnnouncementSenderRole.mockImplementation(
    (role: Role) => {
      if (role !== Role.ORGANIZER) {
        throw new AnnouncementNotAllowedException();
      }
      return { message: 'Organizer can send announcements.' };
    },
  );

  // -- DiscussionCrudService --

  crudServiceMock.createMessage.mockImplementation(
    async (
      roomId: string,
      content: string,
      isAnnouncement: boolean,
      senderParticipantId: string | null,
      senderOrganizerId: string | null,
    ) => {
      createdMessageCounter += 1;
      const sender = senderOrganizerId
        ? organizerSender(senderOrganizerId)
        : participantSender(senderParticipantId!);
      const room = findRoomById(roomId);
      return {
        id: uuidFrom(`created-message-${createdMessageCounter}`),
        content,
        isAnnouncement,
        sender,
        createdAt: new Date(),
        serialNumber: (room?.lastSerialNumber ?? 0) + createdMessageCounter,
      };
    },
  );

  crudServiceMock.getPaginatedMessagesByCursor.mockImplementation(
    async (roomId: string) => {
      const room = findRoomById(roomId);
      if (!room) throw new RoomNotFoundException();
      return room.messagePage;
    },
  );

  crudServiceMock.getLatestAnnouncements.mockImplementation(
    async (roomId: string) => {
      const room = findRoomById(roomId);
      if (!room) throw new RoomNotFoundException();
      return room.announcements;
    },
  );

  crudServiceMock.getLatestMessageForRoom.mockImplementation(
    async (roomId: string) => {
      const room = findRoomById(roomId);
      return room?.lastMessage ?? null;
    },
  );

  crudServiceMock.getRoomReadStatus.mockImplementation(
    async (
      roomId: string,
      role: Role,
      _participantProfileId: string | null,
      _organizerProfileId: string | null,
    ) => {
      const room = findRoomById(roomId);
      if (!room) return null;
      const status =
        role === Role.ORGANIZER ? room.readStatus.organizer : room.readStatus.participant;
      return status ? { lastReadMessageId: status.lastReadMessageId } : null;
    },
  );

  crudServiceMock.upsertLastReadMessage.mockImplementation(
    async (
      roomId: string,
      _role: Role,
      _participantProfileId: string | null,
      _organizerProfileId: string | null,
      lastReadMessageId: string | undefined,
      lastReadSerialNumber: number | undefined,
    ) => {
      return {
        roomId,
        lastReadMessageId: lastReadMessageId ?? null,
        lastReadSerialNumber: lastReadSerialNumber ?? 0,
      };
    },
  );

  crudServiceMock.getMessageSerialNumber.mockImplementation(
    async (messageId: string) => {
      return findMessageById(messageId)?.serialNumber ?? null;
    },
  );

  crudServiceMock.getUnreadStatusBySerialNumber.mockImplementation(
    async (
      roomId: string,
      role: Role,
      _participantProfileId: string | null,
      _organizerProfileId: string | null,
    ) => {
      const room = findRoomById(roomId);
      if (!room) throw new RoomNotFoundException();
      const status =
        role === Role.ORGANIZER ? room.readStatus.organizer : room.readStatus.participant;
      const lastReadSerialNumber = status?.lastReadSerialNumber ?? 0;
      return {
        unreadCount: Math.max(0, room.lastSerialNumber - lastReadSerialNumber),
        lastReadSerialNumber,
      };
    },
  );

  crudServiceMock.getOrganizerEventsWithRoom.mockImplementation(
    async (organizerProfileId: string, statusFilter?: EventStatus[]) => {
      const roomEntries = ALL_ROOMS.filter(
        (r) =>
          r.organizerId === organizerProfileId &&
          (!statusFilter || statusFilter.includes(r.event.status)),
      ).map(toEventWithDiscussionRoom);
      const roomlessEntries = ROOMLESS_EVENTS.filter(
        (e) =>
          e.organizerId === organizerProfileId &&
          (!statusFilter || statusFilter.includes(e.event.status)),
      ).map((e) => toRoomlessEventWithDiscussionRoom(e.event));
      return [...roomEntries, ...roomlessEntries];
    },
  );

  crudServiceMock.getParticipantEventsWithRoom.mockImplementation(
    async (participantProfileId: string, statusFilter?: EventStatus[]) => {
      const roomEntries = ALL_ROOMS.filter(
        (r) =>
          r.confirmedParticipantIds.includes(participantProfileId) &&
          (!statusFilter || statusFilter.includes(r.event.status)),
      ).map(toEventWithDiscussionRoom);
      const roomlessEntries = ROOMLESS_EVENTS.filter(
        (e) =>
          e.confirmedParticipantIds.includes(participantProfileId) &&
          (!statusFilter || statusFilter.includes(e.event.status)),
      ).map((e) => toRoomlessEventWithDiscussionRoom(e.event));
      return [...roomEntries, ...roomlessEntries];
    },
  );

  crudServiceMock.getRoomMemberIds.mockImplementation(async (roomId: string) => {
    const room = findRoomById(roomId);
    if (!room) throw new RoomNotFoundException();
    return {
      organizerProfileId: room.organizerId,
      participantProfileIds: room.confirmedParticipantIds,
    };
  });

  crudServiceMock.findRoomByEventId.mockImplementation(async (eventId: string) => {
    const room = findRoomByEventId(eventId);
    return room ? { roomId: room.id } : null;
  });
}

/**
 * Computes the expected ReturnDiscussionRoomListDto for a room fixture, for
 * the given viewing role — mirrors DiscussionService's private mapping logic
 * so tests can assert against it without re-deriving it inline.
 */
export function expectedRoomListDto(
  room: MockRoomFixture,
  role: Role,
): {
  roomId: string;
  event: {
    id: string;
    title: unknown;
    bannerUrl: string;
    status: EventStatus;
  };
  lastMessage: ReturnMessageDto | null;
  unreadCount: number;
  lastReadSerialNumber: number;
  isReadOnly: boolean;
} {
  const status =
    role === Role.ORGANIZER ? room.readStatus.organizer : room.readStatus.participant;
  const lastReadSerialNumber = status?.lastReadSerialNumber ?? 0;
  return {
    roomId: room.id,
    event: {
      id: room.event.id,
      title: room.event.title,
      bannerUrl: room.event.bannerUrl ?? '',
      status: room.event.status,
    },
    lastMessage: room.lastMessage,
    unreadCount: Math.max(0, room.lastSerialNumber - lastReadSerialNumber),
    lastReadSerialNumber,
    isReadOnly: !room.isWritable,
  };
}

export { uuidFrom };
