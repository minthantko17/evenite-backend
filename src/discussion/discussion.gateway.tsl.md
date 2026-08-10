## DiscussionGateway

Note: this is a gateway, not pure business logic — several methods interact with the live `Socket`/`Server` objects (mocked in tests) rather than pure data transforms. Categories here reflect connection/auth state, delegated-service outcomes, and error-routing behavior rather than deep domain branching (that logic is already specified above, in `DiscussionService`/`DiscussionValidationService`).

### `handleConnection(client: Socket)`

```
Parameter token extraction (via extractTokenFromHandshake):
  source:
    token present in handshake.auth.token.                    [property TokenInAuth]
    token present in handshake.headers.authorization (Bearer).  [property TokenInHeader]
    no token in either location.                                [error UnauthorizedException, "No token provided"] [single]

Parameter jwtService.verifyAsync outcome (relevant when a token was found):
  result:
    verifies successfully, returns JwtAccessPayload.        [property VerifySucceeds] [if TokenInAuth or TokenInHeader]
    throws (expired, malformed, wrong secret).                [property VerifyFails] [if TokenInAuth or TokenInHeader]

Resulting test frames:
  TokenInAuth + VerifySucceeds       → client.data.user set, connection logged, no disconnect     [single]
  TokenInHeader + VerifySucceeds     → same as above, confirms both extraction paths work          [single]
  no token                            → emits 'error', calls client.disconnect()                     [single]
  token present + VerifyFails         → emits 'error', calls client.disconnect(), client.data.user NOT set  [single]
```

---

### `extractTokenFromHandshake(client: Socket)` (private)

```
Parameter handshake.auth?.token:
  presence:
    present, non-empty string.        [property AuthTokenPresent] → returned directly
    absent / undefined.               [property AuthTokenAbsent]

Parameter handshake.headers?.authorization (relevant when AuthTokenAbsent):
  presence:
    present, "Bearer <token>" format.        [property HeaderPresent] [if AuthTokenAbsent] → token extracted after stripping "Bearer "
    absent.                                    [property HeaderAbsent] [if AuthTokenAbsent]

Resulting test frames:
  AuthTokenPresent                              → returns auth.token, header ignored     [single]
  AuthTokenAbsent + HeaderPresent                → returns stripped header token          [single]
  AuthTokenAbsent + HeaderAbsent                 → throws UnauthorizedException            [single]
```

---

### `requireUser(client: Socket)` (private)

```
Parameter client.data.user:
  presence:
    set (from a prior successful handleConnection).        [property UserSet] → returns the payload
    unset / undefined.                                       [error UnauthorizedException, "Socket not authenticated"] [single]
```

---

### `handleJoinRoom(client, data)`

```
Parameter requireUser outcome:
  result:
    client is authenticated.        [property Authenticated]
    client is not authenticated.    [error] [if not Authenticated] → caught, routed through emitError

Parameter user.currentRole (relevant when Authenticated):
  role:
    ORGANIZER.        [property RoleOrganizer] [if Authenticated] → passes organizerProfileId, participantProfileId=null
    PARTICIPANT.       [property RoleParticipant] [if Authenticated] → passes participantProfileId, organizerProfileId=null

Parameter discussionService.authorizeRoomJoinAccess outcome (relevant when Authenticated):
  result:
    resolves successfully.        [property AuthorizeSucceeds] [if Authenticated]
    throws (RoomNotFoundException / RoomAccessDeniedException / RegistrationNotFoundException).   [property AuthorizeFails] [if Authenticated]

Resulting test frames:
  not Authenticated                                    → emitError called with 'room:join', UNAUTHORIZED code   [single]
  RoleOrganizer + AuthorizeSucceeds                     → client.join called, emits 'room:joined' with roomId    [single]
  RoleParticipant + AuthorizeSucceeds                   → client.join called, emits 'room:joined' with roomId    [single]
  RoleOrganizer or RoleParticipant + AuthorizeFails      → client.join NOT called, emitError called with 'room:join', resolved error code   [single per exception type — see resolveErrorCode below]
```

---

### `handleLeaveRoom(client, data)`

```
Parameter client.leave outcome:
  result:
    client was in the room, successfully leaves.        [property WasInRoom]
    client was not in the room (leave is a no-op).       [property NotInRoom]

  [single] each. No try/catch in this handler — both cases simply resolve; nothing to assert beyond "client.leave was called with data.roomId".
```

---

### `handleSendMessage(client, data)`

```
Parameter requireUser outcome:
  result:
    client is authenticated.        [property Authenticated]
    client is not authenticated.    [error] [if not Authenticated] → routed through emitError

Parameter user.currentRole (relevant when Authenticated):
  role:
    ORGANIZER.        [property RoleOrganizer] [if Authenticated]
    PARTICIPANT.       [property RoleParticipant] [if Authenticated]

Parameter discussionService.sendMessage outcome (relevant when Authenticated):
  result:
    resolves with ReturnMessageDto.        [property SendSucceeds] [if Authenticated]
    throws (any of the exceptions sendMessage can produce — see DiscussionService spec).   [property SendFails] [if Authenticated]

Resulting test frames:
  not Authenticated                             → emitError('message:send', UNAUTHORIZED), server.to(...).emit NOT called   [single]
  RoleOrganizer + SendSucceeds                   → server.to(data.roomId).emit('message:new', message) called with the returned DTO   [single]
  RoleParticipant + SendSucceeds                 → same, confirms role-branch produces correct profile id passed through   [single]
  RoleOrganizer or RoleParticipant + SendFails    → server.to(...).emit NOT called, emitError('message:send', <resolved code>) called   [single per exception type]
```

---

### `handleRegistrationCancelled(payload)`

```
Parameter discussionService.findRoomByEventId outcome:
  result:
    a room is found for payload.eventId.        [property RoomFound] → proceeds to forceDisconnectParticipant
    no room found.                                [property RoomNotFound] → returns early, no further action   [single]

Resulting test frames:
  RoomFound        → forceDisconnectParticipant called with (room.roomId, payload.participantProfileId), info logged   [single]
  RoomNotFound     → forceDisconnectParticipant NOT called, method returns silently   [single]
```

---

### `forceDisconnectParticipant(roomId, participantProfileId)` (private)

```
Parameter server.in(roomId).fetchSockets() result:
  socket set:
    empty (no one connected to this room).        [property NoSockets] → loop body never executes   [single]
    one or more sockets connected.                  [property HasSockets]

Parameter each socket's data.user?.participantProfileId (relevant when HasSockets):
  match:
    matches the target participantProfileId.        [property Matches] [if HasSockets] → emits 'room:kicked', calls .leave(roomId)
    does not match (a different participant/organizer connected to the same room).   [property NoMatch] [if HasSockets] → skipped, no action taken on that socket

Resulting test frames:
  NoSockets                                     → no emit, no leave calls at all                                    [single]
  HasSockets, single socket, Matches             → that socket: emit('room:kicked', {roomId}) + leave(roomId) called   [single]
  HasSockets, single socket, NoMatch             → that socket: neither emit nor leave called                        [single]
  HasSockets, multiple sockets, mixed match       → only matching sockets receive emit+leave; non-matching untouched  (confirms per-socket filtering, not room-wide broadcast)
```

---

### `resolveErrorCode(error: unknown)` (private)

```
Parameter error instance type:
  type:
    RoomNotFoundException.               [property] → ROOM_NOT_FOUND
    RoomAccessDeniedException.           [property] → ROOM_ACCESS_DENIED
    RegistrationNotFoundException.       [property] → REGISTRATION_NOT_FOUND
    RoomReadOnlyException.               [property] → ROOM_READ_ONLY
    MessageContentInvalidException.      [property] → MESSAGE_CONTENT_INVALID
    AnnouncementNotAllowedException.     [property] → ANNOUNCEMENT_NOT_ALLOWED
    UnauthorizedException.               [property] → UNAUTHORIZED
    any other Error subtype, or non-Error thrown value (string, plain object, etc.).   [property] → UNKNOWN_ERROR

  [single] each — this is a pure instanceof-chain mapping; one test case per branch is sufficient, no combination needed with other parameters. Note the chain is order-dependent only if exception classes share inheritance (they don't here — each extends a distinct NestJS HTTP exception base), so branch order shouldn't itself need separate testing.
```

---

### `emitError(client, event, error)` (private)

```
Parameter error type (for message extraction):
  type:
    error is an instance of Error (has .message).        [property IsError] → message = error.message
    error is not an Error instance (thrown string, plain object, undefined).   [property NotError] → message = 'An unexpected error occurred.'

Resulting test frames:
  IsError      → client.emit('error', { event, code: <resolved>, message: error.message })       [single]
  NotError     → client.emit('error', { event, code: <resolved>, message: 'An unexpected error occurred.' })   [single]

Note: `code` resolution is fully covered by resolveErrorCode's own spec above; these two frames only need to vary the message-extraction branch, combined with any one representative error type to confirm the whole emitted payload shape is correct.
```