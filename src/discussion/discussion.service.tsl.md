// sendMessage

Parameter roomId:
  room existence:
    room exists.                          [property RoomExists]
    room does not exist.                  [error]

Parameter event (derived from roomId, via validateRoomExists):
  organizer ownership:
    caller is the event's organizer.      [property IsOwner] [if RoomExists]
    caller is not the event's organizer.  [if RoomExists]

  participant registration status:
    caller has CONFIRMED registration.    [property IsConfirmedParticipant] [if RoomExists]
    caller has no registration, or CANCELLED registration.  [if RoomExists]

  event writability:
    event is PUBLISHED or ONGOING.                          [property Writable] [if RoomExists]
    event is CONCLUDED, within 72h grace period.             [property Writable] [if RoomExists]
    event is CONCLUDED, past 72h grace period.                [error] [if RoomExists]
    event is CANCELLED.                                       [error] [if RoomExists]

Parameter role:
  caller role:
    role is ORGANIZER.       [property RoleOrganizer]
    role is PARTICIPANT.     [property RoleParticipant]

Parameter access outcome (derived from event + role + profile ids):
  access result:
    caller is authorized (owner or confirmed participant).    [property Authorized] [if RoomExists]
    caller is not authorized (neither owner nor confirmed participant).  [error] [if RoomExists]

Parameter dto.content:
  content validity:
    non-empty, within 2000 characters.        [property ContentValid]
    empty or whitespace-only after trim.      [error]
    exceeds 2000 characters after trim.       [error]

Parameter dto.isAnnouncement:
  announcement flag:
    false or undefined (not an announcement).                          [property NotAnnouncement]
    true, and role is ORGANIZER.                                       [property AnnouncementByOrganizer] [if RoleOrganizer]
    true, and role is PARTICIPANT.                                     [error] [if RoleParticipant]

Parameter participantProfileId:
  presence:
    non-null, matches caller's confirmed registration.   [if RoleParticipant]
    null.                                                [if RoleOrganizer]

Parameter organizerProfileId:
  presence:
    non-null, matches event.organizerId.   [if RoleOrganizer]
    null.                                  [if RoleParticipant]

Environment (test frame combination rules):
  [error] choices are each tested in isolation — one failure per test case, all [property] choices from earlier parameters held valid to isolate the failure point.
  [single] RoomExists=false forces a single test case (all downstream parameters irrelevant once RoomNotFoundException fires).


// getMessage
Parameter roomId:
  room existence:
    room exists.                          [property RoomExists]
    room does not exist.                  [error]

Parameter event / access (derived from roomId + role + profile ids):
  access result:
    caller is authorized (owner or confirmed participant).    [property Authorized] [if RoomExists]
    caller is not authorized.                                  [error] [if RoomExists]

Parameter query.cursor:
  cursor presence:
    cursor provided (explicit).           [property ExplicitCursor]
    cursor not provided.                  [property NoCursor]

Parameter RoomReadStatus (only relevant when NoCursor):
  read status existence:
    a RoomReadStatus exists for this caller+room.       [property HasReadStatus] [if NoCursor]
    no RoomReadStatus exists for this caller+room.      [property NoReadStatus] [if NoCursor]

Parameter query.direction (only relevant when ExplicitCursor):
  direction value:
    direction = 'before'.                 [if ExplicitCursor]
    direction = 'after'.                  [if ExplicitCursor]
    direction omitted (defaults to 'before').   [if ExplicitCursor]

Parameter query.limit:
  limit value:
    limit omitted (uses DEFAULT_PAGE_SIZE).
    limit within MAX_PAGE_SIZE.
    limit exceeds MAX_PAGE_SIZE (clamped).

Resulting call-path branches (for test-case construction):
  ExplicitCursor            → calls getMessagePage(cursor, direction, limit)          [single]
  NoCursor + HasReadStatus  → calls getMessagesFromTimestamp(lastReadAt, limit)        [single]
  NoCursor + NoReadStatus   → falls through, calls getMessagePage(undefined, 'before', limit)  [single]


// markRoomAsRead

Parameter roomId:
  room existence:
    room exists.                          [property RoomExists]
    room does not exist.                  [error]

Parameter access (derived from event + role + profile ids):
  access result:
    caller is authorized.                 [property Authorized] [if RoomExists]
    caller is not authorized.             [error] [if RoomExists]

Parameter role:
  caller role:
    role is ORGANIZER.        [if Authorized]
    role is PARTICIPANT.      [if Authorized]

Resulting call-path branches:
  Authorized, ORGANIZER      → upsertRoomReadStatus keyed on readerOrganizerId    [single]
  Authorized, PARTICIPANT    → upsertRoomReadStatus keyed on readerParticipantId  [single]


// getCreatedDiscussionRooms / getJoinedDiscussionRooms
(structurally identical shape, differing only in which role/CRUD method is used — one spec covers both, parameterized)

Parameter callerType:
  which method under test:
    getCreatedDiscussionRooms (organizer).      [property Organizer]
    getJoinedDiscussionRooms (participant).     [property Participant]

Parameter filter:
  filter value:
    filter = 'active'.          [property FilterActive]
    filter = 'archived'.        [property FilterArchived]
    filter omitted (undefined). [property NoFilter]

Parameter events returned by CRUD:
  discussionRoom presence per event:
    all returned events have a discussionRoom.              [property AllHaveRoom]
    some returned events have discussionRoom = null.        [property SomeMissingRoom]
    CRUD returns empty array (no events at all).             [property EmptyEvents]

Resulting call-path branches:
  FilterActive    → resolveStatusFilter returns ACTIVE_ROOM_STATUSES
  FilterArchived  → resolveStatusFilter returns ARCHIVED_ROOM_STATUSES
  NoFilter        → resolveStatusFilter returns undefined

  SomeMissingRoom → mapEventsToRoomListDtos filters out null-room events before mapping
  EmptyEvents     → returns [] without calling mapToDiscussionRoomListDto at all       [single]


// authorizeRoomJoinAccess
Parameter roomId:
  room existence:
    room exists.                          [property RoomExists]
    room does not exist.                  [error]

Parameter access (derived from event + role + profile ids):
  access result:
    caller is authorized (owner or confirmed participant).    [property Authorized] [if RoomExists]
    caller is not authorized.                                  [error] [if RoomExists]

Environment:
  [error] RoomNotFoundException bubbles from validateRoomExists.        [single]
  [error] RoomAccessDeniedException / RegistrationNotFoundException bubbles from validateRoomAccess.  [single]
  [property Authorized] returns confirmation message, no other side effects.

// findRoomByEventId
Parameter eventId:
  room association:
    a DiscussionRoom exists for this eventId.       [property RoomFound]
    no DiscussionRoom exists for this eventId.      [property RoomNotFound]

Resulting call-path branches:
  RoomFound      → returns { roomId }              [single]
  RoomNotFound   → returns null                     [single]

Note: this is a pure pass-through to discussionCrudService.findRoomByEventId() — no branching logic of its own to test beyond confirming delegation.


// resolveStatusFilter (private helper)
Parameter filter:
  filter value:
    filter = 'active'.       [property → returns ACTIVE_ROOM_STATUSES]
    filter = 'archived'.     [property → returns ARCHIVED_ROOM_STATUSES]
    filter = undefined.      [property → returns undefined]
    filter = any other string (if TS were bypassed — defensive case, likely untestable given the type signature restricts to the two literals + undefined).

// mapEventsToRoomListDtos (private helper)
Parameter events:
  array contents:
    all events have non-null discussionRoom.        [property AllValid]
    mixed — some null discussionRoom, some not.      [property Mixed]
    all events have null discussionRoom.             [property AllNull] → returns []
    empty array input.                                [property EmptyInput] → returns []      [single]

Resulting behavior:
  AllValid  → maps every event, array length unchanged
  Mixed     → filters out null-room entries, only valid ones mapped
  AllNull   → filters everything out, returns []

// mapToDiscussionRoomListDto (private helper)
Parameter event.discussionRoom:
  presence:
    discussionRoom is non-null (guaranteed by caller's prior filter).   [property RoomIdAvailable]
    (discussionRoom null case is NOT expected here — caller always filters first; testing directly would hit a non-null assertion failure, not a graceful path)

Parameter lastMessage (from getLatestMessageForRoom):
  message existence:
    room has at least one message.        [property HasLastMessage]
    room has no messages.                 [property NoLastMessage] → lastMessage: null

Parameter readStatus (from getRoomReadStatus):
  read status existence:
    readStatus exists.       [property HasReadStatus] → unreadCount computed from lastReadAt
    readStatus is null.      [property NoReadStatus] → unreadCount computed from epoch (all messages counted)

Parameter event writability (via checkIsReadOnly):
  writability:
    event currently writable.        [property Writable] → isReadOnly: false
    event currently not writable.    [property NotWritable] → isReadOnly: true

Resulting test-case combinations (cross product of independent categories):
  HasLastMessage × HasReadStatus × Writable
  HasLastMessage × HasReadStatus × NotWritable
  HasLastMessage × NoReadStatus  × Writable
  HasLastMessage × NoReadStatus  × NotWritable
  NoLastMessage  × HasReadStatus × Writable
  NoLastMessage  × HasReadStatus × NotWritable
  NoLastMessage  × NoReadStatus  × Writable
  NoLastMessage  × NoReadStatus  × NotWritable

//checkIsReadOnly (private helper)
Parameter validateRoomWritable outcome:
  outcome:
    validateRoomWritable succeeds (does not throw).    [property Succeeds] → returns false
    validateRoomWritable throws (any RoomReadOnlyException).  [property Throws] → returns true

Note: this method's own logic is trivial (try/catch → boolean); its real branching complexity lives inside validateRoomWritable, already specified separately in DiscussionValidationService.