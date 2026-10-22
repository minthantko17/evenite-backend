# RealtimeGateway — Test Specification Language (Category-Partition)

Scope: `RealtimeGateway` — `handleConnection`, `handleDisconnect` and the
five `@OnEvent` handlers (`handleAttendanceCheckedIn`,
`handleAttendanceUndone`, `handleRegistrationCreated`,
`handleRegistrationCancelled`, `handleFeedbackSubmitted`) plus the private
`nudgeAnalytics` / `emitToUser` they use.
`JwtService` is a mocked collaborator; sockets and the socket.io server are
plain fakes (same approach as the discussion gateway spec). The fake server
records every `server.to(channel).emit(message, data)` as an
`{ channel, message, data }` entry, so a handler's whole output can be
asserted at once. The handlers are called directly (no EventEmitter2): the
`@OnEvent` wiring is decoration only. `process.env.JWT_ACCESS_SECRET` is
saved and restored around the tests that read it. `Logger` output is spied
on.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## handleConnection(client)

**Categories**
- Token location
  - handshake.auth.token → used
  - Authorization header (`Bearer …`) → used
  - neither [error] → emits `error { message: 'Unauthorized' }` and
    disconnects, JWT is never verified
- Verification (jwtService.verifyAsync with the access secret)
  - succeeds → payload stored on `client.data.user`
  - fails [error] → emits `error { message: 'Unauthorized' }` and
    disconnects, `client.data.user` stays unset, nothing joined
- Role in the verified payload [if verification succeeds]
  - PARTICIPANT with participantProfileId → joins `user:PARTICIPANT:<id>`
  - ORGANIZER with organizerProfileId → joins `user:ORGANIZER:<id>`
  - currentRole null (profile not created) [single] → joins nothing, the
    connection stays open
  - PARTICIPANT but participantProfileId null [single] → joins nothing,
    connection stays open
- Joining the channel failing [single] (documents current behavior): caught
  by the same handler → `error` emitted and the client disconnected.

---

## handleDisconnect(client)

**Categories**
- Any client [single]: only logs the disconnect; nothing is emitted or
  joined.

---

## handleAttendanceCheckedIn(payload)

**Categories**
- Payload with a check-in (method QR_SCAN or MANUAL; counts)
  - Output to the organizer's channel
    - `attendance:checkedIn` { eventId, attendanceId, registrationId,
      method, checkedInAt, participantSnapshot, counts }
    - `analytics:changed` { eventId, reason: 'attendance' }
  - Output to the participant's channel
    - `ticket:statusChanged` { eventId, registrationId, ticketId, status:
      USED, checkedInAt }
  - Nothing is sent to any other channel; the organizer's and the
    participant's channels are built from their own profile ids and roles.

---

## handleAttendanceUndone(payload)

**Categories**
- Payload of an undo
  - Output to the organizer's channel: `analytics:changed` { reason:
    'attendance' } and `attendance:undone` { eventId, registrationId, counts }
  - Output to the participant's channel: `ticket:statusChanged` { eventId,
    registrationId, ticketId, status: ACTIVE, checkedInAt: null }
  - Nothing is sent to any other channel.

---

## handleRegistrationCreated / handleRegistrationCancelled / handleFeedbackSubmitted

**Categories**
- Event
  - registration.created → `analytics:changed` { eventId, reason:
    'registration' } to the organizer's channel only
  - registration.cancelled → same, reason 'registration'
  - feedback.submitted → same, reason 'feedback'
  - The participant is not notified by any of the three.
- Organizer profile id [single] (documents current behavior): an empty id
  yields no channel, so nothing is emitted and nothing throws.
