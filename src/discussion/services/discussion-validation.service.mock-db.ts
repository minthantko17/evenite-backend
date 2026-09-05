import { createHash } from 'crypto';
import { DeepMockProxy } from 'jest-mock-extended';
import { Event, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationValidationService } from '../../registration/services/registration-validation.service';
import { RegistrationNotFoundException } from '../../registration/exceptions/registration-not-found.exception';

/**
 * Central mock "database" for DiscussionValidationService unit tests.
 *
 * PrismaService (for validateRoomExists) and RegistrationValidationService
 * (for validateRoomAccess's participant branch) are mocked collaborators.
 * applyCentralMockImplementations wires both from the fixtures below, so
 * most tests just call the service against a fixture id/event and assert —
 * no per-test mock plumbing. validateRoomWritable's CONCLUDED branch is
 * time-dependent (Date.now()); tests control it with jest.spyOn(Date,
 * 'now') against the fixed endAt/startAt values fixed here.
 */

function uuidFrom(tag: string): string {
  const hex = createHash('sha256').update(tag).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export const HOUR_MS = 60 * 60 * 1000;

// ---- users ------------------------------------------------------------------

export const USERS = {
  ORGANIZER_MAIN: { id: uuidFrom('validation-organizer-main') },
  ORGANIZER_OTHER: { id: uuidFrom('validation-organizer-other') },
  PARTICIPANT_MAIN: { id: uuidFrom('validation-participant-main') }, // confirmed on EVENT_ROOM
  PARTICIPANT_OTHER: { id: uuidFrom('validation-participant-other') }, // never confirmed
};

// ---- event fixtures -----------------------------------------------------------

function buildEvent(tag: string, overrides: Partial<Event>): Event {
  return {
    id: uuidFrom(`validation-event-${tag}`),
    organizerId: USERS.ORGANIZER_MAIN.id,
    universityId: uuidFrom('validation-university'),
    title: { en: 'Orientation', th: 'ปฐมนิเทศ' },
    description: null,
    category: [],
    bannerUrl: null,
    location: null,
    mapLink: null,
    isOnline: false,
    startAt: null,
    endAt: null,
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

// the room-bearing event used by validateRoomAccess tests; PARTICIPANT_MAIN
// is confirmed on it (see applyCentralMockImplementations), PARTICIPANT_OTHER
// is not
export const EVENT_ROOM = buildEvent('room', {
  organizerId: USERS.ORGANIZER_MAIN.id,
  status: EventStatus.PUBLISHED,
});

// validateRoomWritable fixtures — status-driven, plus fixed reference
// timestamps for the CONCLUDED grace-period math
export const EVENT_PUBLISHED = buildEvent('published', { status: EventStatus.PUBLISHED });
export const EVENT_ONGOING = buildEvent('ongoing', { status: EventStatus.ONGOING });
export const EVENT_DRAFT = buildEvent('draft', { status: EventStatus.DRAFT });
export const EVENT_CANCELLED = buildEvent('cancelled', { status: EventStatus.CANCELLED });

export const CONCLUDED_END_AT = new Date('2026-08-01T00:00:00Z');
export const EVENT_CONCLUDED_WITH_END_AT = buildEvent('concluded-with-end-at', {
  status: EventStatus.CONCLUDED,
  endAt: CONCLUDED_END_AT,
  startAt: null,
});

export const CONCLUDED_START_AT = new Date('2026-08-01T00:00:00Z');
export const EVENT_CONCLUDED_NO_END_AT_WITH_START = buildEvent(
  'concluded-no-end-at-with-start',
  {
    status: EventStatus.CONCLUDED,
    endAt: null,
    startAt: CONCLUDED_START_AT,
  },
);

export const EVENT_CONCLUDED_NO_END_NO_START = buildEvent('concluded-no-end-no-start', {
  status: EventStatus.CONCLUDED,
  endAt: null,
  startAt: null,
});

// ---- room fixture (validateRoomExists) -----------------------------------------

export const ROOM_ID = uuidFrom('validation-room-main');
export const NOT_FOUND_ROOM_ID = uuidFrom('validation-room-not-found');

// ---- central wiring ---------------------------------------------------------

export function applyCentralMockImplementations(
  prismaMock: DeepMockProxy<PrismaService>,
  registrationValidationServiceMock: DeepMockProxy<RegistrationValidationService>,
): void {
  (prismaMock.discussionRoom.findUnique as any).mockImplementation(async (args: any) => {
    if (args.where.id !== ROOM_ID) return null;
    return {
      id: ROOM_ID,
      eventId: EVENT_ROOM.id,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      lastSerialNumber: 0,
      event: EVENT_ROOM,
    } as any;
  });

  registrationValidationServiceMock.validateConfirmedRegistration.mockImplementation(
    async (eventId: string, participantId: string) => {
      if (eventId === EVENT_ROOM.id && participantId === USERS.PARTICIPANT_MAIN.id) {
        return { message: 'Participant is confirmed for this event.' };
      }
      throw new RegistrationNotFoundException();
    },
  );
}

export { uuidFrom };
