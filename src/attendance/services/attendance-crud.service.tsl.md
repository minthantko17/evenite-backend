# AttendanceCrudService — Test Specification Language (Category-Partition)

Scope: public methods of `AttendanceCrudService` (M-XY-005 … M-XY-016; the
private `getClient` M-XY-004 is covered through the methods that take `tx`).
`PrismaService` and the transaction client (`tx`) are mocked collaborators;
their outcomes are modeled as categories (e.g. "Ticket lookup: found / not
found [error]"). Besides the returned value, tests assert the query sent to
Prisma (event scoping, status filter, includes), since that is where this
service's logic lives. The two mappers are pure.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## findTicketByQrToken(eventId, qrToken) / findTicketByRegistrationId(eventId, registrationId)

**Categories**
- Ticket lookup (prisma.ticket.findFirst, scoped to the event)
  - found → the ticket with its attendance (or null) and the participant id
  - not found, or belongs to another event [error] →
    AttendanceTicketNotFoundException (TICKET_NOT_FOUND); the same error for
    both so ticket existence is not leaked
- Found ticket state [if found]
  - ticket without attendance (attendance null)
  - ticket with attendance [single]
- Query shape [single]: filtered by the token (or registration id) AND the
  event, includes `attendance` and the registration's `participantId`.

---

## findTicketById(ticketId)

**Categories**
- Ticket lookup (prisma.ticket.findUnique)
  - found → the ticket with attendance and participant id
  - not found [error] → AttendanceTicketNotFoundException (TICKET_NOT_FOUND)
- Query shape [single]: looked up by `id`, same includes.

---

## getAttendanceListByEvent(eventId)

**Categories**
- Confirmed tickets of the event (prisma.ticket.findMany)
  - none → `summary { registered: 0, checkedIn: 0 }`, `items: []`
  - some, none checked in → checkedIn 0
  - some, some checked in → checkedIn counts the items with attendance
  - all checked in [single]
- Query shape [single]: only CONFIRMED registrations of the event, ordered by
  registration creation time ascending (list order preserved), includes
  attendance and participant id.
- Mapping [single]: each item is the output of `mapToListItemDto`.

---

## getAttendanceSummary(eventId)

**Categories**
- Counts (prisma.ticket.count of confirmed tickets, prisma.attendance.count)
  - both positive → `{ registered, checkedIn }`, each from its own query
  - both 0 [single]
- Query shape [single]: tickets of CONFIRMED registrations of the event;
  attendance rows of the event.

---

## findAttendanceById(eventId, attendanceId)

**Categories**
- Attendance lookup (prisma.attendance.findFirst, scoped to the event)
  - found → the attendance with its ticket and the participant id
  - not found, or belongs to another event [error] →
    AttendanceNotFoundException (ATTENDANCE_NOT_FOUND)
- Query shape [single]: filtered by id AND event id, includes the ticket with
  the registration's `participantId`.

---

## markTicketUsed(ticketId, tx?)

**Categories**
- Client
  - no tx → runs on prisma
  - tx given → runs on tx, prisma is not touched
- Rows changed by the ACTIVE → USED update
  - 1 → `true`
  - 0 (ticket not ACTIVE, already claimed) → `false`
  - more than 1 [single] (documents current behavior) → `false`
- Query shape [single]: `updateMany` where id and status ACTIVE, data status
  USED.

---

## createAttendance(ticketId, eventId, organizerProfileId, method, tx?)

**Categories**
- method
  - QR_SCAN
  - MANUAL
- Client
  - no tx → prisma
  - tx given → tx, prisma is not touched
- Result: the created record is returned as is; `data` carries ticketId,
  eventId, `checkedInById` = organizer, and the method.

---

## deleteAttendance(attendanceId, tx?)

**Categories**
- Client
  - no tx → prisma
  - tx given → tx
- Rows deleted
  - 1 → `true`
  - 0 (already gone, e.g. a concurrent undo won) → `false`, no error
- Query shape [single]: `deleteMany` where id.

---

## reactivateTicket(ticketId, tx?)

**Categories**
- Client
  - no tx → prisma
  - tx given → tx
- Query shape [single]: `updateMany` where id and status USED, data status
  ACTIVE; resolves with nothing.
- Ticket not USED [single] (documents current behavior): no error, nothing
  returned (0 rows changed is not checked).

---

## mapToListItemDto(ticket)

**Categories**
- ticket.attendance
  - present → `attendance { id, method, checkedInAt }`
  - null → `attendance: null`
- Fixed mapping: registrationId = eventRegistrationId, `ticket { id, status }`,
  participantSnapshot passed through.

---

## mapToReturnAttendanceDto(attendance, ticket)

**Categories**
- Fixed mapping: attendance id / method / checkedInAt, registrationId =
  ticket.eventRegistrationId, `ticket { id, status }`, participantSnapshot.
- Ticket status [single] (documents current behavior): reported as given on
  the ticket argument (the caller passes USED after claiming), not read from
  the database.
