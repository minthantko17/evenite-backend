# Test Case Reference Format

## Test Case Information

TEST-CASE-ID: UT-6-028 / UT-6-029 / UT-6-030 / UT-6-031 / UT-6-032 / UT-6-033 / UT-6-034 / UT-6-035 / UT-ET / UT-RU

    handleConnection(client: Socket): Promise < void >

    handleDisconnect(client: Socket): void

    extractTokenFromHandshake(client: Socket): string   // private

    requireUser(client: Socket): JwtAccessPayload   // private

    handleJoinRoom(
      client: Socket,
      data: { roomId: string },
    ): Promise < void >

    handleLeaveRoom(
      client: Socket,
      data: { roomId: string },
    ): Promise < void >

    handleSendMessage(
      client: Socket,
      data: { roomId: string, dto: CreateMessageDto },
    ): Promise < void >

    handleRegistrationCancelled(
      payload: { eventId: string, participantProfileId: string },
    ): Promise < void >

    forceDisconnectParticipant(
      roomId: string,
      participantProfileId: string,
    ): Promise < void >   // private

    resolveErrorCode(error: unknown): DiscussionErrorCode   // private

    emitError(client: Socket, event: string, error: unknown): void   // private

**Tester:** Min Thant Ko

**Date:** 16-08-2026

## Test Cases

### handleConnection — UT-6-028

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-028-01 | Token present in `handshake.auth` and verification succeeds — `client.data.user` is set, no disconnect | client: mock socket with `handshake.auth.token: 'valid-token'`<br><br>Setup: jwtService.verifyAsync mocked to resolve buildPayload() | client.data.user equals payload<br><br>client.disconnect.mock.calls.length: 0<br>client.emit.mock.calls.length: 0 | client.data.user equals payload<br><br>client.disconnect.mock.calls.length: 0<br>client.emit.mock.calls.length: 0 | **Pass** |
| UT-6-028-02 | Token present in `handshake.headers.authorization` and verification succeeds — confirms header extraction path also works | client: mock socket with `handshake.headers.authorization: 'Bearer header-token'`<br><br>Setup: jwtService.verifyAsync mocked to resolve buildPayload() | client.data.user equals payload<br><br>jwtService.verifyAsync called with:<br>('header-token', { secret: expect.anything() }) | client.data.user equals payload<br><br>jwtService.verifyAsync called with:<br>('header-token', { secret: expect.anything() }) | **Pass** |
| UT-6-028-03 | No token in either location — emits error and disconnects | client: mock socket with `handshake.auth: {}`, `handshake.headers: {}` | client.emit called with:<br>('error', { message: 'Unauthorized' })<br><br>client.disconnect called<br>jwtService.verifyAsync.mock.calls.length: 0 | client.emit called with:<br>('error', { message: 'Unauthorized' })<br><br>client.disconnect called<br>jwtService.verifyAsync.mock.calls.length: 0 | **Pass** |
| UT-6-028-04 | Token present but verification fails — emits error, disconnects, `client.data.user` remains unset | client: mock socket with `handshake.auth.token: 'invalid-token'`<br><br>Setup: jwtService.verifyAsync mocked to reject with Error('bad token') | client.emit called with:<br>('error', { message: 'Unauthorized' })<br><br>client.disconnect called<br>client.data.user: undefined | client.emit called with:<br>('error', { message: 'Unauthorized' })<br><br>client.disconnect called<br>client.data.user: undefined | **Pass** |

### handleDisconnect

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-DC-01 | Logs the disconnection without throwing | client: mock socket (default) | Does not throw | Does not throw | **Pass** |

### extractTokenFromHandshake (private) — UT-ET

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-ET-01 | `auth.token` present — returns it, ignoring the header even when also present | client: mock socket with `handshake.auth.token: 'auth-token'`, `handshake.headers.authorization: 'Bearer header-token'` | result: 'auth-token' | result: 'auth-token' | **Pass** |
| UT-ET-02 | `auth.token` absent, `headers.authorization` present — returns the stripped ("Bearer " removed) header token | client: mock socket with `handshake.auth: {}`, `handshake.headers.authorization: 'Bearer header-token'` | result: 'header-token' | result: 'header-token' | **Pass** |
| UT-ET-03 | `auth.token` absent, header absent — throws UnauthorizedException | client: mock socket with `handshake.auth: {}`, `handshake.headers: {}` | Throws UnauthorizedException with message "No token provided" | Throws UnauthorizedException with message "No token provided" | **Pass** |

### requireUser (private) — UT-RU

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-RU-01 | `client.data.user` is set — returns the payload | client: mock socket with `data.user: payload` | result equals payload | result equals payload | **Pass** |
| UT-RU-02 | `client.data.user` is unset — throws UnauthorizedException | client: mock socket with `data: {}` | Throws UnauthorizedException with message "Socket not authenticated" | Throws UnauthorizedException with message "Socket not authenticated" | **Pass** |

### handleJoinRoom — UT-6-029

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-029-01 | Not authenticated — emitError called with room:join / UNAUTHORIZED code, join is skipped | client: mock socket with `data: {}`<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' } | client.emit called with:<br>('error', { event: 'room:join', code: UNAUTHORIZED, message: 'Socket not authenticated' })<br><br>client.join.mock.calls.length: 0 | client.emit called with:<br>('error', { event: 'room:join', code: UNAUTHORIZED, message: 'Socket not authenticated' })<br><br>client.join.mock.calls.length: 0 | **Pass** |
| UT-6-029-02 | ORGANIZER role, authorization succeeds — client.join called, emits room:joined | client: mock socket with `data.user`: buildPayload({ currentRole: 'ORGANIZER', participantProfileId: null, organizerProfileId: '084066b4-231a-4e1e-bb37-084d5ea66c8a' })<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }<br><br>Setup: authorizeRoomJoinAccess mocked to resolve { message: 'Organizer has access to this room.' } | authorizeRoomJoinAccess called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', 'ORGANIZER', null, '084066b4-231a-4e1e-bb37-084d5ea66c8a')<br><br>client.join called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br>client.emit called with: ('room:joined', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }) | authorizeRoomJoinAccess called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', 'ORGANIZER', null, '084066b4-231a-4e1e-bb37-084d5ea66c8a')<br><br>client.join called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br>client.emit called with: ('room:joined', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }) | **Pass** |
| UT-6-029-03 | PARTICIPANT role, authorization succeeds — client.join called, emits room:joined | client: mock socket with `data.user`: buildPayload({ currentRole: 'PARTICIPANT', participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44', organizerProfileId: null })<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }<br><br>Setup: authorizeRoomJoinAccess mocked to resolve { message: 'Participant has access to this room.' } | authorizeRoomJoinAccess called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', 'PARTICIPANT', 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44', null)<br><br>client.join called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br>client.emit called with: ('room:joined', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }) | authorizeRoomJoinAccess called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', 'PARTICIPANT', 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44', null)<br><br>client.join called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br>client.emit called with: ('room:joined', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }) | **Pass** |
| UT-6-029-04 | Authorization fails — client.join NOT called, emitError called with the resolved error code | client: mock socket with `data.user`: buildPayload()<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }<br><br>Setup: authorizeRoomJoinAccess mocked to reject with RoomAccessDeniedException | client.join.mock.calls.length: 0<br><br>client.emit called with:<br>('error', { event: 'room:join', code: ROOM_ACCESS_DENIED, message: 'You do not have permission to access this discussion room.' }) | client.join.mock.calls.length: 0<br><br>client.emit called with:<br>('error', { event: 'room:join', code: ROOM_ACCESS_DENIED, message: 'You do not have permission to access this discussion room.' }) | **Pass** |

### handleLeaveRoom — UT-6-030

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-030-01 | Calls `client.leave` with the room id from the payload | client: mock socket (default)<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' } | client.leave called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | client.leave called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | **Pass** |

### handleSendMessage — UT-6-031

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-031-01 | Not authenticated — emitError(message:send, UNAUTHORIZED), `server.to(...).emit` NOT called | client: mock socket with `data: {}`<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff', dto: { content: 'hello' } } | client.emit called with:<br>('error', { event: 'message:send', code: UNAUTHORIZED, message: 'Socket not authenticated' })<br><br>server.to.mock.calls.length: 0 | client.emit called with:<br>('error', { event: 'message:send', code: UNAUTHORIZED, message: 'Socket not authenticated' })<br><br>server.to.mock.calls.length: 0 | **Pass** |
| UT-6-031-02 | ORGANIZER role, send succeeds — `server.to(roomId).emit('message:new', message)` called | client: mock socket with `data.user`: buildPayload({ currentRole: 'ORGANIZER', participantProfileId: null, organizerProfileId: '084066b4-231a-4e1e-bb37-084d5ea66c8a' })<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff', dto: { content: 'hello' } }<br><br>Setup: discussionService.sendMessage mocked to resolve MOCK_RETURN_MESSAGE | discussionService.sendMessage called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', { content: 'hello' }, 'ORGANIZER', null, '084066b4-231a-4e1e-bb37-084d5ea66c8a')<br><br>server.to called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br>room.emit called with: ('message:new', MOCK_RETURN_MESSAGE) | discussionService.sendMessage called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', { content: 'hello' }, 'ORGANIZER', null, '084066b4-231a-4e1e-bb37-084d5ea66c8a')<br><br>server.to called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br>room.emit called with: ('message:new', MOCK_RETURN_MESSAGE) | **Pass** |
| UT-6-031-03 | PARTICIPANT role, send succeeds — correct profile id threaded through to the service call | client: mock socket with `data.user`: buildPayload({ currentRole: 'PARTICIPANT', participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44', organizerProfileId: null })<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff', dto: { content: 'hello' } }<br><br>Setup: discussionService.sendMessage mocked to resolve MOCK_RETURN_MESSAGE | discussionService.sendMessage called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', { content: 'hello' }, 'PARTICIPANT', 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44', null)<br><br>room.emit called with: ('message:new', MOCK_RETURN_MESSAGE) | discussionService.sendMessage called with:<br>('e8946e7f-42a6-4586-9089-9267d0312bff', { content: 'hello' }, 'PARTICIPANT', 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44', null)<br><br>room.emit called with: ('message:new', MOCK_RETURN_MESSAGE) | **Pass** |
| UT-6-031-04 | Send fails — `server.to(...).emit` NOT called, emitError(message:send, resolved code) called | client: mock socket with `data.user`: buildPayload()<br><br>data: { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff', dto: { content: 'hello' } }<br><br>Setup: discussionService.sendMessage mocked to reject with MessageContentInvalidException('Message cannot be empty.') | server.to.mock.calls.length: 0<br><br>client.emit called with:<br>('error', { event: 'message:send', code: MESSAGE_CONTENT_INVALID, message: 'Message cannot be empty.' }) | server.to.mock.calls.length: 0<br><br>client.emit called with:<br>('error', { event: 'message:send', code: MESSAGE_CONTENT_INVALID, message: 'Message cannot be empty.' }) | **Pass** |

### handleRegistrationCancelled — UT-6-032

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-032-01 | Room is found for the event — force-disconnects the participant from that room | payload: { eventId: '1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8', participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44' }<br><br>Setup: findRoomByEventId mocked to resolve { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' }; server.in().fetchSockets mocked to resolve [] | findRoomByEventId called with:<br>('1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8')<br><br>server.in called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | findRoomByEventId called with:<br>('1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8')<br><br>server.in called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | **Pass** |
| UT-6-032-02 | No room found for the event — forceDisconnectParticipant is not invoked, method returns silently | payload: { eventId: '1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8', participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44' }<br><br>Setup: findRoomByEventId mocked to resolve null | server.in.mock.calls.length: 0 | server.in.mock.calls.length: 0 | **Pass** |

### forceDisconnectParticipant (private) — UT-6-033

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-033-01 | No sockets in the room — no emit or leave calls, room namespace is still queried | roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff'<br><br>participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44'<br><br>Setup: fetchSockets mocked to resolve [] | server.in called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | server.in called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | **Pass** |
| UT-6-033-02 | Single remote socket, participant id matches — emits room:kicked and leaves the room | roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff'<br><br>participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44'<br><br>Setup: fetchSockets mocked to resolve [remoteSocket] where remoteSocket.data.user.participantProfileId = 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44' | remoteSocket.emit called with: ('room:kicked', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' })<br><br>remoteSocket.leave called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | remoteSocket.emit called with: ('room:kicked', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' })<br><br>remoteSocket.leave called with: ('e8946e7f-42a6-4586-9089-9267d0312bff') | **Pass** |
| UT-6-033-03 | Single remote socket, participant id does not match — neither emit nor leave called | roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff'<br><br>participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44'<br><br>Setup: fetchSockets mocked to resolve [remoteSocket] where remoteSocket.data.user.participantProfileId = '14e145a2-ed46-4b38-8b5b-ab3a64a9ccea' | remoteSocket.emit.mock.calls.length: 0<br>remoteSocket.leave.mock.calls.length: 0 | remoteSocket.emit.mock.calls.length: 0<br>remoteSocket.leave.mock.calls.length: 0 | **Pass** |
| UT-6-033-04 | Multiple remote sockets, mixed match — only the matching socket receives emit and leave | roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff'<br><br>participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44'<br><br>Setup: fetchSockets mocked to resolve [matchingSocket (participantProfileId = 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44'), otherSocket (participantProfileId = '14e145a2-ed46-4b38-8b5b-ab3a64a9ccea')] | matchingSocket.emit called with: ('room:kicked', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' })<br>matchingSocket.leave called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br><br>otherSocket.emit.mock.calls.length: 0<br>otherSocket.leave.mock.calls.length: 0 | matchingSocket.emit called with: ('room:kicked', { roomId: 'e8946e7f-42a6-4586-9089-9267d0312bff' })<br>matchingSocket.leave called with: ('e8946e7f-42a6-4586-9089-9267d0312bff')<br><br>otherSocket.emit.mock.calls.length: 0<br>otherSocket.leave.mock.calls.length: 0 | **Pass** |

### resolveErrorCode (private) — UT-6-034

Parameterized test (`it.each`) — one exception/value type is passed in per row and mapped to a `DiscussionErrorCode`.

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-034-01 | RoomNotFoundException maps to ROOM_NOT_FOUND | error: new RoomNotFoundException() | result: DiscussionErrorCode.ROOM_NOT_FOUND | result: DiscussionErrorCode.ROOM_NOT_FOUND | **Pass** |
| UT-6-034-02 | RoomAccessDeniedException maps to ROOM_ACCESS_DENIED | error: new RoomAccessDeniedException() | result: DiscussionErrorCode.ROOM_ACCESS_DENIED | result: DiscussionErrorCode.ROOM_ACCESS_DENIED | **Pass** |
| UT-6-034-03 | RegistrationNotFoundException maps to REGISTRATION_NOT_FOUND | error: new RegistrationNotFoundException() | result: DiscussionErrorCode.REGISTRATION_NOT_FOUND | result: DiscussionErrorCode.REGISTRATION_NOT_FOUND | **Pass** |
| UT-6-034-04 | RoomReadOnlyException maps to ROOM_READ_ONLY | error: new RoomReadOnlyException() | result: DiscussionErrorCode.ROOM_READ_ONLY | result: DiscussionErrorCode.ROOM_READ_ONLY | **Pass** |
| UT-6-034-05 | MessageContentInvalidException maps to MESSAGE_CONTENT_INVALID | error: new MessageContentInvalidException() | result: DiscussionErrorCode.MESSAGE_CONTENT_INVALID | result: DiscussionErrorCode.MESSAGE_CONTENT_INVALID | **Pass** |
| UT-6-034-06 | AnnouncementNotAllowedException maps to ANNOUNCEMENT_NOT_ALLOWED | error: new AnnouncementNotAllowedException() | result: DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED | result: DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED | **Pass** |
| UT-6-034-07 | UnauthorizedException maps to UNAUTHORIZED | error: new UnauthorizedException() | result: DiscussionErrorCode.UNAUTHORIZED | result: DiscussionErrorCode.UNAUTHORIZED | **Pass** |
| UT-6-034-08 | An unrecognized Error instance maps to UNKNOWN_ERROR | error: new Error('some other error') | result: DiscussionErrorCode.UNKNOWN_ERROR | result: DiscussionErrorCode.UNKNOWN_ERROR | **Pass** |
| UT-6-034-09 | A non-Error thrown value (plain string) maps to UNKNOWN_ERROR | error: 'a plain string throw' | result: DiscussionErrorCode.UNKNOWN_ERROR | result: DiscussionErrorCode.UNKNOWN_ERROR | **Pass** |

### emitError (private) — UT-6-035

| Test ID | Scenario | Input | Expected Result | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- |
| UT-6-035-01 | Error is an Error instance — message field is set from `error.message` | client: mock socket (default)<br><br>event: 'room:join'<br><br>error: new RoomAccessDeniedException('custom message') | client.emit called with:<br>('error', { event: 'room:join', code: ROOM_ACCESS_DENIED, message: 'custom message' }) | client.emit called with:<br>('error', { event: 'room:join', code: ROOM_ACCESS_DENIED, message: 'custom message' }) | **Pass** |
| UT-6-035-02 | Error is not an Error instance — falls back to the generic "An unexpected error occurred." message | client: mock socket (default)<br><br>event: 'room:join'<br><br>error: 'a plain string' | client.emit called with:<br>('error', { event: 'room:join', code: UNKNOWN_ERROR, message: 'An unexpected error occurred.' }) | client.emit called with:<br>('error', { event: 'room:join', code: UNKNOWN_ERROR, message: 'An unexpected error occurred.' }) | **Pass** |

## General Guidelines

* **Test ID:** Use a unique identifier for each test case.
* **Scenario:** Clearly describe what is being tested and the relevant condition.
* **Input:** List all parameters, mock values, fixtures, and required setup.
* **Expected Result:** Describe the behavior or output that should occur.
* **Actual Result:** Record the behavior or output observed during execution.
* **Test Result:** Use `Pass`, `Fail`, or another agreed status.
* Keep descriptions concise and consistent across test cases.
* For optional dependencies, explicitly state whether the dependency is **provided** or **not provided**.
* Keep the **Expected Result** and **Actual Result** structurally comparable so differences are easy to identify.

## Appendix

### Appendix A: Shared Mock Fixtures

**buildPayload(overrides) — JwtAccessPayload default:**
```
{
  sub: '45e6a118-94a3-4e22-8c4d-00068fdbc9f2',
  email: 'user@example.com',
  currentRole: 'PARTICIPANT',
  isVerified: true,
  universityId: 'uni-1',
  participantProfileId: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44',
  organizerProfileId: null,
  hasCreatedProfile: true,
  ...overrides,
}
```

**createMockSocket(overrides) — default Socket mock:**
```
{
  id: 'socket-1',
  handshake: { auth: {}, headers: {} },
  data: {},
  emit: jest.fn(),
  disconnect: jest.fn(),
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  ...overrides,
}
```

**MOCK_RETURN_MESSAGE:**
```
{
  id: 'e9697c17-fc38-4625-aaeb-a4f43cce4e09',
  content: 'hello',
  isAnnouncement: false,
  sender: {
    id: 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44',
    role: 'PARTICIPANT',
    name: 'Jane',
    imageUrl: '',
  },
  createdAt: 2026-08-01T00:00:00.000Z,
}
```

**Server mock:** `server.to(roomId)` returns `{ emit: roomEmitMock }`; `server.in(roomId)` returns `{ fetchSockets: fetchSocketsMock }` (defaults to resolving `[]`).
