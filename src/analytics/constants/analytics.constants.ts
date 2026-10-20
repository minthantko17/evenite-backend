// Day buckets (7d, 30d and daily "all") start at midnight in this time zone.
// It is intentionally a fixed constant for now (CMU is in Thailand), so:
//  - an organizer viewing from another time zone still sees days grouped the Bangkok way
//  - hourly buckets are NOT affected (UTC+7 is a whole-hour offset)
//  - if the app goes multi-region this should become a University.timezone column
export const ANALYTICS_TIME_ZONE = 'Asia/Bangkok';

export enum AnalyticsRange {
  LAST_24_HOURS = '24h',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  ALL = 'all',
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

// fixed ranges: how many buckets end at the timeline end
export const FIXED_RANGE_BUCKET_COUNT = {
  [AnalyticsRange.LAST_24_HOURS]: 24, // hourly
  [AnalyticsRange.LAST_7_DAYS]: 7, // daily
  [AnalyticsRange.LAST_30_DAYS]: 30, // daily
} as const;

// "all": hourly when the activity spans at most this long, otherwise daily
export const ALL_RANGE_HOURLY_MAX_SPAN_MS = 48 * HOUR_MS;

// safety cap for "all" on very long events (keeps the most recent buckets)
export const MAX_TIMELINE_POINTS = 366;

// an event without endAt is treated as ending this long after it starts
export const FALLBACK_EVENT_DURATION_MS = DAY_MS;
