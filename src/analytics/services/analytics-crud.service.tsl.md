# AnalyticsCrudService — Test Specification Language (Category-Partition)

Scope: public methods of `AnalyticsCrudService` (M-XX-014 … M-XX-022).
`PrismaService` is a mocked collaborator; its outcome is modeled as a
category on each method (e.g. "Matching rows: none / some"). Besides the
returned value, each test asserts the query sent to Prisma (event id, status
filter, half-open time window), since that is where this service's logic
lives.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## getOverviewCounts(eventId)

**Categories**
- CONFIRMED registrations (eventRegistration.count, status CONFIRMED)
  - 0
  - positive
- CANCELLED registrations (eventRegistration.count, status CANCELLED)
  - 0
  - positive
- Attendance records (attendance.count)
  - 0
  - positive
- Frames
  - all positive → `{ registered, cancelled, checkedIn }` each from its own
    query (distinct values prove none are swapped)
  - all zero [single]
- Query shape [single]: three counts, filtered by the event id, the two
  registration counts by their status.

---

## getCheckInMethodCounts(eventId)

**Categories**
- Groups returned by attendance.groupBy
  - none → `{ QR_SCAN: 0, MANUAL: 0 }`
  - only QR_SCAN → MANUAL stays 0
  - only MANUAL → QR_SCAN stays 0
  - both → each count taken from `_count._all`
- Query shape [single]: grouped by `method`, filtered by event id.

---

## getRegistrationTimestamps(eventId, from, to)

**Categories**
- Matching registrations
  - none → `[]`
  - some → their `createdAt` values, in the order returned
- Query shape [single]: CONFIRMED only, `createdAt >= from` and
  `createdAt < to` (half-open window), selects only `createdAt`.

---

## countRegistrationsBefore(eventId, before)

**Categories**
- Count result
  - 0
  - positive → returned as is
- Query shape [single]: CONFIRMED only, `createdAt < before` (exclusive).

---

## findEarliestRegistration(eventId, to)

**Categories**
- Earliest confirmed registration
  - exists → its createdAt
  - none (aggregate `_min` is null) → `null`
- Query shape [single]: CONFIRMED only, `createdAt < to` (exclusive), `_min`
  of `createdAt`.

---

## getCheckInTimestamps(eventId, from, to)

**Categories**
- Matching attendance rows
  - none → `[]`
  - some → their `checkedInAt` values, in the order returned
- Query shape [single]: `checkedInAt >= from` and `< to`, selects only
  `checkedInAt`.

---

## countCheckInsBefore(eventId, before)

**Categories**
- Count result
  - 0
  - positive → returned as is
- Query shape [single]: `checkedInAt < before` (exclusive).

---

## findEarliestCheckIn(eventId, to)

**Categories**
- Earliest check-in
  - exists → its checkedInAt
  - none → `null`
- Query shape [single]: `checkedInAt < to` (exclusive), `_min` of
  `checkedInAt`.

---

## getFormAnswerData(eventId, type)

**Categories**
- type
  - REGISTRATION
  - FEEDBACK
- Form existence (form.findUnique by `eventId_type`)
  - form found → continue
  - form not found → `null`, and no answer/count query is made [error-like,
    but a normal result]
- Answers [if form found]
  - form has fields, answers and responses → `{ fields, rows, responseCount }`
  - form has fields but no answers / responses → `rows: []`,
    `responseCount: 0`
  - form has no fields [single]: `fields: []`
- Query shape [single]: fields ordered by `order` ascending; answers and the
  response count restricted to the form id and to CONFIRMED registrations
  only (a cancelled registration keeps its response and must not count).
