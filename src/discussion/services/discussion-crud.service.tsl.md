# TSL Specifications — Discussion Module

Category-Partition style TSL specs for `DiscussionCrudService` and `DiscussionValidationService`, following the same convention used for `DiscussionService`: `[property X]` tags a choice that later categories can reference via `[if X]`; `[error]` marks a choice expected to throw/produce a failure path; `[single]` marks a choice that should collapse to exactly one test frame regardless of combination with other categories.

---

## DiscussionCrudService

### `createMessage(roomId, content, isAnnouncement, senderParticipantId, senderOrganizerId)`

```
Parameter sender identity (caller-supplied combination):
  which id is set:
    senderParticipantId set, senderOrganizerId null.        [property FromParticipant]
    senderOrganizerId set, senderParticipantId null.        [property FromOrganizer]
    (both null / both set — not expected from caller per convention; not a validated case at this layer)

Parameter isAnnouncement:
  flag value:
    true.        [property Announcement]
    false.       [property NotAnnouncement]

Parameter prisma.message.create outcome:
  result:
    succeeds.                    [property CreateSucceeds] → returns mapped ReturnMessageDto
    throws (DB error).           [error SaveMessageException] [single]

Resulting test frames:
  FromParticipant + NotAnnouncement + CreateSucceeds   → sender.role = PARTICIPANT, mapped correctly
  FromOrganizer + Announcement + CreateSucceeds        → sender.role = ORGANIZER, isAnnouncement: true
  CreateSucceeds, participant sender with nickname present     → sender.name = nickname (preferred over firstName)
  CreateSucceeds, participant sender with nickname null/empty  → sender.name = firstName (fallback)
  CreateSucceeds, participant sender with both nickname and firstName empty  → sender.name = ''
  CreateSucceeds, organizer sender with imageUrl null          → sender.imageUrl = ''
  any sender combination + CreateThrows                → throws SaveMessageException, logs error   [single]
```

---

### `getMessagePage(roomId, cursor, direction, limit)`

```
Parameter direction:
  value:
    'before'.        [property Before]
    'after'.         [property After]

Parameter cursor:
  presence:
    cursor provided (valid existing message id).        [property HasCursor]
    cursor undefined.                                     [property NoCursor]

Parameter limit:
  value:
    undefined.                       [property DefaultLimit] → take = DEFAULT_PAGE_SIZE
    provided, <= MAX_PAGE_SIZE.      [property CustomLimit]
    provided, > MAX_PAGE_SIZE.       [property ClampedLimit] → take = MAX_PAGE_SIZE

Parameter row count returned by Prisma (relative to take):
  count:
    rows returned <= take (no extra row).        [property NoMorePages] → hasMore(queried direction) = false
    rows returned == take + 1 (extra row present).   [property MorePages] → hasMore(queried direction) = true, sliced to take

Parameter row count == 0 (empty result):
  emptiness:
    page has 0 rows after slicing.        [property EmptyPage] → oldestCursor/newestCursor fall back to input cursor

Resulting test frames (cross-product of direction × cursor × page-fullness):
  Before + HasCursor + MorePages       → hasMoreOlder=true, hasMoreNewer=true, page reversed to ascending
  Before + HasCursor + NoMorePages     → hasMoreOlder=false, hasMoreNewer=true
  Before + NoCursor + MorePages        → hasMoreOlder=true, hasMoreNewer=false (initial "latest page" load)
  Before + NoCursor + NoMorePages      → hasMoreOlder=false, hasMoreNewer=false (room has <= take messages total)
  After + HasCursor + MorePages        → hasMoreOlder=true, hasMoreNewer=true
  After + HasCursor + NoMorePages      → hasMoreOlder=true, hasMoreNewer=false
  After + NoCursor + MorePages         → hasMoreOlder=false, hasMoreNewer=true  (edge case: after with no cursor)
  After + NoCursor + NoMorePages       → hasMoreOlder=false, hasMoreNewer=false
  Before + HasCursor + EmptyPage       → oldestCursor = newestCursor = input cursor (fallback)   [single]
  After + HasCursor + EmptyPage        → oldestCursor = newestCursor = input cursor (fallback)   [single]
  DefaultLimit / CustomLimit / ClampedLimit  → verify `take` value used in the Prisma call matches expectation, independent of direction/cursor
```

---

### `getMessagesFromTimestamp(roomId, lastReadAt, limit)`

```
Parameter anchorMessage lookup (message at-or-before lastReadAt):
  existence:
    a message exists with createdAt <= lastReadAt.        [property AnchorFound] → anchorTime = that message's createdAt
    no message exists with createdAt <= lastReadAt (room empty or all messages after lastReadAt).   [property NoAnchor] → anchorTime = epoch(0)

Parameter messages with createdAt >= anchorTime:
  row count relative to take:
    rows <= take.            [property NoMoreNewer] → hasMoreNewer = false
    rows == take + 1.        [property MoreNewer] → hasMoreNewer = true, sliced

Parameter page emptiness:
  emptiness:
    page has 0 rows (only possible if NoAnchor and room is genuinely empty).   [property EmptyResult] → oldestCursor/newestCursor = null

Resulting test frames:
  AnchorFound + NoMoreNewer      → returns [anchorMessage, ...any newer], hasMoreOlder=true (always), hasMoreNewer=false
  AnchorFound + MoreNewer        → returns take messages starting at anchor, hasMoreNewer=true
  NoAnchor + room has messages   → anchorTime=epoch, returns from the very beginning of the room
  NoAnchor + room empty          → EmptyResult, messages=[], cursors=null, hasMoreOlder=true (note: potentially misleading when room is genuinely empty — worth flagging as a known quirk, not yet addressed)
```

---

### `getLatestMessageForRoom(roomId)`

```
Parameter room message count:
  existence:
    room has at least one message.        [property HasMessages] → returns mapped latest ReturnMessageDto
    room has zero messages.               [property NoMessages] → returns null

  [single] each — no further parameter combination needed, this is a simple existence check.
```

---

### `upsertRoomReadStatus(roomId, role, participantProfileId, organizerProfileId)`

```
Parameter role:
  caller role:
    ORGANIZER.        [property RoleOrganizer] → keyed on roomId_readerOrganizerId
    PARTICIPANT.      [property RoleParticipant] → keyed on roomId_readerParticipantId

Parameter existing RoomReadStatus row:
  existence:
    a row already exists for this (roomId, reader).        [property RowExists] → upsert takes update branch, lastReadAt refreshed
    no row exists yet.                                       [property NoRow] → upsert takes create branch

Parameter prisma.roomReadStatus.upsert outcome:
  result:
    succeeds.        [property UpsertSucceeds] → returns { roomId, lastReadAt }
    throws.          [error SaveRoomReadStatusException] [single]

Resulting test frames:
  RoleOrganizer + RowExists + UpsertSucceeds     → update path, correct key used
  RoleOrganizer + NoRow + UpsertSucceeds         → create path, readerOrganizerId set, readerParticipantId null
  RoleParticipant + RowExists + UpsertSucceeds   → update path, correct key used
  RoleParticipant + NoRow + UpsertSucceeds       → create path, readerParticipantId set, readerOrganizerId null
  any role/row combination + UpsertThrows        → throws SaveRoomReadStatusException, logs error   [single]
```

---

### `getRoomReadStatus(roomId, role, participantProfileId, organizerProfileId)`

```
Parameter role:
  caller role:
    ORGANIZER.        [property RoleOrganizer] → queries by roomId_readerOrganizerId
    PARTICIPANT.      [property RoleParticipant] → queries by roomId_readerParticipantId

Parameter query result:
  existence:
    a matching row is found.        [property Found] → returns { lastReadAt }
    no matching row is found.       [property NotFound] → returns null

Resulting test frames:
  RoleOrganizer + Found        → returns lastReadAt, correct key used in query
  RoleOrganizer + NotFound     → returns null
  RoleParticipant + Found      → returns lastReadAt, correct key used in query
  RoleParticipant + NotFound   → returns null
```

---

### `countUnreadMessages(roomId, sinceDate)`

```
Parameter message count where createdAt > sinceDate:
  count value:
    count > 0.        [property HasUnread] → returns that number
    count == 0.        [property NoUnread] → returns 0

  [single] each — straightforward pass-through of prisma.message.count() result.
```

---

### `getParticipantEventsWithRoom(participantProfileId, statusFilter)`

```
Parameter statusFilter:
  presence:
    statusFilter provided (non-empty array).        [property HasFilter] → where clause includes event.status filter
    statusFilter undefined.                           [property NoFilter] → no status filter applied

Parameter registrations found:
  result set:
    one or more CONFIRMED registrations found.        [property HasRegistrations] → returns mapped .event array
    zero registrations found.                          [property NoRegistrations] → returns []

Parameter registration.event.discussionRoom (per returned registration):
  presence:
    discussionRoom is non-null.        [property RoomPresent]
    discussionRoom is null.            [property RoomAbsent] (defensive case — should not occur post-Feature-#5, but the method itself doesn't filter it; filtering happens one layer up in the service)

Resulting test frames:
  HasFilter + HasRegistrations          → query includes status filter, returns extracted events
  NoFilter + HasRegistrations           → query has no status filter, returns extracted events
  HasFilter or NoFilter + NoRegistrations  → returns []                          [single, filter-independent]
  HasRegistrations + mix of RoomPresent/RoomAbsent  → method returns both as-is, unfiltered (confirms this method does NOT filter — that's the service's job)
```

---

### `getOrganizerEventsWithRoom(organizerProfileId, statusFilter)`

```
Parameter statusFilter:
  presence:
    statusFilter provided.        [property HasFilter]
    statusFilter undefined.       [property NoFilter]

Parameter events found:
  result set:
    one or more events found.        [property HasEvents] → returns events with discussionRoom included
    zero events found.                [property NoEvents] → returns []

Resulting test frames:
  HasFilter + HasEvents      → query includes status filter
  NoFilter + HasEvents       → query has no status filter
  either + NoEvents          → returns []    [single, filter-independent]
```

---

### `findRoomByEventId(eventId)`

```
Parameter room association:
  existence:
    a DiscussionRoom exists for this eventId.        [property Found] → returns { roomId }
    no DiscussionRoom exists for this eventId.       [property NotFound] → returns null

  [single] each — simple existence check, used by DiscussionGateway for event-driven kick logic.
```

---

### `mapToReturnMessageDto(message)` (private)

```
Parameter sender identity fields on the raw message:
  which sender field is set:
    senderOrganizerId non-null.        [property OrganizerSender] → sender.role = ORGANIZER, name from senderOrganizer.name
    senderOrganizerId null (implies senderParticipantId set).     [property ParticipantSender]

Parameter senderParticipant.nickname (relevant when ParticipantSender):
  presence:
    nickname present, non-empty.        [property HasNickname] [if ParticipantSender] → sender.name = nickname
    nickname null or empty string.       [property NoNickname] [if ParticipantSender] → sender.name = firstName

Parameter senderOrganizer.imageUrl / senderParticipant.imageUrl:
  presence:
    imageUrl present.        → sender.imageUrl = that value
    imageUrl null/undefined. → sender.imageUrl = ''

Resulting test frames:
  OrganizerSender + imageUrl present        → sender = { role: ORGANIZER, name, imageUrl }
  OrganizerSender + imageUrl null           → sender.imageUrl = ''
  ParticipantSender + HasNickname           → sender.name = nickname
  ParticipantSender + NoNickname            → sender.name = firstName
  ParticipantSender + both nickname and firstName empty  → sender.name = ''
  ParticipantSender + imageUrl null          → sender.imageUrl = ''
```