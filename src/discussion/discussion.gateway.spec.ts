import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DiscussionGateway } from './discussion.gateway';
import { DiscussionService } from './discussion.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { RoomNotFoundException } from './exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from './exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from './exceptions/room-read-only.exception';
import { MessageContentInvalidException } from './exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from './exceptions/announcement-not-allowed.exception';
import { RegistrationNotFoundException } from '../registration/exceptions/registration-not-found.exception';
import { DiscussionErrorCode } from './constants/discussion-error-code.enum';
import {
  USERS,
  ROOM_ID,
  EVENT_ID,
  ORGANIZER_PAYLOAD,
  PARTICIPANT_PAYLOAD,
  NO_PROFILE_PAYLOAD,
  ORGANIZER_MESSAGE,
  PARTICIPANT_MESSAGE,
  ANNOUNCEMENT_MESSAGE,
  createMockSocket,
  createMockServerRig,
  applyCentralMockImplementations,
  MockServerRig,
} from './discussion.gateway.mock-db';

// This spec sources its fixtures from ./discussion.gateway.mock-db.ts — JWT
// payload fixtures for each role, canned message DTOs, and socket/server
// factories. DiscussionService/JwtService are mocked collaborators;
// DiscussionService.getRoomMemberIds is wired centrally since every
// send-succeeds test exercises it via pushChatListUpdate.
//
// Within each describe block, happy-path cases come first, followed by
// error cases.

const discussionServiceMock = mockDeep<DiscussionService>();
const jwtServiceMock = mockDeep<JwtService>();

describe('DiscussionGateway', () => {
  let gateway: DiscussionGateway;
  let rig: MockServerRig;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    mockReset(discussionServiceMock);
    mockReset(jwtServiceMock);
    applyCentralMockImplementations(discussionServiceMock);

    rig = createMockServerRig();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionGateway,
        { provide: DiscussionService, useValue: discussionServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    gateway = module.get<DiscussionGateway>(DiscussionGateway);
    gateway.server = rig.server;
  });

  // ==========================================================================
  // handleConnection
  // ==========================================================================
  describe('handleConnection', () => {
    it('UT-handleConnection-01: token in handshake.auth, verification succeeds — client.data.user set, joins the personal channel', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(PARTICIPANT_PAYLOAD);
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual(PARTICIPANT_PAYLOAD);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith(
        `user:${Role.PARTICIPANT}:${USERS.PARTICIPANT_MAIN.id}`,
      );
    });

    it('UT-handleConnection-02: token in handshake.headers.authorization, verification succeeds — header extraction path also works', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(PARTICIPANT_PAYLOAD);
      const client = createMockSocket({
        handshake: { auth: {}, headers: { authorization: 'Bearer header-token' } },
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual(PARTICIPANT_PAYLOAD);
      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(
        'header-token',
        expect.objectContaining({ secret: expect.anything() }),
      );
    });

    it('UT-handleConnection-03 [single]: verification succeeds but currentRole is null (profile not created) — does not join any personal channel', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(NO_PROFILE_PAYLOAD);
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.join).not.toHaveBeenCalled();
    });

    it('UT-handleConnection-04 [error]: no token in either location — emits Unauthorized and disconnects', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('UT-handleConnection-05 [error]: token present but verification fails — emits Unauthorized and disconnects, client.data.user stays unset', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('bad token'));
      const client = createMockSocket({
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.data.user).toBeUndefined();
    });
  });

  // ==========================================================================
  // handleDisconnect
  // ==========================================================================
  describe('handleDisconnect', () => {
    it('UT-handleDisconnect-01 [single]: logs the disconnection without throwing', () => {
      const client = createMockSocket();

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  // ==========================================================================
  // getPersonalChannel (private)
  // ==========================================================================
  describe('getPersonalChannel (private)', () => {
    it('UT-getPersonalChannel-01: role and profileId both present — returns "user:{role}:{profileId}"', () => {
      const result = (gateway as any).getPersonalChannel(
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
      );

      const expected = `user:${Role.PARTICIPANT}:${USERS.PARTICIPANT_MAIN.id}`;
      expect(result).toBe(expected);
    });

    it('UT-getPersonalChannel-02 [single]: role is null — returns null', () => {
      const result = (gateway as any).getPersonalChannel(null, USERS.PARTICIPANT_MAIN.id);

      expect(result).toBeNull();
    });

    it('UT-getPersonalChannel-03 [single]: profileId is null — returns null', () => {
      const result = (gateway as any).getPersonalChannel(Role.PARTICIPANT, null);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // extractTokenFromHandshake (private)
  // ==========================================================================
  describe('extractTokenFromHandshake (private)', () => {
    it('UT-extractTokenFromHandshake-01: auth.token present — returns it, header ignored even when also present', () => {
      const client = createMockSocket({
        handshake: {
          auth: { token: 'auth-token' },
          headers: { authorization: 'Bearer header-token' },
        },
      });

      const result = (gateway as any).extractTokenFromHandshake(client);

      expect(result).toBe('auth-token');
    });

    it('UT-extractTokenFromHandshake-02: auth.token absent, header present — returns the stripped header token', () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: { authorization: 'Bearer header-token' } },
      });

      const result = (gateway as any).extractTokenFromHandshake(client);

      expect(result).toBe('header-token');
    });

    it('UT-extractTokenFromHandshake-03 [error]: both absent — throws UnauthorizedException', () => {
      const client = createMockSocket({ handshake: { auth: {}, headers: {} } });

      expect(() => (gateway as any).extractTokenFromHandshake(client)).toThrow(
        UnauthorizedException,
      );
      expect(() => (gateway as any).extractTokenFromHandshake(client)).toThrow(
        'No token provided',
      );
    });
  });

  // ==========================================================================
  // requireUser (private)
  // ==========================================================================
  describe('requireUser (private)', () => {
    it('UT-requireUser-01: client.data.user is set — returns the payload', () => {
      const client = createMockSocket({ data: { user: PARTICIPANT_PAYLOAD } });

      const result = (gateway as any).requireUser(client);

      expect(result).toEqual(PARTICIPANT_PAYLOAD);
    });

    it('UT-requireUser-02 [error]: client.data.user is unset — throws UnauthorizedException', () => {
      const client = createMockSocket({ data: {} });

      expect(() => (gateway as any).requireUser(client)).toThrow(UnauthorizedException);
      expect(() => (gateway as any).requireUser(client)).toThrow('Socket not authenticated');
    });
  });

  // ==========================================================================
  // handleJoinRoom
  // ==========================================================================
  describe('handleJoinRoom', () => {
    it('UT-handleJoinRoom-01: ORGANIZER, authorization succeeds — client.join called, emits room:joined', async () => {
      const client = createMockSocket({ data: { user: ORGANIZER_PAYLOAD } });
      discussionServiceMock.authorizeRoomJoinAccess.mockResolvedValue({
        message: 'Organizer has access to this room.',
      });

      await gateway.handleJoinRoom(client, { roomId: ROOM_ID });

      expect(discussionServiceMock.authorizeRoomJoinAccess).toHaveBeenCalledWith(
        ROOM_ID,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(client.join).toHaveBeenCalledWith(ROOM_ID);
      expect(client.emit).toHaveBeenCalledWith('room:joined', { roomId: ROOM_ID });
    });

    it('UT-handleJoinRoom-02: PARTICIPANT, authorization succeeds — client.join called, emits room:joined', async () => {
      const client = createMockSocket({ data: { user: PARTICIPANT_PAYLOAD } });
      discussionServiceMock.authorizeRoomJoinAccess.mockResolvedValue({
        message: 'Participant has access to this room.',
      });

      await gateway.handleJoinRoom(client, { roomId: ROOM_ID });

      expect(discussionServiceMock.authorizeRoomJoinAccess).toHaveBeenCalledWith(
        ROOM_ID,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );
      expect(client.join).toHaveBeenCalledWith(ROOM_ID);
      expect(client.emit).toHaveBeenCalledWith('room:joined', { roomId: ROOM_ID });
    });

    it('UT-handleJoinRoom-03 [error]: not authenticated — emitError(room:join, UNAUTHORIZED), join skipped', async () => {
      const client = createMockSocket({ data: {} });

      await gateway.handleJoinRoom(client, { roomId: ROOM_ID });

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.UNAUTHORIZED,
        message: 'Socket not authenticated',
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('UT-handleJoinRoom-04 [error]: authorization fails — client.join NOT called, emitError called with the resolved code', async () => {
      const client = createMockSocket({ data: { user: PARTICIPANT_PAYLOAD } });
      discussionServiceMock.authorizeRoomJoinAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );

      await gateway.handleJoinRoom(client, { roomId: ROOM_ID });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.ROOM_ACCESS_DENIED,
        message: 'You do not have permission to access this discussion room.',
      });
    });
  });

  // ==========================================================================
  // handleLeaveRoom
  // ==========================================================================
  describe('handleLeaveRoom', () => {
    it('UT-handleLeaveRoom-01 [single]: calls client.leave with the room id from the payload', async () => {
      const client = createMockSocket();

      await gateway.handleLeaveRoom(client, { roomId: ROOM_ID });

      expect(client.leave).toHaveBeenCalledWith(ROOM_ID);
    });
  });

  // ==========================================================================
  // handleSendMessage
  // ==========================================================================
  describe('handleSendMessage', () => {
    const dto: CreateMessageDto = { content: 'hello' };

    it('UT-handleSendMessage-01: ORGANIZER, send succeeds — emits message:new and pushes the chat-list update', async () => {
      const client = createMockSocket({ data: { user: ORGANIZER_PAYLOAD } });
      discussionServiceMock.sendMessage.mockResolvedValue(ORGANIZER_MESSAGE);

      await gateway.handleSendMessage(client, { roomId: ROOM_ID, dto });

      expect(discussionServiceMock.sendMessage).toHaveBeenCalledWith(
        ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(rig.toMock).toHaveBeenCalledWith(ROOM_ID);
      expect(rig.roomEmitMock).toHaveBeenCalledWith('message:new', ORGANIZER_MESSAGE);
      expect(discussionServiceMock.getRoomMemberIds).toHaveBeenCalledWith(ROOM_ID);
      expect(rig.toMock).toHaveBeenCalledWith([
        `user:${Role.ORGANIZER}:${USERS.ORGANIZER_MAIN.id}`,
        `user:${Role.PARTICIPANT}:${USERS.PARTICIPANT_MAIN.id}`,
      ]);
      expect(rig.roomEmitMock).toHaveBeenCalledWith('chatList:update', {
        roomId: ROOM_ID,
        lastMessage: ORGANIZER_MESSAGE,
        lastSerialNumber: ORGANIZER_MESSAGE.serialNumber,
      });
    });

    it('UT-handleSendMessage-02: PARTICIPANT, send succeeds — correct profile id threaded through to the service call', async () => {
      const client = createMockSocket({ data: { user: PARTICIPANT_PAYLOAD } });
      discussionServiceMock.sendMessage.mockResolvedValue(PARTICIPANT_MESSAGE);

      await gateway.handleSendMessage(client, { roomId: ROOM_ID, dto });

      expect(discussionServiceMock.sendMessage).toHaveBeenCalledWith(
        ROOM_ID,
        dto,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );
      expect(rig.roomEmitMock).toHaveBeenCalledWith('message:new', PARTICIPANT_MESSAGE);
    });

    it('UT-handleSendMessage-03 [error]: not authenticated — emitError(message:send, UNAUTHORIZED), server.to(...) never called', async () => {
      const client = createMockSocket({ data: {} });

      await gateway.handleSendMessage(client, { roomId: ROOM_ID, dto });

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'message:send',
        code: DiscussionErrorCode.UNAUTHORIZED,
        message: 'Socket not authenticated',
      });
      expect(rig.toMock).not.toHaveBeenCalled();
    });

    it('UT-handleSendMessage-04 [error]: send fails — server.to(...) never called, emitError(message:send, <resolved code>) called', async () => {
      const client = createMockSocket({ data: { user: ORGANIZER_PAYLOAD } });
      discussionServiceMock.sendMessage.mockRejectedValue(
        new MessageContentInvalidException('Message cannot be empty.'),
      );

      await gateway.handleSendMessage(client, { roomId: ROOM_ID, dto });

      expect(rig.toMock).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'message:send',
        code: DiscussionErrorCode.MESSAGE_CONTENT_INVALID,
        message: 'Message cannot be empty.',
      });
      expect(discussionServiceMock.getRoomMemberIds).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // handleSendAnnouncement
  // ==========================================================================
  describe('handleSendAnnouncement', () => {
    const dto: CreateAnnouncementDto = { content: 'important update' };

    it('UT-handleSendAnnouncement-01: ORGANIZER, send succeeds — emits both message:new and announcement:new, pushes the chat-list update', async () => {
      const client = createMockSocket({ data: { user: ORGANIZER_PAYLOAD } });
      discussionServiceMock.sendAnnouncement.mockResolvedValue(ANNOUNCEMENT_MESSAGE);

      await gateway.handleSendAnnouncement(client, { roomId: ROOM_ID, dto });

      expect(discussionServiceMock.sendAnnouncement).toHaveBeenCalledWith(
        ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(rig.toMock).toHaveBeenCalledWith(ROOM_ID);
      expect(rig.roomEmitMock).toHaveBeenCalledWith('message:new', ANNOUNCEMENT_MESSAGE);
      expect(rig.roomEmitMock).toHaveBeenCalledWith('announcement:new', ANNOUNCEMENT_MESSAGE);
      expect(rig.roomEmitMock).toHaveBeenCalledWith('chatList:update', {
        roomId: ROOM_ID,
        lastMessage: ANNOUNCEMENT_MESSAGE,
        lastSerialNumber: ANNOUNCEMENT_MESSAGE.serialNumber,
      });
    });

    it('UT-handleSendAnnouncement-02 [error]: not authenticated — emitError(announcement:send, UNAUTHORIZED), server.to(...) never called', async () => {
      const client = createMockSocket({ data: {} });

      await gateway.handleSendAnnouncement(client, { roomId: ROOM_ID, dto });

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'announcement:send',
        code: DiscussionErrorCode.UNAUTHORIZED,
        message: 'Socket not authenticated',
      });
      expect(rig.toMock).not.toHaveBeenCalled();
    });

    it('UT-handleSendAnnouncement-03 [error]: send fails — no emits, emitError(announcement:send, <resolved code>) called', async () => {
      const client = createMockSocket({ data: { user: PARTICIPANT_PAYLOAD } });
      discussionServiceMock.sendAnnouncement.mockRejectedValue(
        new AnnouncementNotAllowedException(),
      );

      await gateway.handleSendAnnouncement(client, { roomId: ROOM_ID, dto });

      expect(rig.toMock).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'announcement:send',
        code: DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED,
        message: 'Only the organizer can send announcements.',
      });
      expect(discussionServiceMock.getRoomMemberIds).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // handleRoomReadUpdated
  // ==========================================================================
  describe('handleRoomReadUpdated', () => {
    it("UT-handleRoomReadUpdated-01: PARTICIPANT read update — pushes chatList:read to that participant's personal channel", () => {
      gateway.handleRoomReadUpdated({
        roomId: ROOM_ID,
        role: Role.PARTICIPANT,
        participantProfileId: USERS.PARTICIPANT_MAIN.id,
        organizerProfileId: null,
        lastReadSerialNumber: 5,
      });

      expect(rig.toMock).toHaveBeenCalledWith(
        `user:${Role.PARTICIPANT}:${USERS.PARTICIPANT_MAIN.id}`,
      );
      expect(rig.roomEmitMock).toHaveBeenCalledWith('chatList:read', {
        roomId: ROOM_ID,
        lastReadSerialNumber: 5,
      });
    });

    it("UT-handleRoomReadUpdated-02: ORGANIZER read update — pushes chatList:read to that organizer's personal channel", () => {
      gateway.handleRoomReadUpdated({
        roomId: ROOM_ID,
        role: Role.ORGANIZER,
        participantProfileId: null,
        organizerProfileId: USERS.ORGANIZER_MAIN.id,
        lastReadSerialNumber: 8,
      });

      expect(rig.toMock).toHaveBeenCalledWith(`user:${Role.ORGANIZER}:${USERS.ORGANIZER_MAIN.id}`);
      expect(rig.roomEmitMock).toHaveBeenCalledWith('chatList:read', {
        roomId: ROOM_ID,
        lastReadSerialNumber: 8,
      });
    });

    it('UT-handleRoomReadUpdated-03 [single]: channel cannot be resolved (role/profile id missing) — no emit at all', () => {
      gateway.handleRoomReadUpdated({
        roomId: ROOM_ID,
        role: Role.PARTICIPANT,
        participantProfileId: null,
        organizerProfileId: null,
        lastReadSerialNumber: 5,
      });

      expect(rig.toMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // handleRegistrationCancelled
  // ==========================================================================
  describe('handleRegistrationCancelled', () => {
    it('UT-handleRegistrationCancelled-01: room found — calls forceDisconnectParticipant with (roomId, participantProfileId)', async () => {
      discussionServiceMock.findRoomByEventId.mockResolvedValue({ roomId: ROOM_ID });
      rig.fetchSocketsMock.mockResolvedValue([]);

      await gateway.handleRegistrationCancelled({
        eventId: EVENT_ID,
        participantProfileId: USERS.PARTICIPANT_MAIN.id,
      });

      expect(discussionServiceMock.findRoomByEventId).toHaveBeenCalledWith(EVENT_ID);
      expect(rig.inMock).toHaveBeenCalledWith(ROOM_ID);
    });

    it('UT-handleRegistrationCancelled-02 [single]: room not found — forceDisconnectParticipant is never invoked', async () => {
      discussionServiceMock.findRoomByEventId.mockResolvedValue(null);

      await gateway.handleRegistrationCancelled({
        eventId: EVENT_ID,
        participantProfileId: USERS.PARTICIPANT_MAIN.id,
      });

      expect(rig.inMock).not.toHaveBeenCalled();
    });

    it('UT-handleRegistrationCancelled-03 [error] [single]: findRoomByEventId throws — the error is caught internally, does not propagate', async () => {
      discussionServiceMock.findRoomByEventId.mockRejectedValue(new Error('db unavailable'));

      await expect(
        gateway.handleRegistrationCancelled({
          eventId: EVENT_ID,
          participantProfileId: USERS.PARTICIPANT_MAIN.id,
        }),
      ).resolves.toBeUndefined();

      expect(rig.inMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // forceDisconnectParticipant (private)
  // ==========================================================================
  describe('forceDisconnectParticipant (private)', () => {
    it('UT-forceDisconnectParticipant-01: the matching socket is found — emits room:kicked and leaves the room', async () => {
      const remoteSocket = {
        data: { user: { participantProfileId: USERS.PARTICIPANT_MAIN.id } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      rig.fetchSocketsMock.mockResolvedValue([remoteSocket]);

      const result = await (gateway as any).forceDisconnectParticipant(
        ROOM_ID,
        USERS.PARTICIPANT_MAIN.id,
      );

      expect(remoteSocket.emit).toHaveBeenCalledWith('room:kicked', { roomId: ROOM_ID });
      expect(remoteSocket.leave).toHaveBeenCalledWith(ROOM_ID);
      const expected = {
        message: `Participant ${USERS.PARTICIPANT_MAIN.id} disconnected from room ${ROOM_ID}`,
      };
      expect(result).toEqual(expected);
    });

    it('UT-forceDisconnectParticipant-02: multiple sockets, mixed match — only the matching socket receives emit and leave', async () => {
      const matchingSocket = {
        data: { user: { participantProfileId: USERS.PARTICIPANT_MAIN.id } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      const otherSocket = {
        data: { user: { participantProfileId: USERS.PARTICIPANT_OTHER.id } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      rig.fetchSocketsMock.mockResolvedValue([matchingSocket, otherSocket]);

      const result = await (gateway as any).forceDisconnectParticipant(
        ROOM_ID,
        USERS.PARTICIPANT_MAIN.id,
      );

      expect(matchingSocket.emit).toHaveBeenCalledWith('room:kicked', { roomId: ROOM_ID });
      expect(matchingSocket.leave).toHaveBeenCalledWith(ROOM_ID);
      expect(otherSocket.emit).not.toHaveBeenCalled();
      expect(otherSocket.leave).not.toHaveBeenCalled();
      const expected = {
        message: `Participant ${USERS.PARTICIPANT_MAIN.id} disconnected from room ${ROOM_ID}`,
      };
      expect(result).toEqual(expected);
    });

    it('UT-forceDisconnectParticipant-03 [single]: no sockets in the room — no emit/leave calls, resolves the "no room sockets" message', async () => {
      rig.fetchSocketsMock.mockResolvedValue([]);

      const result = await (gateway as any).forceDisconnectParticipant(
        ROOM_ID,
        USERS.PARTICIPANT_MAIN.id,
      );

      expect(rig.inMock).toHaveBeenCalledWith(ROOM_ID);
      const expected = { message: 'No room sockets found.' };
      expect(result).toEqual(expected);
    });

    it('UT-forceDisconnectParticipant-04: one or more sockets, none match — resolves the "no participant found" message', async () => {
      const otherSocket = {
        data: { user: { participantProfileId: USERS.PARTICIPANT_OTHER.id } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      rig.fetchSocketsMock.mockResolvedValue([otherSocket]);

      const result = await (gateway as any).forceDisconnectParticipant(
        ROOM_ID,
        USERS.PARTICIPANT_MAIN.id,
      );

      expect(otherSocket.emit).not.toHaveBeenCalled();
      expect(otherSocket.leave).not.toHaveBeenCalled();
      const expected = {
        message: `No participant with profile ID ${USERS.PARTICIPANT_MAIN.id} found in room ${ROOM_ID}`,
      };
      expect(result).toEqual(expected);
    });
  });

  // ==========================================================================
  // resolveErrorCode (private)
  // ==========================================================================
  describe('resolveErrorCode (private)', () => {
    it.each([
      [new RoomNotFoundException(), DiscussionErrorCode.ROOM_NOT_FOUND],
      [new RoomAccessDeniedException(), DiscussionErrorCode.ROOM_ACCESS_DENIED],
      [new RegistrationNotFoundException(), DiscussionErrorCode.REGISTRATION_NOT_FOUND],
      [new RoomReadOnlyException(), DiscussionErrorCode.ROOM_READ_ONLY],
      [new MessageContentInvalidException(), DiscussionErrorCode.MESSAGE_CONTENT_INVALID],
      [new AnnouncementNotAllowedException(), DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED],
      [new UnauthorizedException(), DiscussionErrorCode.UNAUTHORIZED],
      [new Error('some other error'), DiscussionErrorCode.UNKNOWN_ERROR],
      ['a plain string throw', DiscussionErrorCode.UNKNOWN_ERROR],
    ])('UT-resolveErrorCode: maps %p to %s', (error, expectedCode) => {
      const result = (gateway as any).resolveErrorCode(error);

      expect(result).toBe(expectedCode);
    });
  });

  // ==========================================================================
  // emitError (private)
  // ==========================================================================
  describe('emitError (private)', () => {
    it('UT-emitError-01: error is an Error instance — message field is set from error.message', () => {
      const client = createMockSocket();
      const error = new RoomAccessDeniedException('custom message');

      (gateway as any).emitError(client, 'room:join', error);

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.ROOM_ACCESS_DENIED,
        message: 'custom message',
      });
    });

    it('UT-emitError-02 [error]: error is not an Error instance — falls back to the generic message', () => {
      const client = createMockSocket();

      (gateway as any).emitError(client, 'room:join', 'a plain string');

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.UNKNOWN_ERROR,
        message: 'An unexpected error occurred.',
      });
    });
  });
});
