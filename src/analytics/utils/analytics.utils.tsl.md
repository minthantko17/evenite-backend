# AnalyticsUtils — Test Specification Language (Category-Partition)

Scope: the exported functions of `analytics.utils.ts` (M-XX-003 … M-XX-013).
All of them are pure: no collaborators to mock, and the clock is never read —
"now" is always passed in as an argument, so tests use fixed `Date` values and
need no fake timers. `startOfDayInZone` (M-XX-005) is private and is covered
through `startOfBucket(…, '1d')`.

Daily buckets start at midnight in `Asia/Bangkok` (UTC+7, no DST), so a
Bangkok midnight is 17:00Z of the previous UTC day.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C, `[property P]` = marks a
choice so later choices can refer to it with `[if P]`.

Cases marked "documents current behavior" are not rejected by the code (no
throw); they pin down what happens today and are grouped last in each
`describe` so they are easy to remove.

---

## resolveEventEnd(event, now)

**Categories**
- event.endAt
  - set → returned as is
  - null
- event.startAt
  - set → with endAt null, end = startAt + 24h (FALLBACK_EVENT_DURATION_MS)
  - null
- Combinations
  - endAt set, startAt set → endAt
  - endAt set, startAt null → endAt
  - endAt null, startAt set → startAt + 24h
  - endAt null, startAt null (draft) → `now`
- endAt earlier than startAt [single] (documents current behavior): endAt is
  still returned.

---

## resolveTimelineEnd(event, now)

**Categories**
- Source of the event end
  - endAt set [property end]
  - endAt null, startAt set [property fallback]
  - no dates (draft) [property draft]
- Resolved end relative to `now` [if end or fallback]
  - before now → resolved end
  - exactly now → now
  - after now → now
- [if draft]: resolved end is `now` itself → returns `now` [single]

---

## startOfBucket(instant, bucket)  (includes startOfDayInZone)

**Categories**
- bucket
  - `1h` [property hourly]
  - `1d` [property daily]
- Instant position [if hourly]
  - exactly on the hour → unchanged
  - mid-hour → floored to the hour (UTC)
  - 1 ms before the next hour → still the same hour
  - non-zero milliseconds → milliseconds dropped
- Instant position [if daily]
  - exactly at Bangkok midnight → unchanged
  - midday Bangkok → that day's Bangkok midnight
  - 1 ms before the next Bangkok midnight → same day
  - UTC date differs from Bangkok date (e.g. 18:00Z = 01:00 next day in
    Bangkok) [single]
  - non-zero milliseconds → milliseconds dropped
  - month / year rollover between UTC and Bangkok date [single]

---

## listBucketStarts(first, last, bucket)

**Categories**
- bucket
  - `1h`
  - `1d`
- first vs last
  - equal → `[first]`
  - one bucket apart → two starts
  - many buckets apart → ascending, evenly spaced, both ends included
- first after last [single] (documents current behavior): returns `[]`
- last not aligned to a bucket [single] (documents current behavior): the
  partial trailing bucket is not included

---

## startOfLastBucket(timelineEnd, bucket)

**Categories**
- bucket
  - `1h` [property hourly]
  - `1d` [property daily]
- timelineEnd position
  - exactly on a bucket boundary → previous bucket (half-open timeline, no
    empty trailing bucket)
  - mid-bucket → that bucket
  - 1 ms after a boundary → the bucket that just started
- UTC date differs from Bangkok date [if daily] [single]

---

## listFixedRangeBucketStarts(timelineEnd, bucket, count)

**Categories**
- bucket / count
  - `1h` with count 24 [property hourly]
  - `1d` with count 7 [property daily]
  - `1d` with count 30 [property daily]
  - count 1 [single]
  - count 0 [single] (documents current behavior): `[]`
  - count negative [error] [single] (documents current behavior): `[]`
- timelineEnd alignment [if count 24, 7 or 30]
  - on a bucket boundary
  - mid-bucket
- Each valid frame asserts: exact length, last start = start of the last
  bucket, constant spacing.

---

## pickBucketForSpan(spanMs)

**Categories**
- span
  - 0 → `1h`
  - below 48h → `1h`
  - exactly 48h [single] → `1h` (the comparison is `<=`)
  - 48h + 1 ms [single] → `1d`
  - very large (30 days) → `1d`
  - negative [single] (documents current behavior) → `1h`

---

## emptyTimeline(timelineEnd)

**Categories**
- timelineEnd: any date [single] → bucket `1h`, `points` empty,
  timelineStart = timelineEnd = the given date.

---

## fillTimeline(starts, bucket, timestamps, countBeforeTimeline, timelineEnd)

**Categories**
- bucket
  - `1h`
  - `1d` [property daily] (timestamps are grouped by Bangkok day)
- starts
  - one bucket
  - many buckets
  - empty [error] [single] (documents current behavior): `points` is `[]` and
    `timelineStart` is `undefined`; the spec says it must not be empty
- timestamps
  - none → every count 0
  - several in the same bucket → counted together
  - spread across buckets → counted per bucket
  - exactly on a bucket start → counted in that bucket; 1 ms earlier → in the
    previous bucket
  - outside every bucket [single] → ignored
  - unsorted [single] → same result as sorted
- countBeforeTimeline
  - 0
  - positive → added to every point's `cumulative`, empty buckets included
- Each frame asserts: bucket, timelineStart (= starts[0]), timelineEnd,
  and per point `{ bucketStart, count, cumulative }`.

---

## toRate(part, whole)

**Categories**
- whole
  - positive
  - `null` [single] → `null`
  - 0 [single] → `null`
  - negative [error] [single] → `null`
- part [if whole positive]
  - 0 → 0
  - less than whole
  - equal to whole → 1
  - greater than whole [single] (documents current behavior): not clamped,
    e.g. 3/2 → 1.5
- Rounding [if whole positive and 0 < part < whole]
  - exact within 4 decimals (1/8 → 0.125)
  - rounds down (1/3 → 0.3333)
  - rounds up (2/3 → 0.6667)
