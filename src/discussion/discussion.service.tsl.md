# DiscussionService — Test Specification Language (Category-Partition)

Scope: public methods of `DiscussionService`. Collaborators
(`DiscussionValidationService`, `DiscussionCrudService`, `EventEmitter2`) are
mocked; their outcome is modeled as a category on this service (e.g. "Room
exists: yes / no [error]") rather than re-deriving their own internal logic.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

---

## sendMessage(roomId, dto, role, participantProfileId, organizerProfileId)

**Categories for parameter `role` (drives which sender id is used)**
- role
  - PARTICIPANT
  - ORGANIZER

**Categories for collaborator outcomes**
- Room existence (validateRoomExists)
  - room exists
  - room does not exist [error]
- Room access (validateRoomAccess) [if room exists]
  - access granted
  - access denied [error]
- Room writability (validateRoomWritable) [if access granted]
  - room writable
  - room read-only [error]
- Message content (validateMessageContent / dto.content) [if room writable]
  - non-empty, within max length
  - empty / whitespace-only [error]
  - exceeds max length [error]
- Content trimming [single] [if non-empty content]
  - content has leading/trailing whitespace → trimmed content passed to createMessage
- Sender id resolution [if role = PARTICIPANT]
  - participantProfileId provided → used as senderParticipantId, senderOrganizerId = null
- Sender id resolution [if role = ORGANIZER]
  - organizerProfileId provided → used as senderOrganizerId, senderParticipantId = null
- CRUD createMessage outcome [if content valid]
  - succeeds → returns ReturnMessageDto
  - throws (e.g. SaveMessageException) [error] [single]

**Constraints**
- [error] categories for room existence / room access / room writability / message content
  are mutually exclusive short-circuits — only test one failure at a time,
  each verifying downstream collaborators are NOT called.
- isAnnouncement flag passed to createMessage is always `false` for this method [single].

---

## sendAnnouncement(roomId, dto, role, participantProfileId, organizerProfileId)

**Categories**
- Sender role check (validateAnnouncementSenderRole) — evaluated first, before room lookup
  - role = ORGANIZER → allowed
  - role = PARTICIPANT (or any non-ORGANIZER) → not allowed [error]
- Room existence [if role = ORGANIZER]
  - room exists
  - room does not exist [error]
- Room access [if room exists]
  - access granted
  - access denied [error]
- Room writability [if access granted]
  - room writable
  - room read-only [error]
- Message content [if room writable]
  - non-empty, within max length
  - empty / whitespace-only [error]
  - exceeds max length [error]
- Content trimming [single] [if non-empty content]
  - content has leading/trailing whitespace → trimmed content passed to createMessage
- CRUD createMessage outcome [if content valid]
  - succeeds → returns ReturnMessageDto
  - throws [error] [single]

**Constraints**
- Role check happens before any room lookup — [single] test must assert
  validateRoomExists is never called when role is not ORGANIZER.
- isAnnouncement flag is always `true`, senderParticipantId is always `null`,
  senderOrganizerId = organizerProfileId [single].

---

## getMessages(roomId, query, role, participantProfileId, organizerProfileId)

**Categories**
- Room existence
  - room exists
  - room does not exist [error]
- Room access [if room exists]
  - access granted
  - access denied [error]
- query.limit [if access granted]
  - undefined → defaults to DEFAULT_MESSAGE_PAGE_SIZE (25)
  - below MAX_MESSAGE_PAGE_SIZE (e.g. 10) → used as-is
  - at or above MAX_MESSAGE_PAGE_SIZE (e.g. 25, 100) → capped to MAX_MESSAGE_PAGE_SIZE (25)
- query.cursor
  - undefined → attempt resume-from-last-read path
  - provided → skip read-status lookup, paginate directly by given cursor
- Read status lookup outcome [if cursor undefined]
  - no read status record (never read) → falls through to plain latest-page fetch with cursor=undefined
  - read status exists but lastReadMessageId is null → falls through to plain latest-page fetch
  - read status exists with lastReadMessageId → fetch paginated messages 'after' that message, pageSize (bypasses query.direction)
- query.direction [if cursor provided, or fallback path taken]
  - undefined → defaults to 'before'
  - 'before'
  - 'after'
- CRUD getPaginatedMessagesByCursor outcome [single]
  - returns a ReturnMessagePageDto (mapped through as-is)

**Constraints**
- [if cursor provided] read-status lookup (getRoomReadStatus) must NOT be called [single].
- [if cursor undefined AND lastReadMessageId present] the resume fetch uses
  direction 'after' unconditionally, ignoring query.direction [single].

---

## getAnnouncements(roomId, role, participantProfileId, organizerProfileId)

**Categories**
- Room existence
  - room exists
  - room does not exist [error]
- Room access [if room exists]
  - access granted
  - access denied [error]
- CRUD getLatestAnnouncements outcome [if access granted] [single]
  - returns array of ReturnMessageDto (possibly empty)

**Constraints**
- limit passed to getLatestAnnouncements is always MAX_ANNOUNCEMENT_COUNT (15) [single].

---

## updateLastReadMessage(roomId, role, participantProfileId, organizerProfileId, lastReadMessageId)

**Categories**
- Room existence
  - room exists
  - room does not exist [error]
- Room access [if room exists]
  - access granted
  - access denied [error]
- lastReadMessageId [if access granted]
  - undefined → skip serial-number lookup, lastReadSerialNumber = undefined
  - provided, message found → lastReadSerialNumber = looked-up value
  - provided, message not found (getMessageSerialNumber returns null) → lastReadSerialNumber = undefined
- CRUD upsertLastReadMessage outcome
  - succeeds → returns ReturnRoomReadStatusDto
  - throws (e.g. SaveRoomReadStatusException) [error] [single]
- Event emission [single] [if upsert succeeds]
  - emits 'room.read-updated' with { roomId, role, participantProfileId, organizerProfileId, lastReadSerialNumber } — lastReadSerialNumber defaults to 0 when undefined

**Constraints**
- [if lastReadMessageId undefined] getMessageSerialNumber must NOT be called [single].
- Event is emitted only after a successful upsert, never on upsert failure [single].

---

## getCreatedDiscussionRooms(organizerProfileId, filter?)

**Categories**
- filter
  - undefined → statusFilter = undefined (no status filter applied)
  - 'active' → statusFilter = ACTIVE_ROOM_STATUSES
  - 'archived' → statusFilter = ARCHIVED_ROOM_STATUSES
- CRUD getOrganizerEventsWithRoom result
  - empty list → returns empty array
  - events with discussionRoom = null → filtered out, excluded from result
  - events with a discussionRoom → mapped to ReturnDiscussionRoomListDto
- Per-event mapping details [if at least one event with discussionRoom] [single]
  - lastMessage present vs null (getLatestMessageForRoom)
  - unreadCount / lastReadSerialNumber from getUnreadStatusBySerialNumber
  - isReadOnly = false when validateRoomWritable does not throw
  - isReadOnly = true when validateRoomWritable throws
  - event.bannerUrl null/undefined → mapped to '' 

**Constraints**
- Role passed downstream for read-status/mapping is always Role.ORGANIZER,
  participantProfileId = null, organizerProfileId = the given id [single].

---

## getJoinedDiscussionRooms(participantProfileId, filter?)

**Categories**
- filter
  - undefined → statusFilter = undefined
  - 'active' → statusFilter = ACTIVE_ROOM_STATUSES
  - 'archived' → statusFilter = ARCHIVED_ROOM_STATUSES
- CRUD getParticipantEventsWithRoom result
  - empty list → returns empty array
  - events with discussionRoom = null → filtered out
  - events with a discussionRoom → mapped to ReturnDiscussionRoomListDto
- Per-event mapping details [if at least one event with discussionRoom] [single]
  - (same as getCreatedDiscussionRooms — isReadOnly, lastMessage, unreadCount, bannerUrl fallback)

**Constraints**
- Role passed downstream is always Role.PARTICIPANT, organizerProfileId =
  null, participantProfileId = the given id [single].

---

## authorizeRoomJoinAccess(roomId, role, participantProfileId, organizerProfileId)

**Categories**
- Room existence
  - room exists
  - room does not exist [error]
- Room access [if room exists]
  - access granted → returns { message } from validateRoomAccess
  - access denied [error]

---

## findRoomByEventId(eventId)

**Categories**
- CRUD findRoomByEventId result [single]
  - room found → returns { roomId }
  - room not found → returns null

---

## getRoomMemberIds(roomId)

**Categories**
- CRUD getRoomMemberIds result [single]
  - room found → returns { organizerProfileId, participantProfileIds }
  - room not found → throws RoomNotFoundException [error]
  - participantProfileIds empty (no confirmed registrations) → returns empty array
