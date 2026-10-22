import {
  emptyTimeline,
  fillTimeline,
  listBucketStarts,
  listFixedRangeBucketStarts,
  pickBucketForSpan,
  resolveEventEnd,
  resolveTimelineEnd,
  startOfBucket,
  startOfLastBucket,
  toRate,
} from './analytics.utils';
import {
  ALL_RANGE_HOURLY_MAX_SPAN_MS,
  DAY_MS,
  FALLBACK_EVENT_DURATION_MS,
  HOUR_MS,
} from '../constants/analytics.constants';

// Pure functions: "now" is always passed in, so every test uses fixed Date
// values and no fake timers. Daily buckets start at midnight in Asia/Bangkok
// (UTC+7, no DST), i.e. 17:00Z of the previous UTC day.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, regular cases come first, followed by edge
// cases that document current behavior (the code does not reject them).

const d = (iso: string) => new Date(iso);

// `count` evenly spaced dates starting at `first`
const series = (first: string, count: number, stepMs: number) =>
  Array.from(
    { length: count },
    (_, i) => new Date(d(first).getTime() + i * stepMs),
  );

// expected timeline points for the given bucket starts
const points = (starts: Date[], counts: number[], cumulatives: number[]) =>
  starts.map((bucketStart, i) => ({
    bucketStart,
    count: counts[i],
    cumulative: cumulatives[i],
  }));

describe('AnalyticsUtils', () => {
  // ==========================================================================
  // resolveEventEnd
  // ==========================================================================
  describe('resolveEventEnd', () => {
    const now = d('2026-05-20T12:00:00.000Z');

    it('UT-resolveEventEnd-01: endAt and startAt set — returns endAt', () => {
      const input = {
        event: {
          startAt: d('2026-05-20T09:00:00.000Z'),
          endAt: d('2026-05-20T15:00:00.000Z'),
        },
        now,
      };
      const expected = d('2026-05-20T15:00:00.000Z');

      const actual = resolveEventEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveEventEnd-02: endAt set, startAt null — returns endAt', () => {
      const input = {
        event: { startAt: null, endAt: d('2026-05-20T15:00:00.000Z') },
        now,
      };
      const expected = d('2026-05-20T15:00:00.000Z');

      const actual = resolveEventEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveEventEnd-03: endAt null, startAt set — returns startAt plus the 24h fallback duration', () => {
      const input = {
        event: { startAt: d('2026-05-20T09:00:00.000Z'), endAt: null },
        now,
      };
      const expected = d('2026-05-21T09:00:00.000Z');

      const actual = resolveEventEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(actual.getTime() - input.event.startAt.getTime()).toBe(
        FALLBACK_EVENT_DURATION_MS,
      );
    });

    it('UT-resolveEventEnd-04: no dates (draft) — returns now', () => {
      const input = { event: { startAt: null, endAt: null }, now };
      const expected = now;

      const actual = resolveEventEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-resolveEventEnd-05: endAt earlier than startAt — endAt is still returned', () => {
      const input = {
        event: {
          startAt: d('2026-05-20T15:00:00.000Z'),
          endAt: d('2026-05-20T09:00:00.000Z'),
        },
        now,
      };
      const expected = d('2026-05-20T09:00:00.000Z');

      const actual = resolveEventEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // resolveTimelineEnd
  // ==========================================================================
  describe('resolveTimelineEnd', () => {
    const now = d('2026-05-20T12:00:00.000Z');

    it('UT-resolveTimelineEnd-01: endAt before now — returns endAt', () => {
      const input = {
        event: { startAt: null, endAt: d('2026-05-20T10:00:00.000Z') },
        now,
      };
      const expected = d('2026-05-20T10:00:00.000Z');

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveTimelineEnd-02: endAt after now — returns now', () => {
      const input = {
        event: { startAt: null, endAt: d('2026-05-20T14:00:00.000Z') },
        now,
      };
      const expected = now;

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveTimelineEnd-03: endAt exactly now — returns now', () => {
      const input = {
        event: { startAt: null, endAt: d('2026-05-20T12:00:00.000Z') },
        now,
      };
      const expected = now;

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveTimelineEnd-04: no endAt, fallback end (startAt + 24h) before now — returns the fallback end', () => {
      const input = {
        event: { startAt: d('2026-05-18T09:00:00.000Z'), endAt: null },
        now,
      };
      const expected = d('2026-05-19T09:00:00.000Z');

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveTimelineEnd-05: no endAt, fallback end after now — returns now', () => {
      const input = {
        event: { startAt: d('2026-05-20T06:00:00.000Z'), endAt: null },
        now,
      };
      const expected = now;

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveTimelineEnd-06: no endAt, fallback end exactly now — returns now', () => {
      const input = {
        event: { startAt: d('2026-05-19T12:00:00.000Z'), endAt: null },
        now,
      };
      const expected = now;

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-resolveTimelineEnd-07: no dates (draft) — returns now', () => {
      const input = { event: { startAt: null, endAt: null }, now };
      const expected = now;

      const actual = resolveTimelineEnd(input.event, input.now);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // startOfBucket (also covers the private startOfDayInZone)
  // ==========================================================================
  describe('startOfBucket', () => {
    describe('1h', () => {
      it.each([
        ['exactly on the hour', '2026-05-20T10:00:00.000Z'],
        ['mid-hour', '2026-05-20T10:37:21.000Z'],
        ['1 ms before the next hour', '2026-05-20T10:59:59.999Z'],
        ['non-zero milliseconds', '2026-05-20T10:30:00.500Z'],
      ])(
        'UT-startOfBucket-01: hourly, %s — floors to the start of the hour',
        (_label, instant) => {
          const input = { instant: d(instant), bucket: '1h' as const };
          const expected = d('2026-05-20T10:00:00.000Z');

          const actual = startOfBucket(input.instant, input.bucket);
          // console.log({ input, expected, actual });

          expect(actual).toEqual(expected);
        },
      );
    });

    describe('1d (Asia/Bangkok)', () => {
      // Bangkok midnight of 2026-05-21 is 2026-05-20T17:00Z
      it.each([
        ['exactly at Bangkok midnight', '2026-05-20T17:00:00.000Z'],
        ['midday in Bangkok', '2026-05-21T05:00:00.000Z'],
        ['1 ms before the next Bangkok midnight', '2026-05-21T16:59:59.999Z'],
        ['non-zero milliseconds', '2026-05-21T05:00:00.789Z'],
      ])(
        'UT-startOfBucket-02: daily, %s — floors to the Bangkok midnight of that day',
        (_label, instant) => {
          const input = { instant: d(instant), bucket: '1d' as const };
          const expected = d('2026-05-20T17:00:00.000Z');

          const actual = startOfBucket(input.instant, input.bucket);
          // console.log({ input, expected, actual });

          expect(actual).toEqual(expected);
        },
      );

      it.each([
        // 18:00Z is already 01:00 on May 21 in Bangkok
        [
          'already the next day in Bangkok',
          '2026-05-20T18:00:00.000Z',
          '2026-05-20T17:00:00.000Z',
        ],
        // 10:00Z is still May 20 (17:00) in Bangkok
        [
          'still the same day in Bangkok',
          '2026-05-20T10:00:00.000Z',
          '2026-05-19T17:00:00.000Z',
        ],
      ])(
        'UT-startOfBucket-03: daily, UTC date differs from the Bangkok date, %s — the Bangkok day wins',
        (_label, instant, expectedStart) => {
          const input = { instant: d(instant), bucket: '1d' as const };
          const expected = d(expectedStart);

          const actual = startOfBucket(input.instant, input.bucket);
          // console.log({ input, expected, actual });

          expect(actual).toEqual(expected);
        },
      );

      it.each([
        // 01:00 on 1 June in Bangkok
        [
          'month rollover',
          '2026-05-31T18:00:00.000Z',
          '2026-05-31T17:00:00.000Z',
        ],
        // 03:00 on 1 January 2026 in Bangkok
        [
          'year rollover',
          '2025-12-31T20:00:00.000Z',
          '2025-12-31T17:00:00.000Z',
        ],
      ])(
        'UT-startOfBucket-04: daily, %s — Bangkok day is ahead of the UTC day',
        (_label, instant, expectedStart) => {
          const input = { instant: d(instant), bucket: '1d' as const };
          const expected = d(expectedStart);

          const actual = startOfBucket(input.instant, input.bucket);
          // console.log({ input, expected, actual });

          expect(actual).toEqual(expected);
        },
      );
    });
  });

  // ==========================================================================
  // listBucketStarts
  // ==========================================================================
  describe('listBucketStarts', () => {
    it('UT-listBucketStarts-01: hourly, first equals last — returns just that start', () => {
      const input = {
        first: d('2026-05-20T10:00:00.000Z'),
        last: d('2026-05-20T10:00:00.000Z'),
        bucket: '1h' as const,
      };
      const expected = [d('2026-05-20T10:00:00.000Z')];

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-listBucketStarts-02: hourly, one bucket apart — returns both starts', () => {
      const input = {
        first: d('2026-05-20T10:00:00.000Z'),
        last: d('2026-05-20T11:00:00.000Z'),
        bucket: '1h' as const,
      };
      const expected = [
        d('2026-05-20T10:00:00.000Z'),
        d('2026-05-20T11:00:00.000Z'),
      ];

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-listBucketStarts-03: hourly, many buckets apart — ascending, 1h apart, both ends included', () => {
      const input = {
        first: d('2026-05-20T10:00:00.000Z'),
        last: d('2026-05-20T15:00:00.000Z'),
        bucket: '1h' as const,
      };
      const expected = series('2026-05-20T10:00:00.000Z', 6, HOUR_MS);

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-listBucketStarts-04: daily, first equals last — returns just that start', () => {
      const input = {
        first: d('2026-05-19T17:00:00.000Z'),
        last: d('2026-05-19T17:00:00.000Z'),
        bucket: '1d' as const,
      };
      const expected = [d('2026-05-19T17:00:00.000Z')];

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-listBucketStarts-05: daily, one bucket apart — returns both starts', () => {
      const input = {
        first: d('2026-05-19T17:00:00.000Z'),
        last: d('2026-05-20T17:00:00.000Z'),
        bucket: '1d' as const,
      };
      const expected = [
        d('2026-05-19T17:00:00.000Z'),
        d('2026-05-20T17:00:00.000Z'),
      ];

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-listBucketStarts-06: daily, many buckets apart — ascending, 24h apart, both ends included', () => {
      const input = {
        first: d('2026-05-19T17:00:00.000Z'),
        last: d('2026-05-24T17:00:00.000Z'),
        bucket: '1d' as const,
      };
      const expected = series('2026-05-19T17:00:00.000Z', 6, DAY_MS);

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-listBucketStarts-07: first after last — returns an empty list', () => {
      const input = {
        first: d('2026-05-20T12:00:00.000Z'),
        last: d('2026-05-20T10:00:00.000Z'),
        bucket: '1h' as const,
      };
      const expected: Date[] = [];

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-listBucketStarts-08: last not aligned to a bucket — the partial trailing bucket is not included', () => {
      const input = {
        first: d('2026-05-20T10:00:00.000Z'),
        last: d('2026-05-20T12:30:00.000Z'),
        bucket: '1h' as const,
      };
      const expected = [
        d('2026-05-20T10:00:00.000Z'),
        d('2026-05-20T11:00:00.000Z'),
        d('2026-05-20T12:00:00.000Z'),
      ];

      const actual = listBucketStarts(input.first, input.last, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // startOfLastBucket
  // ==========================================================================
  describe('startOfLastBucket', () => {
    it.each([
      // half-open timeline: ending on 11:00 means the last bucket is 10:00
      [
        'exactly on a boundary',
        '2026-05-20T11:00:00.000Z',
        '2026-05-20T10:00:00.000Z',
      ],
      ['mid-bucket', '2026-05-20T10:30:00.000Z', '2026-05-20T10:00:00.000Z'],
      [
        '1 ms after a boundary',
        '2026-05-20T11:00:00.001Z',
        '2026-05-20T11:00:00.000Z',
      ],
    ])(
      'UT-startOfLastBucket-01: hourly, timelineEnd %s — returns the bucket holding the last moment before the end',
      (_label, timelineEnd, expectedStart) => {
        const input = { timelineEnd: d(timelineEnd), bucket: '1h' as const };
        const expected = d(expectedStart);

        const actual = startOfLastBucket(input.timelineEnd, input.bucket);
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it.each([
      [
        'exactly on a boundary',
        '2026-05-21T17:00:00.000Z',
        '2026-05-20T17:00:00.000Z',
      ],
      ['mid-bucket', '2026-05-21T05:00:00.000Z', '2026-05-20T17:00:00.000Z'],
      [
        '1 ms after a boundary',
        '2026-05-20T17:00:00.001Z',
        '2026-05-20T17:00:00.000Z',
      ],
    ])(
      'UT-startOfLastBucket-02: daily, timelineEnd %s — returns the Bangkok day holding the last moment before the end',
      (_label, timelineEnd, expectedStart) => {
        const input = { timelineEnd: d(timelineEnd), bucket: '1d' as const };
        const expected = d(expectedStart);

        const actual = startOfLastBucket(input.timelineEnd, input.bucket);
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it('UT-startOfLastBucket-03: daily, UTC date differs from the Bangkok date — the Bangkok day wins', () => {
      // 18:00Z is 01:00 on May 21 in Bangkok, so the last moment belongs to May 21
      const input = {
        timelineEnd: d('2026-05-20T18:00:00.000Z'),
        bucket: '1d' as const,
      };
      const expected = d('2026-05-20T17:00:00.000Z');

      const actual = startOfLastBucket(input.timelineEnd, input.bucket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // listFixedRangeBucketStarts
  // ==========================================================================
  describe('listFixedRangeBucketStarts', () => {
    it.each([
      // last bucket 11:00 (end exactly on the boundary) / 12:00 (mid-bucket)
      ['on a boundary', '2026-05-20T12:00:00.000Z', '2026-05-19T12:00:00.000Z'],
      ['mid-bucket', '2026-05-20T12:30:00.000Z', '2026-05-19T13:00:00.000Z'],
    ])(
      'UT-listFixedRangeBucketStarts-01: hourly, count 24, timelineEnd %s — 24 hourly starts ending at the last bucket',
      (_label, timelineEnd, firstStart) => {
        const input = {
          timelineEnd: d(timelineEnd),
          bucket: '1h' as const,
          count: 24,
        };
        const expected = series(firstStart, 24, HOUR_MS);

        const actual = listFixedRangeBucketStarts(
          input.timelineEnd,
          input.bucket,
          input.count,
        );
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it.each([
      ['on a boundary', '2026-05-21T17:00:00.000Z'],
      ['mid-bucket', '2026-05-21T05:00:00.000Z'],
    ])(
      'UT-listFixedRangeBucketStarts-02: daily, count 7, timelineEnd %s — 7 daily starts ending at the last bucket',
      (_label, timelineEnd) => {
        const input = {
          timelineEnd: d(timelineEnd),
          bucket: '1d' as const,
          count: 7,
        };
        const expected = series('2026-05-14T17:00:00.000Z', 7, DAY_MS);

        const actual = listFixedRangeBucketStarts(
          input.timelineEnd,
          input.bucket,
          input.count,
        );
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it.each([
      ['on a boundary', '2026-05-21T17:00:00.000Z'],
      ['mid-bucket', '2026-05-21T05:00:00.000Z'],
    ])(
      'UT-listFixedRangeBucketStarts-03: daily, count 30, timelineEnd %s — 30 daily starts ending at the last bucket',
      (_label, timelineEnd) => {
        const input = {
          timelineEnd: d(timelineEnd),
          bucket: '1d' as const,
          count: 30,
        };
        const expected = series('2026-04-21T17:00:00.000Z', 30, DAY_MS);

        const actual = listFixedRangeBucketStarts(
          input.timelineEnd,
          input.bucket,
          input.count,
        );
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it('UT-listFixedRangeBucketStarts-04: count 1 — returns only the last bucket', () => {
      const input = {
        timelineEnd: d('2026-05-20T12:30:00.000Z'),
        bucket: '1h' as const,
        count: 1,
      };
      const expected = [d('2026-05-20T12:00:00.000Z')];

      const actual = listFixedRangeBucketStarts(
        input.timelineEnd,
        input.bucket,
        input.count,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it.each([
      ['0', 0],
      ['negative', -3],
    ])(
      'UT-listFixedRangeBucketStarts-05: count %s — returns an empty list',
      (_label, count) => {
        const input = {
          timelineEnd: d('2026-05-20T12:30:00.000Z'),
          bucket: '1h' as const,
          count,
        };
        const expected: Date[] = [];

        const actual = listFixedRangeBucketStarts(
          input.timelineEnd,
          input.bucket,
          input.count,
        );
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );
  });

  // ==========================================================================
  // pickBucketForSpan
  // ==========================================================================
  describe('pickBucketForSpan', () => {
    it.each([
      ['0', 0, '1h'],
      ['below 48h', 47 * HOUR_MS, '1h'],
      ['exactly 48h (inclusive limit)', ALL_RANGE_HOURLY_MAX_SPAN_MS, '1h'],
      ['48h + 1 ms', ALL_RANGE_HOURLY_MAX_SPAN_MS + 1, '1d'],
      ['30 days', 30 * DAY_MS, '1d'],
    ])(
      'UT-pickBucketForSpan-01: span %s — picks %s',
      (_label, spanMs, bucket) => {
        const input = { spanMs };
        const expected = bucket;

        const actual = pickBucketForSpan(input.spanMs);
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
      },
    );

    // --- edge cases (documents current behavior) ---
    it('UT-pickBucketForSpan-02: negative span — picks hourly', () => {
      const input = { spanMs: -1 };
      const expected = '1h';

      const actual = pickBucketForSpan(input.spanMs);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // emptyTimeline
  // ==========================================================================
  describe('emptyTimeline', () => {
    it('UT-emptyTimeline-01: any end — hourly bucket, no points, start and end both equal the given end', () => {
      const input = { timelineEnd: d('2026-05-20T12:00:00.000Z') };
      const expected = {
        bucket: '1h',
        timelineStart: d('2026-05-20T12:00:00.000Z'),
        timelineEnd: d('2026-05-20T12:00:00.000Z'),
        points: [],
      };

      const actual = emptyTimeline(input.timelineEnd);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // fillTimeline
  // ==========================================================================
  describe('fillTimeline', () => {
    const hourlyStarts = [
      d('2026-05-20T10:00:00.000Z'),
      d('2026-05-20T11:00:00.000Z'),
      d('2026-05-20T12:00:00.000Z'),
    ];
    const timelineEnd = d('2026-05-20T12:45:00.000Z');

    it('UT-fillTimeline-01: hourly, many buckets, no timestamps — every point is 0 and the shape is complete', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [] as Date[],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = {
        bucket: '1h',
        timelineStart: hourlyStarts[0],
        timelineEnd,
        points: points(hourlyStarts, [0, 0, 0], [0, 0, 0]),
      };

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-02: hourly, one bucket, one timestamp — a single point of 1', () => {
      const input = {
        starts: [hourlyStarts[0]],
        bucket: '1h' as const,
        timestamps: [d('2026-05-20T10:10:00.000Z')],
        countBeforeTimeline: 0,
        timelineEnd: d('2026-05-20T10:30:00.000Z'),
      };
      const expected = {
        bucket: '1h',
        timelineStart: hourlyStarts[0],
        timelineEnd: d('2026-05-20T10:30:00.000Z'),
        points: points([hourlyStarts[0]], [1], [1]),
      };

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-03: hourly, several timestamps in the same bucket — counted together', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [
          d('2026-05-20T10:05:00.000Z'),
          d('2026-05-20T10:20:00.000Z'),
          d('2026-05-20T10:50:00.000Z'),
        ],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = points(hourlyStarts, [3, 0, 0], [3, 3, 3]);

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      ).points;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-04: hourly, timestamps spread across buckets — counted per bucket with a running total', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [
          d('2026-05-20T10:15:00.000Z'),
          d('2026-05-20T11:15:00.000Z'),
          d('2026-05-20T11:45:00.000Z'),
        ],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = points(hourlyStarts, [1, 2, 0], [1, 3, 3]);

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      ).points;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-05: hourly, timestamps on a bucket edge — exactly on a start belongs to that bucket, 1 ms earlier to the previous one', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [
          d('2026-05-20T11:00:00.000Z'),
          d('2026-05-20T10:59:59.999Z'),
        ],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = points(hourlyStarts, [1, 1, 0], [1, 2, 2]);

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      ).points;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-06: positive countBeforeTimeline — added to every cumulative, empty buckets included', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [d('2026-05-20T10:15:00.000Z')],
        countBeforeTimeline: 5,
        timelineEnd,
      };
      const expected = points(hourlyStarts, [1, 0, 0], [6, 6, 6]);

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      ).points;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-07: daily — timestamps are grouped by Bangkok day, not UTC day', () => {
      const dailyStarts = [
        d('2026-05-19T17:00:00.000Z'),
        d('2026-05-20T17:00:00.000Z'),
        d('2026-05-21T17:00:00.000Z'),
      ];
      const input = {
        starts: dailyStarts,
        bucket: '1d' as const,
        timestamps: [
          d('2026-05-20T10:00:00.000Z'), // May 20, 17:00 in Bangkok
          d('2026-05-20T18:00:00.000Z'), // May 21, 01:00 in Bangkok
          d('2026-05-21T16:00:00.000Z'), // May 21, 23:00 in Bangkok
        ],
        countBeforeTimeline: 0,
        timelineEnd: d('2026-05-22T05:00:00.000Z'),
      };
      const expected = {
        bucket: '1d',
        timelineStart: dailyStarts[0],
        timelineEnd: d('2026-05-22T05:00:00.000Z'),
        points: points(dailyStarts, [1, 2, 0], [1, 3, 3]),
      };

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-fillTimeline-08: timestamps outside every bucket — ignored', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [
          d('2026-05-20T09:59:59.999Z'),
          d('2026-05-20T13:00:00.000Z'),
        ],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = points(hourlyStarts, [0, 0, 0], [0, 0, 0]);

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      ).points;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-09: unsorted timestamps — same result as sorted', () => {
      const input = {
        starts: hourlyStarts,
        bucket: '1h' as const,
        timestamps: [
          d('2026-05-20T11:15:00.000Z'),
          d('2026-05-20T10:15:00.000Z'),
          d('2026-05-20T11:45:00.000Z'),
        ],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = points(hourlyStarts, [1, 2, 0], [1, 3, 3]);

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      ).points;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-fillTimeline-10: empty starts — no points and an undefined timelineStart', () => {
      const input = {
        starts: [] as Date[],
        bucket: '1h' as const,
        timestamps: [] as Date[],
        countBeforeTimeline: 0,
        timelineEnd,
      };
      const expected = {
        bucket: '1h',
        timelineStart: undefined,
        timelineEnd,
        points: [],
      };

      const actual = fillTimeline(
        input.starts,
        input.bucket,
        input.timestamps,
        input.countBeforeTimeline,
        input.timelineEnd,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // toRate
  // ==========================================================================
  describe('toRate', () => {
    it.each([
      ['part 0', 0, 10, 0],
      ['part less than whole', 5, 10, 0.5],
      ['part equal to whole', 10, 10, 1],
      ['exact within 4 decimals', 1, 8, 0.125],
      ['rounds down', 1, 3, 0.3333],
      ['rounds up', 2, 3, 0.6667],
    ])(
      'UT-toRate-01: positive whole, %s — returns part / whole rounded to 4 decimals',
      (_label, part, whole, expectedRate) => {
        const input = { part, whole };
        const expected = expectedRate;

        const actual = toRate(input.part, input.whole);
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
      },
    );

    it.each([
      ['null', null],
      ['0', 0],
      ['negative', -5],
    ])('UT-toRate-02: whole is %s — returns null', (_label, whole) => {
      const input = { part: 3, whole };
      const expected = null;

      const actual = toRate(input.part, input.whole);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-toRate-03: part greater than whole — not clamped to 1', () => {
      const input = { part: 3, whole: 2 };
      const expected = 1.5;

      const actual = toRate(input.part, input.whole);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });
});
