# DiscussionGateway — Test Specification Language (Category-Partition)

Scope: public/lifecycle handlers and private helpers of `DiscussionGateway`.
`DiscussionService` and `JwtService` are mocked collaborators; their outcome
is modeled as a category on this gateway, same convention as the other
discussion-module TSLs. `Server`/`Socket` are also mocked (socket.io is not
actually opened); `server.to(...)`/`server.in(...)` return further mocked
chainables (`emit`, `fetchSockets`).

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

---

## handleConnection(client)

**Categories**
- Token location
  - present in `handshake.auth.token` → used, the header is ignored even
    when also present
  - absent from `auth`, present in `handshake.headers.authorization` →
    used with the `'Bearer '` prefix stripped
  - absent from both → `extractTokenFromHandshake` throws
    UnauthorizedException, caught here → emits `{ message: 'Unauthorized'
    }` and disconnects [error]
- JWT verification [if a token was found]
  - `jwtService.verifyAsync` resolves → payload stored on
    `client.data.user`
  - `jwtService.verifyAsync` rejects → caught → emits `{ message:
    'Unauthorized' }` and disconnects; `client.data.user` remains unset [error]
- Personal-channel join [if verification succeeds]
  - `payload.currentRole` and the role-matched profile id (participant id
    for PARTICIPANT / organizer id for ORGANIZER) both present → `client.join`
    called with `user:{role}:{profileId}`
  - `payload.currentRole` is null (profile not yet created) → no channel to
    join, `client.join` NOT called [single]
- Side effects on the happy path [single]: no `emit`/`disconnect` call.

---

## handleDisconnect(client)

**Categories**
- [single]: always logs, never throws, no other side effect (no emit, no
  collaborator call).

---

## getPersonalChannel(role, profileId) — private

Exercised indirectly via handleConnection, handleRoomReadUpdated, and
pushChatListUpdate; covered directly here since its null-handling is shared
logic.

**Categories**
- role and profileId both truthy → returns `user:{role}:{profileId}`
- role is null → returns null [single]
- profileId is null → returns null [single]

---

## extractTokenFromHandshake(client) — private

**Categories**
- `auth.token` present → returned as-is, header ignored even when present
- `auth.token` absent, `headers.authorization` present → returns the value
  with the `'Bearer '` prefix stripped
- both absent → throws UnauthorizedException('No token provided') [error]

---

## requireUser(client) — private

**Categories**
- `client.data.user` set → returns it
- `client.data.user` unset → throws UnauthorizedException('Socket not
  authenticated') [error]

---

## handleJoinRoom(client, data)

**Categories**
- Authentication (requireUser)
  - authenticated → proceeds to authorization
  - not authenticated → emitError('room:join', UnauthorizedException)
    called; `client.join` never called [error]
- Role → identity mapping passed to authorizeRoomJoinAccess [if authenticated]
  - ORGANIZER → called with `(roomId, ORGANIZER, null, organizerProfileId)`
  - PARTICIPANT → called with `(roomId, PARTICIPANT, participantProfileId,
    null)`
- Authorization outcome (discussionService.authorizeRoomJoinAccess)
  - resolves → `client.join(roomId)` called, emits `room:joined { roomId }`
  - rejects (RoomNotFoundException / RoomAccessDeniedException /
    RegistrationNotFoundException) → `client.join` NOT called,
    emitError('room:join', error) called with the resolved code/message [error]

---

## handleLeaveRoom(client, data)

**Categories**
- [single]: always calls `client.leave(data.roomId)` — no auth check, no
  branching, no error path.

---

## handleSendMessage(client, data)

**Categories**
- Authentication (requireUser)
  - authenticated → proceeds
  - not authenticated → emitError('message:send', UnauthorizedException);
    `server.to(...)` never called, pushChatListUpdate never triggered [error]
- Role → identity mapping passed to discussionService.sendMessage [if authenticated]
  - ORGANIZER → called with `(roomId, dto, ORGANIZER, null,
    organizerProfileId)`
  - PARTICIPANT → called with `(roomId, dto, PARTICIPANT,
    participantProfileId, null)`
- sendMessage outcome
  - resolves → `server.to(roomId).emit('message:new', message)`, then
    pushChatListUpdate runs
  - rejects (RoomNotFoundException / RoomAccessDeniedException /
    RoomReadOnlyException / MessageContentInvalidException) →
    emitError('message:send', error); `server.to` never called,
    pushChatListUpdate skipped, getRoomMemberIds never called [error]

---

## handleSendAnnouncement(client, data)

**Categories**
- Authentication (requireUser)
  - authenticated → proceeds
  - not authenticated → emitError('announcement:send',
    UnauthorizedException); `server.to(...)` never called [error]
- Role → identity mapping passed to discussionService.sendAnnouncement [if
  authenticated] [single] (identical ORGANIZER/PARTICIPANT mapping to
  handleSendMessage — one representative test suffices here since the
  branch itself is shared code, already exercised on both roles by
  handleSendMessage's own tests)
- sendAnnouncement outcome
  - resolves → emits BOTH `message:new` and `announcement:new` with the
    announcement to `server.to(roomId)` (two distinct events, unlike
    handleSendMessage's single event), then pushChatListUpdate runs
  - rejects (AnnouncementNotAllowedException / RoomNotFoundException /
    RoomAccessDeniedException / RoomReadOnlyException /
    MessageContentInvalidException) → emitError('announcement:send',
    error); no emits, pushChatListUpdate skipped [error]

---

## pushChatListUpdate(roomId, message) — private

Exercised only via handleSendMessage/handleSendAnnouncement's success path.

**Categories**
- getRoomMemberIds(roomId) membership → one personal channel is built for
  the organizer and one for each confirmed participant; all channels are
  non-null in the normal case → `server.to([channels]).emit('chatList:update',
  { roomId, lastMessage: message, lastSerialNumber: message.serialNumber })`
- Payload correctness [single]: `lastMessage` is exactly the message object
  resolved by sendMessage/sendAnnouncement; `lastSerialNumber` is that
  message's `serialNumber`.

---

## handleRoomReadUpdated(payload) — synchronous `@OnEvent` handler

**Categories**
- payload.role
  - PARTICIPANT → channel derived from `payload.participantProfileId`
  - ORGANIZER → channel derived from `payload.organizerProfileId`
- Channel resolution outcome
  - channel resolves (role + matching profile id both present) →
    `server.to(channel).emit('chatList:read', { roomId,
    lastReadSerialNumber })`
  - channel is null (defensive: role or profile id missing) → returns
    early, no emit at all [single]

---

## handleRegistrationCancelled(payload) — async `@OnEvent` handler, self-catching

**Categories**
- findRoomByEventId(payload.eventId) outcome
  - room found → proceeds to forceDisconnectParticipant(room.roomId,
    payload.participantProfileId)
  - room not found (null) → logs a warning and returns;
    forceDisconnectParticipant never called [single]
- Error containment [single]: if findRoomByEventId (or anything
  downstream) throws, the error is caught internally, logged, and does
  NOT propagate — the returned promise still resolves. This is the only
  handler in the gateway that swallows errors instead of emitting to a
  client (there is no client to emit to; it's driven by an internal event).

---

## forceDisconnectParticipant(roomId, participantProfileId) — private

**Categories**
- Sockets found in the room (`server.in(roomId).fetchSockets()`)
  - empty array → returns `{ message: 'No room sockets found.' }`; no
    `emit`/`leave` call on any socket [single]
  - one or more sockets, none match `participantProfileId` → iterates all,
    no `emit`/`leave` called, returns the "no participant found" message
  - the matching socket is found → emits `room:kicked { roomId }` and
    calls `leave(roomId)` on that socket only, returns the "disconnected"
    message, and stops (does not keep checking remaining sockets) [single]
  - multiple sockets, mixed match → only the matching socket receives
    `emit`/`leave`; every other socket is left untouched

---

## resolveErrorCode(error) — private

**Categories** (parameterized — one representative value per branch, no
combination needed)
- RoomNotFoundException → ROOM_NOT_FOUND
- RoomAccessDeniedException → ROOM_ACCESS_DENIED
- RegistrationNotFoundException → REGISTRATION_NOT_FOUND
- RoomReadOnlyException → ROOM_READ_ONLY
- MessageContentInvalidException → MESSAGE_CONTENT_INVALID
- AnnouncementNotAllowedException → ANNOUNCEMENT_NOT_ALLOWED
- UnauthorizedException → UNAUTHORIZED
- an unrecognized `Error` instance → UNKNOWN_ERROR
- a non-`Error` thrown value (e.g. a plain string) → UNKNOWN_ERROR [error]

---

## emitError(client, event, error) — private

**Categories**
- `error instanceof Error` → `message` = `error.message`
- `error` is not an `Error` instance → `message` = the generic fallback
  `'An unexpected error occurred.'` [error]
- `code` is always resolved via resolveErrorCode(error) [single] (already
  covered exhaustively above; here just confirm it's wired into the emitted
  payload alongside `event` and `message`)
