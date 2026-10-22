# AnalyticsService — Test Specification Language (Category-Partition)

Scope: `AnalyticsService.getEventAnalytics` (M-XX-023) and, through it, the
private `buildTimeline` (M-XX-024). `AnalyticsCrudService` and
`EventValidationService` are mocked collaborators; their outcomes are modeled
as categories on this service (e.g. "Ownership check: owner / not owner
[error]"). The pure helpers (`analytics.utils`, `analytics-field-stats.utils`)
are NOT mocked: they are covered by their own specs, so here they run for
real and the tests assert the assembled result.
The service calls `new Date()` for "now", so tests pin the clock with
`jest.useFakeTimers` and a fixed system time.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C, `[property P]` = marks a
choice so later choices can refer to it with `[if P]`.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## getEventAnalytics(eventId, organizerProfileId, range)

**Categories**
- Ownership check (eventValidationService.validateEventOwnership)
  - caller owns the event → continue
  - caller does not own the event → ForbiddenException, nothing else is
    called [error]
  - event does not exist → EventNotFoundException, nothing else is called
    [error]
- Event existence (eventValidationService.validateEventExists)
  - exists → continue
  - gone between the two checks → EventNotFoundException, no data queries
    [error] [single]
- Timeline end (the earlier of "now" and the event end)
  - event already ended (endAt in the past) → endAt
  - event still running (endAt in the future) → now
  - no endAt, startAt + 24h in the past → startAt + 24h
  - no dates (draft) → now
- range
  - `24h` → 24 hourly buckets
  - `7d` → 7 daily buckets
  - `30d` → 30 daily buckets
  - `all` [property all] → see "all range" below
- Overview figures (registered, cancelled, checkedIn, seatLimit)
  - normal (7 registered, 5 checked in, seat limit 10) → notCheckedIn 2,
    attendanceRate 0.7143, registerRate 0.7
  - checked in more than registered [single] → notCheckedIn floored at 0
  - nobody registered → attendanceRate `null`
  - no seat limit (null) → registerRate `null`
  - seat limit 0 [single] (documents current behavior): registerRate `null`
- Registration form
  - exists → per-field stats in `registrationAnswers`
  - none (null) → `registrationAnswers: []`
- Feedback form
  - exists with responses → `{ responses, responseRate, fields }`, rate
    measured against checked-in count (not registered)
  - exists with no responses → responses 0, rate 0, fields with zero answers
  - exists but nobody checked in [single] → responseRate `null`
  - none (null) → `feedback: null`
- Pass-through / metadata [single]: `generatedAt` = now, `range` echoed,
  `timeZone` = Asia/Bangkok, `checkInMethods` taken from the crud service.
- Collaborator failure [single]: a rejecting crud query bubbles up unchanged.

### Timeline building (M-XX-024), per stream: registrations / check-ins
- Fixed ranges (24h, 7d, 30d) [if not all]
  - bucket starts are the fixed count ending at the last bucket before the
    timeline end; `timestamps` and `countBefore` are read from the first
    bucket start to the timeline end; the base count seeds `cumulative`
- all range [if all]
  - no earliest activity → empty timeline (hourly, no points, start = end);
    no timestamp / count queries are made for that stream
  - activity spanning at most 48h → hourly buckets from the earliest
    activity's hour
  - activity spanning more than 48h → daily (Bangkok) buckets from the
    earliest activity's day
  - more than 366 daily buckets → only the most recent 366 are kept, and the
    count before the first kept bucket seeds `cumulative`
  - the two streams are independent (one can be empty while the other is not)
