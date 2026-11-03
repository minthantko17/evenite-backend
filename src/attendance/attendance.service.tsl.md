# AttendanceService — Test Specification Language (Category-Partition)

Scope: public methods of `AttendanceService` (M-XY-017 … M-XY-020) and, through
them, the private helpers `validateEventAccess`, `checkIn`, `emitCheckedIn`,
`emitUndone`, `assertTicketCheckable`, `isUniqueViolation`.
Collaborators are mocked: `PrismaService` (only `$transaction`, wired to run
its callback with a fake transaction client), `AttendanceCrudService`,
`AttendanceValidationService`, `EventValidationService` and `EventEmitter2`.
Their outcomes are modeled as categories on this service (e.g. "Ownership
check: owner / not owner [error]"). `AttendanceValidationService.validateTicketActive`
is wired centrally to throw `TicketNotActiveException` for any non-ACTIVE
status, so the service's own branching can be seen end to end.
`Logger` output is spied on to confirm what is logged.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C, `[property P]` = marks a
choice so later choices can refer to it with `[if P]`.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## Check-in methods — shared specification

Both check-in methods run the same flow (validate access, find the ticket,
claim it and create the attendance in one transaction, emit a realtime
event). They differ only in how the ticket is found and in the method
recorded. They are specified and tested separately, with the same categories
repeated for each, so a future business rule that applies to only one of them
changes only that method's section and tests.

| | checkInByQrToken | checkInManually |
|---|---|---|
| ticket lookup | `findTicketByQrToken(eventId, qrToken)` | `findTicketByRegistrationId(eventId, registrationId)` |
| method recorded | `QR_SCAN` | `MANUAL` |

**Categories** (the same for both methods)
- Ownership check (eventValidationService.validateEventOwnership)
  - owner → continue
  - not the owner → ForbiddenException, nothing else is called [error]
  - event does not exist → EventNotFoundException, nothing else is called
    [error]
- Event existence (eventValidationService.validateEventExists)
  - exists → continue
  - gone between the two checks → EventNotFoundException [error] [single]
- Event status (attendanceValidationService.validateEventCheckable)
  - checkable → continue
  - concluded / cancelled → EventNotCheckableException, no ticket lookup
    [error]
- Ticket lookup (attendanceCrudService.findTicketBy…)
  - found → continue
  - not found → AttendanceTicketNotFoundException (bubbles up), no
    transaction [error]
- Ticket state [if found]
  - ACTIVE, no attendance → proceeds to the transaction
  - USED with an attendance record → AlreadyCheckedInException (409)
    carrying the original attendance (mapped), no transaction, no event [error]
  - USED without an attendance record [single] (documents current behavior):
    falls through to the status check → TicketNotActiveException
    (TICKET_NOT_ACTIVE) [error]
  - CANCELLED → TicketNotActiveException (TICKET_CANCELLED) [error]
  - EXPIRED → TicketNotActiveException (TICKET_EXPIRED) [error]
- Transaction outcome [if ticket ACTIVE]
  - ticket claimed (markTicketUsed true) and attendance created → success
    path below
  - ticket not claimed (markTicketUsed false: another check-in won) →
    re-read via findTicketById:
    - re-read shows USED with attendance → AlreadyCheckedInException with
      the winner's attendance [error]
    - re-read shows CANCELLED [single] (documents current behavior) →
      TicketNotActiveException [error]
    - re-read still ACTIVE [single] (documents current behavior) →
      SaveAttendanceException [error]
  - unique violation (Prisma P2002) on create → treated like losing the race
    (re-read, AlreadyCheckedInException) [error] [single]
  - any other Prisma error code (e.g. P2003) [single] →
    SaveAttendanceException, error logged [error]
  - generic failure (Error) → SaveAttendanceException, error logged, no
    re-read, no event [error]
- Success path
  - returns the mapped result with the ticket reported as USED
  - the ticket is looked up with the method's own lookup and the attendance
    is created with the event, the organizer and the method's recorded
    method, inside the transaction
  - emits `attendance.checked-in` with { eventId, organizerProfileId,
    participantProfileId, attendance, counts }
- Realtime emit [if success] (best-effort)
  - works → event emitted
  - getAttendanceSummary fails [single] → check-in still returned, warning
    logged, no event
  - emitter throws [single] → check-in still returned, warning logged

## checkInByQrToken(eventId, qrToken, organizerProfileId)

Categories as above, with: lookup = `findTicketByQrToken(eventId, qrToken)`,
recorded method = `QR_SCAN`.

## checkInManually(eventId, registrationId, organizerProfileId)

Categories as above, with: lookup = `findTicketByRegistrationId(eventId,
registrationId)`, recorded method = `MANUAL`.

---

## getAttendanceList(eventId, organizerProfileId)

**Categories**
- Ownership check
  - owner → returns the crud list unchanged
  - not the owner / event missing → throws (Forbidden / NotFound), the list
    is not queried [error]
- Event status [single]: not checked, so the list stays available for
  concluded or cancelled events (validateEventExists and
  validateEventCheckable are not called).

---

## undoCheckIn(eventId, attendanceId, organizerProfileId)

**Categories**
- Access (ownership + existence + checkable status), same choices as
  check-in
  - ok → continue
  - not the owner [error]
  - event not checkable [error] → attendance is not even looked up
- Attendance lookup (attendanceCrudService.findAttendanceById)
  - found → continue
  - not found → AttendanceNotFoundException bubbles up, no transaction
    [error]
- Feedback (attendanceValidationService.validateNoFeedbackSubmitted, called
  with the ticket's registration id)
  - none → continue
  - already submitted → FeedbackAlreadySubmittedException, no transaction
    [error]
- Transaction outcome
  - attendance deleted (true) and ticket reactivated → success path
  - delete returns false (a concurrent undo won) →
    AttendanceNotFoundException, ticket not reactivated, no event, no error
    log [error]
  - reactivation fails [single] → SaveAttendanceException, error logged
  - generic failure → SaveAttendanceException, error logged, no event
    [error]
- Success path
  - returns the list row mapped from the ticket with status ACTIVE and
    attendance null
  - emits `attendance.undone` with { eventId, organizerProfileId,
    participantProfileId, registrationId, ticketId, counts }
- Realtime emit [if success] (best-effort)
  - works → event emitted
  - failure [single] → undo still returned, warning logged, no event
