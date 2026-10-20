import {
  ALL_RANGE_HOURLY_MAX_SPAN_MS,
  ANALYTICS_TIME_ZONE,
  DAY_MS,
  FALLBACK_EVENT_DURATION_MS,
  HOUR_MS,
} from '../constants/analytics.constants';
import {
  AnalyticsBucket,
  AnalyticsTimelineDto,
} from '../dto/return-analytics.dto';

// Pure time/bucket helpers (no database), so they are easy to unit-test.

const BUCKET_MS: Record<AnalyticsBucket, number> = {
  '1h': HOUR_MS,
  '1d': DAY_MS,
};

// analytics stop at the event's end; no endAt -> startAt + 24h; no dates at all (draft) -> now
export function resolveEventEnd(
  event: { startAt: Date | null; endAt: Date | null },
  now: Date,
): Date {
  if (event.endAt) return event.endAt;
  if (event.startAt) {
    return new Date(event.startAt.getTime() + FALLBACK_EVENT_DURATION_MS);
  }
  return now;
}

// timelines never show anything after "now" or after the event's end
export function resolveWindowEnd(
  event: { startAt: Date | null; endAt: Date | null },
  now: Date,
): Date {
  const eventEnd = resolveEventEnd(event, now);
  return eventEnd.getTime() < now.getTime() ? eventEnd : now;
}

// midnight (in ANALYTICS_TIME_ZONE) of the day containing `instant`.
// NOTE: assumes the zone has no DST change within that day, which holds for
// Asia/Bangkok. Revisit if the zone is ever made configurable.
function startOfDayInZone(instant: Date): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ANALYTICS_TIME_ZONE,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const secondsSinceMidnight =
    part('hour') * 3600 + part('minute') * 60 + part('second');
  const wholeSeconds = Math.floor(instant.getTime() / 1000) * 1000;
  return new Date(wholeSeconds - secondsSinceMidnight * 1000);
}

export function startOfBucket(instant: Date, bucket: AnalyticsBucket): Date {
  if (bucket === '1d') return startOfDayInZone(instant);
  return new Date(Math.floor(instant.getTime() / HOUR_MS) * HOUR_MS);
}

// every bucket start from `first` to `last` inclusive (both must already be bucket starts)
export function buildBucketStarts(
  first: Date,
  last: Date,
  bucket: AnalyticsBucket,
): Date[] {
  const starts: Date[] = [];
  for (let t = first.getTime(); t <= last.getTime(); t += BUCKET_MS[bucket]) {
    starts.push(new Date(t));
  }
  return starts;
}

// The window is half-open: [windowStart, windowEnd). So the last bucket is the one
// containing the final moment BEFORE windowEnd. An event ending exactly on a bucket
// boundary (e.g. 21:00) therefore doesn't get an extra empty bucket after its end.
export function lastBucketStart(
  windowEnd: Date,
  bucket: AnalyticsBucket,
): Date {
  return startOfBucket(new Date(windowEnd.getTime() - 1), bucket);
}

// the `count` buckets ending with the one that contains the end of the window
export function buildFixedRangeBucketStarts(
  windowEnd: Date,
  bucket: AnalyticsBucket,
  count: number,
): Date[] {
  const last = lastBucketStart(windowEnd, bucket);
  const first = new Date(last.getTime() - (count - 1) * BUCKET_MS[bucket]);
  return buildBucketStarts(first, last, bucket);
}

// for "all": hourly for short activity spans, daily otherwise
export function pickBucketForSpan(spanMs: number): AnalyticsBucket {
  return spanMs <= ALL_RANGE_HOURLY_MAX_SPAN_MS ? '1h' : '1d';
}

export function emptyTimeline(windowEnd: Date): AnalyticsTimelineDto {
  return { bucket: '1h', windowStart: windowEnd, windowEnd, points: [] };
}

// counts timestamps per bucket and builds the running total.
// `countBeforeWindow` = activity before the first bucket, so `cumulative`
// reflects the whole event and not just the window.
export function fillTimeline(
  starts: Date[],
  bucket: AnalyticsBucket,
  timestamps: Date[],
  countBeforeWindow: number,
  windowEnd: Date,
): AnalyticsTimelineDto {
  const countByBucket = new Map<number, number>();
  for (const timestamp of timestamps) {
    const key = startOfBucket(timestamp, bucket).getTime();
    countByBucket.set(key, (countByBucket.get(key) ?? 0) + 1);
  }

  let cumulative = countBeforeWindow;
  const points = starts.map((bucketStart) => {
    const count = countByBucket.get(bucketStart.getTime()) ?? 0;
    cumulative += count;
    return { bucketStart, count, cumulative };
  });

  return { bucket, windowStart: starts[0], windowEnd, points };
}

// 0..1 rounded to 4 decimals, null when there is nothing to divide by
export function toRate(part: number, whole: number | null): number | null {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 10000) / 10000;
}
