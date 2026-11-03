import { DeepMockProxy } from 'jest-mock-extended';
import { Event, EventStatus, FieldType, FormType } from '@prisma/client';
import { EventValidationService } from '../event/services/event-validation.service';
import { AnalyticsCrudService } from './services/analytics-crud.service';
import { AnalyticsBucket } from './dto/return-analytics.dto';

/**
 * Central mock "database" for AnalyticsService unit tests.
 *
 * AnalyticsCrudService and EventValidationService are mocked collaborators.
 * applyCentralMockImplementations wires them to a quiet default event (no
 * activity, one registration form, one feedback form) so most tests only
 * override the single thing they are about. The clock is pinned by the spec
 * to NOW below.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const EVENT_ID = '11111111-1111-4111-8111-111111111111';
export const ORGANIZER_ID = '22222222-2222-4222-8222-222222222222';

// fixed "now" the spec pins with fake timers
export const NOW = new Date('2026-05-22T09:30:00.000Z');

// ---- event fixtures -----------------------------------------------------------

function buildEvent(tag: string, overrides: Partial<Event>): Event {
  return {
    id: EVENT_ID,
    organizerId: ORGANIZER_ID,
    universityId: '33333333-3333-4333-8333-333333333333',
    title: { en: `Event ${tag}`, th: `งาน ${tag}` },
    description: null,
    category: [],
    bannerUrl: null,
    location: null,
    mapLink: null,
    isOnline: false,
    startAt: null,
    endAt: null,
    seatLimit: 10,
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

export const EVENTS = {
  // finished two days before NOW: timeline end = endAt
  ENDED: buildEvent('ended', {
    startAt: new Date('2026-05-20T09:00:00.000Z'),
    endAt: new Date('2026-05-20T12:00:00.000Z'),
    status: EventStatus.CONCLUDED,
  }),
  // running at NOW: timeline end = NOW
  ONGOING: buildEvent('ongoing', {
    startAt: new Date('2026-05-22T08:00:00.000Z'),
    endAt: new Date('2026-05-22T18:00:00.000Z'),
    status: EventStatus.ONGOING,
  }),
  // no endAt: fallback end = startAt + 24h = 2026-05-21T09:00Z (before NOW)
  NO_END: buildEvent('no-end', {
    startAt: new Date('2026-05-20T09:00:00.000Z'),
    endAt: null,
  }),
  // no dates at all: timeline end = NOW
  DRAFT: buildEvent('draft', { status: EventStatus.DRAFT }),
};

export const ENDED_TIMELINE_END = new Date('2026-05-20T12:00:00.000Z');

// ---- form answer fixtures -----------------------------------------------------

const emptyValues = {
  valueText: null,
  valueNumber: null,
  valueDate: null,
  valueArray: [] as string[],
};

export const REGISTRATION_FORM = {
  fields: [
    {
      id: 'reg-meal',
      label: 'Meal',
      type: FieldType.CHOICE,
      options: ['A', 'B'],
    },
  ],
  rows: [
    { ...emptyValues, formFieldId: 'reg-meal', valueArray: ['A'] },
    { ...emptyValues, formFieldId: 'reg-meal', valueArray: ['A'] },
    { ...emptyValues, formFieldId: 'reg-meal', valueArray: ['B'] },
  ],
  responseCount: 3,
};

export const EXPECTED_REGISTRATION_ANSWERS = [
  {
    fieldId: 'reg-meal',
    label: 'Meal',
    type: FieldType.CHOICE,
    answered: 3,
    options: [
      { value: 'A', count: 2 },
      { value: 'B', count: 1 },
    ],
  },
];

const decimal = (value: number) => ({ toNumber: () => value });

export const FEEDBACK_FORM = {
  fields: [
    { id: 'fb-rating', label: 'Rating', type: FieldType.RATING, options: [] },
  ],
  rows: [
    { ...emptyValues, formFieldId: 'fb-rating', valueNumber: decimal(5) },
    { ...emptyValues, formFieldId: 'fb-rating', valueNumber: decimal(4) },
    { ...emptyValues, formFieldId: 'fb-rating', valueNumber: decimal(4) },
  ],
  responseCount: 4, // one responder left the rating blank
};

export const EXPECTED_FEEDBACK_FIELDS = [
  {
    fieldId: 'fb-rating',
    label: 'Rating',
    type: FieldType.RATING,
    answered: 3,
    average: 4.33,
    min: 4,
    max: 5,
    distribution: [
      { value: 4, count: 2 },
      { value: 5, count: 1 },
    ],
  },
];

// feedback form with no answers at all
export const EMPTY_FEEDBACK_FORM = {
  fields: FEEDBACK_FORM.fields,
  rows: [],
  responseCount: 0,
};

// ---- default overview ---------------------------------------------------------

export const OVERVIEW_COUNTS = { registered: 7, cancelled: 2, checkedIn: 5 };
export const METHOD_COUNTS = { QR_SCAN: 3, MANUAL: 2 };

// ---- expected-result builders ---------------------------------------------------

// `count` evenly spaced dates starting at `first`
export function series(first: string, count: number, stepMs: number): Date[] {
  return Array.from(
    { length: count },
    (_, i) => new Date(new Date(first).getTime() + i * stepMs),
  );
}

// expected timeline: one point per start, cumulative = base + running total
export function buildTimeline(
  bucket: AnalyticsBucket,
  starts: Date[],
  counts: number[],
  base: number,
  timelineEnd: Date,
) {
  let cumulative = base;
  return {
    bucket,
    timelineStart: starts[0],
    timelineEnd,
    points: starts.map((bucketStart, i) => {
      cumulative += counts[i];
      return { bucketStart, count: counts[i], cumulative };
    }),
  };
}

export function emptyTimelineAt(timelineEnd: Date) {
  return {
    bucket: '1h' as const,
    timelineStart: timelineEnd,
    timelineEnd,
    points: [],
  };
}

// ---- wiring ---------------------------------------------------------------------

export function applyCentralMockImplementations(
  eventValidationService: DeepMockProxy<EventValidationService>,
  crud: DeepMockProxy<AnalyticsCrudService>,
  event: Event = EVENTS.ENDED,
): void {
  eventValidationService.validateEventOwnership.mockResolvedValue({
    organizerProfileId: ORGANIZER_ID,
  });
  eventValidationService.validateEventExists.mockResolvedValue(event);

  crud.getOverviewCounts.mockResolvedValue({ ...OVERVIEW_COUNTS });
  crud.getCheckInMethodCounts.mockResolvedValue({ ...METHOD_COUNTS });
  crud.getRegistrationTimestamps.mockResolvedValue([]);
  crud.getCheckInTimestamps.mockResolvedValue([]);
  crud.countRegistrationsBefore.mockResolvedValue(0);
  crud.countCheckInsBefore.mockResolvedValue(0);
  crud.findEarliestRegistration.mockResolvedValue(null);
  crud.findEarliestCheckIn.mockResolvedValue(null);
  crud.getFormAnswerData.mockImplementation((_eventId, type) =>
    Promise.resolve(
      type === FormType.REGISTRATION ? REGISTRATION_FORM : FEEDBACK_FORM,
    ),
  );
}
