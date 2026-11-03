/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { ForbiddenException } from '@nestjs/common';
import { FormType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCrudService } from './services/analytics-crud.service';
import { EventValidationService } from '../event/services/event-validation.service';
import { EventNotFoundException } from '../event/exceptions/event-not-found.exception';
import { AnalyticsRange } from './constants/analytics.constants';
import {
  EVENT_ID,
  ORGANIZER_ID,
  NOW,
  HOUR_MS,
  DAY_MS,
  EVENTS,
  ENDED_TIMELINE_END,
  REGISTRATION_FORM,
  EXPECTED_REGISTRATION_ANSWERS,
  FEEDBACK_FORM,
  EMPTY_FEEDBACK_FORM,
  EXPECTED_FEEDBACK_FIELDS,
  OVERVIEW_COUNTS,
  METHOD_COUNTS,
  series,
  buildTimeline,
  emptyTimelineAt,
  applyCentralMockImplementations,
} from './analytics.service.mock-db';

// This spec sources its fixtures from ./analytics.service.mock-db.ts — event
// fixtures (ended / ongoing / no endAt / draft), form-answer fixtures with
// their expected statistics, and expected-timeline builders. The two
// collaborators (AnalyticsCrudService, EventValidationService) are mocked and
// wired to a quiet default event by applyCentralMockImplementations; each
// test overrides only what it is about. The pure helpers (analytics.utils,
// analytics-field-stats.utils) are not mocked: they run for real, and have
// their own specs. The clock is pinned to NOW with fake timers.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, regular cases come first, followed by error
// cases and edge cases that document current behavior.

const crudMock = mockDeep<AnalyticsCrudService>();
const eventValidationMock = mockDeep<EventValidationService>();

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeAll(() => {
    // nextTick stays real so awaited mocks keep resolving
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick'] });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    mockReset(crudMock);
    mockReset(eventValidationMock);
    applyCentralMockImplementations(eventValidationMock, crudMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsCrudService, useValue: crudMock },
        { provide: EventValidationService, useValue: eventValidationMock },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  // ==========================================================================
  // getEventAnalytics — full result
  // ==========================================================================
  describe('getEventAnalytics', () => {
    it('UT-getEventAnalytics-01: ended event, 24h range, activity in both streams and both forms — assembles the full analytics result', async () => {
      const input = {
        eventId: EVENT_ID,
        organizerProfileId: ORGANIZER_ID,
        range: AnalyticsRange.LAST_24_HOURS,
      };
      crudMock.getRegistrationTimestamps.mockResolvedValue([
        new Date('2026-05-20T09:10:00.000Z'),
        new Date('2026-05-20T09:40:00.000Z'),
        new Date('2026-05-20T10:05:00.000Z'),
      ]);
      crudMock.countRegistrationsBefore.mockResolvedValue(4);
      crudMock.getCheckInTimestamps.mockResolvedValue([
        new Date('2026-05-20T10:30:00.000Z'),
      ]);
      // 24 hourly buckets ending with the one that holds 11:59:59.999
      const starts = series('2026-05-19T12:00:00.000Z', 24, HOUR_MS);
      const registrationCounts = Array<number>(24).fill(0);
      registrationCounts[21] = 2; // 09:00 bucket
      registrationCounts[22] = 1; // 10:00 bucket
      const checkInCounts = Array<number>(24).fill(0);
      checkInCounts[22] = 1; // 10:00 bucket
      
      const expected = {
        generatedAt: NOW,
        range: AnalyticsRange.LAST_24_HOURS,
        timeZone: 'Asia/Bangkok',
        overview: {
          seatLimit: 10,
          registered: 7,
          cancelled: 2,
          checkedIn: 5,
          notCheckedIn: 2,
          attendanceRate: 0.7143,
          registerRate: 0.7,
        },
        checkInTimeline: buildTimeline(
          '1h',
          starts,
          checkInCounts,
          0,
          ENDED_TIMELINE_END,
        ),
        registrationTimeline: buildTimeline(
          '1h',
          starts,
          registrationCounts,
          4,
          ENDED_TIMELINE_END,
        ),
        checkInMethods: METHOD_COUNTS,
        registrationAnswers: EXPECTED_REGISTRATION_ANSWERS,
        feedback: {
          responses: 4,
          responseRate: 0.8, // 4 responses / 5 checked in
          fields: EXPECTED_FEEDBACK_FIELDS,
        },
      };

      const actual = await service.getEventAnalytics(
        input.eventId,
        input.organizerProfileId,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(eventValidationMock.validateEventOwnership).toHaveBeenCalledWith(
        EVENT_ID,
        ORGANIZER_ID,
      );
      expect(crudMock.getRegistrationTimestamps).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
        ENDED_TIMELINE_END,
      );
      expect(crudMock.countRegistrationsBefore).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
      );
      expect(crudMock.getCheckInTimestamps).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
        ENDED_TIMELINE_END,
      );
      expect(crudMock.countCheckInsBefore).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
      );
      expect(crudMock.getFormAnswerData).toHaveBeenCalledWith(
        EVENT_ID,
        FormType.REGISTRATION,
      );
      expect(crudMock.getFormAnswerData).toHaveBeenCalledWith(
        EVENT_ID,
        FormType.FEEDBACK,
      );
    });

    // ------------------------------------------------------------------------
    // timeline end
    // ------------------------------------------------------------------------
    it.each([
      ['ended (endAt in the past)', EVENTS.ENDED, ENDED_TIMELINE_END],
      ['still running (endAt in the future)', EVENTS.ONGOING, NOW],
      [
        'no endAt, startAt + 24h in the past',
        EVENTS.NO_END,
        new Date('2026-05-21T09:00:00.000Z'),
      ],
      ['no dates (draft)', EVENTS.DRAFT, NOW],
    ])(
      'UT-getEventAnalytics-02: event %s — both timelines stop at the earlier of the event end and now',
      async (_label, event, expectedEnd) => {
        const input = {
          event,
          range: AnalyticsRange.LAST_24_HOURS,
        };
        eventValidationMock.validateEventExists.mockResolvedValue(input.event);
        const expected = expectedEnd;

        const actual = await service.getEventAnalytics(
          EVENT_ID,
          ORGANIZER_ID,
          input.range,
        );
        // console.log({ input, expected, actual });

        expect(actual.registrationTimeline.timelineEnd).toEqual(expected);
        expect(actual.checkInTimeline.timelineEnd).toEqual(expected);
      },
    );

    // ------------------------------------------------------------------------
    // fixed ranges
    // ------------------------------------------------------------------------
    it.each([
      [AnalyticsRange.LAST_7_DAYS, 7, '2026-05-13T17:00:00.000Z'],
      [AnalyticsRange.LAST_30_DAYS, 30, '2026-04-20T17:00:00.000Z'],
    ])(
      'UT-getEventAnalytics-03: range %s — %i daily (Bangkok) buckets ending at the last bucket before the timeline end',
      async (range, count, firstStart) => {
        const input = { range };
        const starts = series(firstStart, count, DAY_MS);
        const expected = buildTimeline(
          '1d',
          starts,
          Array<number>(count).fill(0),
          0,
          ENDED_TIMELINE_END,
        );

        const actual = await service.getEventAnalytics(
          EVENT_ID,
          ORGANIZER_ID,
          input.range,
        );
        // console.log({ input, expected, actual });

        expect(actual.registrationTimeline).toEqual(expected);
        expect(actual.checkInTimeline).toEqual(expected);
        expect(crudMock.countRegistrationsBefore).toHaveBeenCalledWith(
          EVENT_ID,
          starts[0],
        );
        expect(crudMock.countCheckInsBefore).toHaveBeenCalledWith(
          EVENT_ID,
          starts[0],
        );
      },
    );

    // ------------------------------------------------------------------------
    // all range
    // ------------------------------------------------------------------------
    it('UT-getEventAnalytics-04: range all, no activity in either stream — both timelines are empty and no timestamp or count queries are made', async () => {
      const input = { range: AnalyticsRange.ALL };
      const expected = emptyTimelineAt(ENDED_TIMELINE_END);

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.registrationTimeline).toEqual(expected);
      expect(actual.checkInTimeline).toEqual(expected);
      expect(crudMock.getRegistrationTimestamps).not.toHaveBeenCalled();
      expect(crudMock.getCheckInTimestamps).not.toHaveBeenCalled();
      expect(crudMock.countRegistrationsBefore).not.toHaveBeenCalled();
      expect(crudMock.countCheckInsBefore).not.toHaveBeenCalled();
    });

    it('UT-getEventAnalytics-05: range all, registrations spanning under 48h and no check-ins — hourly registration buckets from the first activity, check-ins stay empty', async () => {
      const input = { range: AnalyticsRange.ALL };
      crudMock.findEarliestRegistration.mockResolvedValue(
        new Date('2026-05-20T08:20:00.000Z'),
      );
      crudMock.getRegistrationTimestamps.mockResolvedValue([
        new Date('2026-05-20T08:20:00.000Z'),
        new Date('2026-05-20T09:10:00.000Z'),
      ]);
      const starts = series('2026-05-20T08:00:00.000Z', 4, HOUR_MS);
      const expected = {
        registrationTimeline: buildTimeline(
          '1h',
          starts,
          [1, 1, 0, 0],
          0,
          ENDED_TIMELINE_END,
        ),
        checkInTimeline: emptyTimelineAt(ENDED_TIMELINE_END),
      };

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect({
        registrationTimeline: actual.registrationTimeline,
        checkInTimeline: actual.checkInTimeline,
      }).toEqual(expected);
      expect(crudMock.findEarliestRegistration).toHaveBeenCalledWith(
        EVENT_ID,
        ENDED_TIMELINE_END,
      );
      expect(crudMock.getRegistrationTimestamps).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
        ENDED_TIMELINE_END,
      );
      expect(crudMock.getCheckInTimestamps).not.toHaveBeenCalled();
    });

    it('UT-getEventAnalytics-06: range all, registrations spanning more than 48h — daily (Bangkok) buckets from the first activity day', async () => {
      const input = { range: AnalyticsRange.ALL };
      crudMock.findEarliestRegistration.mockResolvedValue(
        new Date('2026-05-15T05:00:00.000Z'), // 12:00 on May 15 in Bangkok
      );
      crudMock.getRegistrationTimestamps.mockResolvedValue([
        new Date('2026-05-15T05:00:00.000Z'),
        new Date('2026-05-20T02:00:00.000Z'), // 09:00 on May 20 in Bangkok
      ]);
      const starts = series('2026-05-14T17:00:00.000Z', 6, DAY_MS);
      const expected = buildTimeline(
        '1d',
        starts,
        [1, 0, 0, 0, 0, 1],
        0,
        ENDED_TIMELINE_END,
      );

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.registrationTimeline).toEqual(expected);
      expect(crudMock.countRegistrationsBefore).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
      );
    });

    it('UT-getEventAnalytics-07: range all, a very long event (over 366 daily buckets) — only the most recent 366 are kept and the count before them seeds the running total', async () => {
      const input = { range: AnalyticsRange.ALL };
      crudMock.findEarliestRegistration.mockResolvedValue(
        new Date('2024-01-01T00:00:00.000Z'),
      );
      crudMock.countRegistrationsBefore.mockResolvedValue(100);
      const starts = series('2025-05-19T17:00:00.000Z', 366, DAY_MS);
      const expected = buildTimeline(
        '1d',
        starts,
        Array<number>(366).fill(0),
        100,
        ENDED_TIMELINE_END,
      );

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.registrationTimeline).toEqual(expected);
      expect(crudMock.countRegistrationsBefore).toHaveBeenCalledWith(
        EVENT_ID,
        starts[0],
      );
    });

    // ------------------------------------------------------------------------
    // overview
    // ------------------------------------------------------------------------
    it.each([
      [
        'normal',
        { registered: 7, cancelled: 2, checkedIn: 5 },
        10,
        { notCheckedIn: 2, attendanceRate: 0.7143, registerRate: 0.7 },
      ],
      [
        'nobody registered',
        { registered: 0, cancelled: 0, checkedIn: 0 },
        10,
        { notCheckedIn: 0, attendanceRate: null, registerRate: 0 },
      ],
      [
        'no seat limit',
        { registered: 7, cancelled: 2, checkedIn: 5 },
        null,
        { notCheckedIn: 2, attendanceRate: 0.7143, registerRate: null },
      ],
    ])(
      'UT-getEventAnalytics-08: %s — overview figures and rates',
      async (_label, counts, seatLimit, derived) => {
        const input = { counts, seatLimit };
        crudMock.getOverviewCounts.mockResolvedValue(input.counts);
        eventValidationMock.validateEventExists.mockResolvedValue({
          ...EVENTS.ENDED,
          seatLimit: input.seatLimit,
        });
        const expected = { seatLimit, ...counts, ...derived };

        const actual = await service.getEventAnalytics(
          EVENT_ID,
          ORGANIZER_ID,
          AnalyticsRange.LAST_24_HOURS,
        );
        // console.log({ input, expected, actual });

        expect(actual.overview).toEqual(expected);
      },
    );

    // ------------------------------------------------------------------------
    // registration form
    // ------------------------------------------------------------------------
    it('UT-getEventAnalytics-09: event without a registration form — registrationAnswers is an empty list', async () => {
      const input = { range: AnalyticsRange.LAST_24_HOURS };
      crudMock.getFormAnswerData.mockImplementation((_eventId, type) =>
        Promise.resolve(type === FormType.REGISTRATION ? null : FEEDBACK_FORM),
      );
      const expected: unknown[] = [];

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.registrationAnswers).toEqual(expected);
    });

    // ------------------------------------------------------------------------
    // feedback form
    // ------------------------------------------------------------------------
    it('UT-getEventAnalytics-10: event without a feedback form — feedback is null', async () => {
      const input = { range: AnalyticsRange.LAST_24_HOURS };
      crudMock.getFormAnswerData.mockImplementation((_eventId, type) =>
        Promise.resolve(
          type === FormType.REGISTRATION ? REGISTRATION_FORM : null,
        ),
      );
      const expected = null;

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.feedback).toBe(expected);
    });

    it('UT-getEventAnalytics-11: feedback form without any response — 0 responses, rate 0 and every field with zero answers', async () => {
      const input = { range: AnalyticsRange.LAST_24_HOURS };
      crudMock.getFormAnswerData.mockImplementation((_eventId, type) =>
        Promise.resolve(
          type === FormType.REGISTRATION
            ? REGISTRATION_FORM
            : EMPTY_FEEDBACK_FORM,
        ),
      );
      const expected = {
        responses: 0,
        responseRate: 0, // 0 responses / 5 checked in
        fields: [
          {
            fieldId: 'fb-rating',
            label: 'Rating',
            type: 'RATING',
            answered: 0,
            average: null,
            min: null,
            max: null,
            distribution: [],
          },
        ],
      };

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.feedback).toEqual(expected);
    });

    it('UT-getEventAnalytics-12: feedback form exists but nobody checked in — responseRate is null', async () => {
      const input = { range: AnalyticsRange.LAST_24_HOURS };
      crudMock.getOverviewCounts.mockResolvedValue({
        ...OVERVIEW_COUNTS,
        checkedIn: 0,
      });
      const expected = {
        responses: 4,
        responseRate: null,
        fields: EXPECTED_FEEDBACK_FIELDS,
      };

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        input.range,
      );
      // console.log({ input, expected, actual });

      expect(actual.feedback).toEqual(expected);
    });

    // ------------------------------------------------------------------------
    // errors
    // ------------------------------------------------------------------------
    it('UT-getEventAnalytics-13: caller does not own the event — throws ForbiddenException and nothing else is called', async () => {
      const input = { organizerProfileId: 'someone-else' };
      eventValidationMock.validateEventOwnership.mockRejectedValue(
        new ForbiddenException(
          'You do not have permission to edit this event.',
        ),
      );

      const actual = service.getEventAnalytics(
        EVENT_ID,
        input.organizerProfileId,
        AnalyticsRange.LAST_24_HOURS,
      );
      // console.log({ input, actual });

      await expect(actual).rejects.toThrow(ForbiddenException);
      expect(eventValidationMock.validateEventExists).not.toHaveBeenCalled();
      expect(crudMock.getOverviewCounts).not.toHaveBeenCalled();
    });

    it('UT-getEventAnalytics-14: event does not exist — throws EventNotFoundException and nothing else is called', async () => {
      const input = { eventId: 'missing-event' };
      eventValidationMock.validateEventOwnership.mockRejectedValue(
        new EventNotFoundException(),
      );

      const actual = service.getEventAnalytics(
        input.eventId,
        ORGANIZER_ID,
        AnalyticsRange.LAST_24_HOURS,
      );
      // console.log({ input, actual });

      await expect(actual).rejects.toThrow(EventNotFoundException);
      expect(eventValidationMock.validateEventExists).not.toHaveBeenCalled();
      expect(crudMock.getOverviewCounts).not.toHaveBeenCalled();
    });

    it('UT-getEventAnalytics-15: event disappears between the ownership check and the existence check — throws EventNotFoundException and runs no data query', async () => {
      const input = { eventId: EVENT_ID };
      eventValidationMock.validateEventExists.mockRejectedValue(
        new EventNotFoundException(),
      );

      const actual = service.getEventAnalytics(
        input.eventId,
        ORGANIZER_ID,
        AnalyticsRange.LAST_24_HOURS,
      );
      // console.log({ input, actual });

      await expect(actual).rejects.toThrow(EventNotFoundException);
      expect(crudMock.getOverviewCounts).not.toHaveBeenCalled();
    });

    it('UT-getEventAnalytics-16: a data query fails — the error bubbles up unchanged', async () => {
      const input = { error: new Error('db down') };
      crudMock.getOverviewCounts.mockRejectedValue(input.error);

      const actual = service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        AnalyticsRange.LAST_24_HOURS,
      );
      // console.log({ input, actual });

      await expect(actual).rejects.toBe(input.error);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-getEventAnalytics-17: seat limit of 0 — registerRate is null instead of dividing by zero', async () => {
      const input = { seatLimit: 0 };
      eventValidationMock.validateEventExists.mockResolvedValue({
        ...EVENTS.ENDED,
        seatLimit: input.seatLimit,
      });
      const expected = null;

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        AnalyticsRange.LAST_24_HOURS,
      );
      // console.log({ input, expected, actual });

      expect(actual.overview.registerRate).toBe(expected);
    });

    it('UT-getEventAnalytics-18: more people checked in than registered — notCheckedIn is floored at 0', async () => {
      const input = { counts: { registered: 3, cancelled: 0, checkedIn: 5 } };
      crudMock.getOverviewCounts.mockResolvedValue(input.counts);
      const expected = 0;

      const actual = await service.getEventAnalytics(
        EVENT_ID,
        ORGANIZER_ID,
        AnalyticsRange.LAST_24_HOURS,
      );
      // console.log({ input, expected, actual });

      expect(actual.overview.notCheckedIn).toBe(expected);
    });
  });
});
