# DiscussionCrudService — Test Specification Language (Category-Partition)

Scope: public methods of `DiscussionCrudService`. `PrismaService` is mocked
(deep mock of the Prisma client); its outcome is modeled as a category on
this service (e.g. "Room exists: yes / no [error]") the same way collaborator
outcomes were modeled for `DiscussionService`. The private helper
`mapToReturnMessageDto` is exercised indirectly through every public method
that returns `ReturnMessageDto`(s), and is also broken out on its own since
its fallback rules are shared logic worth covering directly.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

---

## createMessage(roomId, content, isAnnouncement, senderParticipantId, senderOrganizerId)

**Categories**
- Room existence (claimNextRoomSerialNumber's raw UPDATE...RETURNING, run inside the transaction)
  - room exists → serial number claimed, transaction proceeds
  - room does not exist (UPDATE affects 0 rows) → claimNextRoomSerialNumber
    throws RoomNotFoundException, caught by this method's try/catch, logged,
    and rethrown as SaveMessageException [error]
- isAnnouncement
  - false → persisted as a regular message
  - true → persisted as an announcement
- Sender identity (mutually exclusive per DiscussionService's contract)
  - senderParticipantId set, senderOrganizerId null → tx.message.create
    receives both fields as given; mapped sender.role = PARTICIPANT
  - senderOrganizerId set, senderParticipantId null → mapped sender.role = ORGANIZER
- Participant sender name fallback [if participant sender]
  - nickname present → sender.name = nickname
  - nickname absent, firstName present → sender.name = firstName
  - both absent → sender.name = ''
- Participant/organizer sender imageUrl fallback [single]
  - imageUrl null/undefined on the included profile → sender.imageUrl = ''
- Persistence outcome
  - tx.message.create succeeds → resolves a ReturnMessageDto with the
    generated id, claimed serialNumber, and mapped sender
  - tx.message.create (or the transaction itself) throws for any other
    reason (constraint violation, connection error) [error] [single] →
    caught, logged, rethrown as SaveMessageException
- Ordering constraint [single]: serial number claim and message insert occur
  in the same `$transaction`; assert both are invoked with a roomId match
  (not that they interleave — that's Prisma's job, not this method's).

---

## getPaginatedMessagesByCursor(roomId, cursor, direction, limit)

**Categories**
- direction
  - 'before' (scrolling to older messages) → orderBy `[createdAt desc, id desc]`;
    fetched page reversed before being returned (so output is ascending)
  - 'after' (scrolling to newer messages) → orderBy `[createdAt asc, id asc]`;
    fetched page returned in fetch order
- cursor
  - undefined → no `cursor`/`skip` applied; fetch starts from the natural
    beginning of the ordering
  - provided → `cursor: { id: cursor }, skip: 1` applied, excluding the
    cursor message itself
- Fetched-count vs limit (extra-row probe: `take: limit + 1`)
  - fetched count ≤ limit → no more rows in the queried direction
  - fetched count > limit → extra row present, sliced off, "more in this
    direction" flag set true
- hasMoreOlder / hasMoreNewer derivation [if direction = 'before']
  - hasMoreOlder = (fetched count > limit)
  - hasMoreNewer = !!cursor
- hasMoreOlder / hasMoreNewer derivation [if direction = 'after']
  - hasMoreOlder = !!cursor
  - hasMoreNewer = (fetched count > limit)
- oldestCursor / newestCursor
  - page non-empty → oldestCursor = first message id in the (ascending)
    output, newestCursor = last message id in the output
  - page empty (no messages in range) → oldestCursor = newestCursor =
    `cursor ?? null` [single]
- Message set
  - room has messages in the queried range → each mapped via
    mapToReturnMessageDto, in the direction-appropriate order
  - room has zero messages in range → messages = []
- roomId scoping [single]: query is always scoped to `where: { roomId }` —
  another room's messages must never appear in the result.

---

## getLatestAnnouncements(roomId, limit)

**Categories**
- Result set
  - room has announcements (isAnnouncement = true) at or below `limit` → all
    returned, oldest-first (fetched desc, then reversed)
  - room has more announcements than `limit` → only the latest `limit` are
    returned (regular `take`, before the reverse) [single]
  - room has zero announcements → returns []
- Filtering [single]: only `isAnnouncement: true` messages are included —
  regular messages in the same room, however many, must never appear.
- roomId scoping [single]: scoped to `where: { roomId, isAnnouncement: true }`.

---

## getLatestMessageForRoom(roomId)

**Categories**
- Result
  - room has at least one message (regular or announcement) → returns the
    most recently created one, mapped via mapToReturnMessageDto
  - room has zero messages → returns null
- Ordering [single]: strictly `orderBy: { createdAt: 'desc' }` regardless of
  `isAnnouncement` — a later announcement outranks an earlier regular
  message and vice versa.

---

## upsertLastReadMessage(roomId, role, participantProfileId, organizerProfileId, lastReadMessageId, lastReadSerialNumber)

**Categories**
- role (selects the upsert's `where` composite key)
  - ORGANIZER → keyed on `roomId_readerOrganizerId` using organizerProfileId
  - PARTICIPANT → keyed on `roomId_readerParticipantId` using participantProfileId
- Upsert branch (no direct control in a unit test beyond asserting the
  `create`/`update` payloads passed to prisma; both payloads are always
  constructed and only one takes effect at the DB layer)
  - create payload: readerParticipantId/readerOrganizerId set per role,
    lastReadMessageId defaults to `null` when undefined, lastReadSerialNumber
    defaults to `0` when undefined
  - update payload: fields are spread in conditionally — lastReadMessageId
    key is present only when the argument is not `undefined`; same for
    lastReadSerialNumber [single each]
- lastReadMessageId argument
  - provided → used as given in both create and (conditionally) update payloads
  - undefined → create defaults to null; update payload omits the key entirely
- lastReadSerialNumber argument
  - provided → used as given
  - undefined → create defaults to 0; update payload omits the key entirely
- Persistence outcome
  - upsert succeeds → resolves `{ roomId, lastReadMessageId, lastReadSerialNumber }`
    taken from the prisma result
  - upsert throws (constraint violation, connection error) [error] [single]
    → caught, logged, rethrown as SaveRoomReadStatusException

---

## getRoomReadStatus(roomId, role, participantProfileId, organizerProfileId)

**Categories**
- role (selects the `findUnique` composite key)
  - ORGANIZER → keyed on `roomId_readerOrganizerId`
  - PARTICIPANT → keyed on `roomId_readerParticipantId`
- Record existence
  - record found → returns `{ lastReadMessageId: result.lastReadMessageId }`
    (the field itself may be null — "read while room was empty")
  - record not found → returns `null`

---

## countUnreadMessages(roomId, lastReadMessageId)

**Categories**
- lastReadMessageId
  - `null` → sinceDate = epoch (`new Date(0)`) → counts every message in the room
  - provided, referenced message found → sinceDate = that message's `createdAt`
  - provided, referenced message not found (since deleted) → sinceDate falls
    back to epoch, per the "never under-count" comment [single]
- Count result
  - zero messages created after sinceDate → returns 0
  - N messages created after sinceDate → returns N
- roomId scoping [single]: count is always `where: { roomId, createdAt: { gt: sinceDate } }`.

---

## claimNextRoomSerialNumber(roomId, tx?)

**Categories**
- Room existence (raw `UPDATE ... RETURNING`)
  - room exists → exactly one row returned, resolves the new
    `lastSerialNumber`
  - room does not exist → zero rows returned → throws RoomNotFoundException [error]
- Transaction client parameter
  - tx provided → the raw query runs through the given transaction client
  - tx omitted → falls back to `this.prisma` (getClient's default) [single]
- Sequential increment [single]: two calls for the same room (same client)
  resolve strictly increasing values (N, then N+1).

---

## getMessageSerialNumber(messageId)

**Categories**
- Message existence
  - message found → returns its `serialNumber`
  - message not found → returns `null`

---

## getUnreadStatusBySerialNumber(roomId, role, participantProfileId, organizerProfileId)

**Categories**
- Room existence
  - room found → proceeds to compute unread status
  - room not found → throws RoomNotFoundException [error]
- role (selects the read-status `where` composite key)
  - ORGANIZER → keyed on `roomId_readerOrganizerId`
  - PARTICIPANT → keyed on `roomId_readerParticipantId`
- Read status existence
  - record exists → lastReadSerialNumber = record's `lastReadSerialNumber`
  - no record → lastReadSerialNumber defaults to 0
- unreadCount computation
  - room.lastSerialNumber > lastReadSerialNumber → unreadCount = the
    difference
  - room.lastSerialNumber ≤ lastReadSerialNumber (caught up, or a stale
    read-status ahead of the room) → unreadCount = 0, floored via
    `Math.max(0, …)` [single]
- Concurrency [single]: room lookup and read-status lookup are issued via
  `Promise.all` — assert both are called with the right arguments, not
  ordering.

---

## getParticipantEventsWithRoom(participantProfileId, statusFilter?)

**Categories**
- Registration existence
  - participant has CONFIRMED registrations → returns each registration's
    event (with discussionRoom included)
  - participant has no CONFIRMED registrations → returns []
- Registration status filtering [single]: only `status: CONFIRMED`
  registrations are queried — a CANCELLED registration for the same
  participant/event must never contribute an entry.
- statusFilter
  - undefined → no `event.status` filter applied; all confirmed-registration
    events are returned regardless of event status
  - provided (e.g. ACTIVE_ROOM_STATUSES) → only events whose status is in
    the filter list are returned
- discussionRoom inclusion [single]: each returned event includes its
  `discussionRoom` relation, which may be `null` (filtering roomless events
  out is the caller's responsibility, not this method's).

---

## getOrganizerEventsWithRoom(organizerProfileId, statusFilter?)

**Categories**
- Event existence
  - organizer owns one or more events → returned with `discussionRoom` included
  - organizer owns no events → returns []
- statusFilter
  - undefined → no status filter applied
  - provided → only matching-status events returned
- Ownership scoping [single]: query is always `where: { organizerId }` —
  another organizer's events must never appear.

---

## getRoomMemberIds(roomId)

**Categories**
- Room existence
  - room found → returns `{ organizerProfileId: event.organizerId,
    participantProfileIds: [...] }`
  - room not found → throws RoomNotFoundException [error]
- Confirmed participant filtering [single]: only `eventRegistrations` with
  `status: CONFIRMED` contribute to `participantProfileIds` — a CANCELLED
  registration must be excluded even though the same select scopes to the
  event.
- Participant count
  - event has one or more confirmed registrations → non-empty array, in
    registration order
  - event has zero confirmed registrations → `participantProfileIds: []`

---

## findRoomByEventId(eventId)

**Categories**
- Room existence
  - a DiscussionRoom exists for the event → returns `{ roomId: room.id }`
  - no DiscussionRoom exists for the event → returns `null`

---

## mapToReturnMessageDto(message) — private, exercised via every method above that returns message DTO(s)

**Categories**
- Sender kind
  - `message.senderOrganizerId !== null` → sender built from
    `message.senderOrganizer`, `sender.role = ORGANIZER`
  - `message.senderOrganizerId === null` → sender built from
    `message.senderParticipant`, `sender.role = PARTICIPANT`
- Organizer sender field fallback [if organizer sender] [single]
  - `senderOrganizer.name` present → used as-is
  - `senderOrganizer.name` falsy/undefined → falls back to `''`
  - `senderOrganizer.imageUrl` present/absent → same present/fallback-to-''
    pattern
- Participant sender name fallback [if participant sender]
  - `nickname` present (non-empty) → sender.name = nickname, even when
    firstName is also present (nickname takes priority)
  - `nickname` absent/empty, `firstName` present → sender.name = firstName
  - both `nickname` and `firstName` absent/empty → sender.name = `''`
- Participant sender imageUrl fallback [if participant sender] [single]
  - `imageUrl` present/absent → same present/fallback-to-'' pattern
- Passthrough fields [single]: `id`, `content`, `isAnnouncement`,
  `createdAt`, `serialNumber` are copied through unchanged from the input row.
