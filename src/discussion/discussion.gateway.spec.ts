import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { DiscussionGateway } from './discussion.gateway';
import { DiscussionService } from './discussion.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ReturnMessageDto } from './dto/return-message.dto';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { RoomNotFoundException } from './exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from './exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from './exceptions/room-read-only.exception';
import { MessageContentInvalidException } from './exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from './exceptions/announcement-not-allowed.exception';
import { RegistrationNotFoundException } from '../registration/exceptions/registration-not-found.exception';
import { DiscussionErrorCode } from './constants/discussion-error-code.enum';

const MOCK_ROOM_ID = 'e8946e7f-42a6-4586-9089-9267d0312bff';
const MOCK_EVENT_ID = '1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8';
const MOCK_ORGANIZER_PROFILE_ID = '084066b4-231a-4e1e-bb37-084d5ea66c8a';
const MOCK_PARTICIPANT_PROFILE_ID = 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44';
const MOCK_OTHER_PARTICIPANT_PROFILE_ID = '14e145a2-ed46-4b38-8b5b-ab3a64a9ccea';
const MOCK_USER_ID = '45e6a118-94a3-4e22-8c4d-00068fdbc9f2';
const MOCK_PARTICIPANT_MESSAGE_ID = 'e9697c17-fc38-4625-aaeb-a4f43cce4e09';
const MOCK_ORGANIZER_MESSAGE_ID = 'f1c2d3e4-5678-90ab-cdef-1234567890ab';

const buildPayload = (
  overrides: Partial<JwtAccessPayload> = {},
): JwtAccessPayload => ({
  sub: MOCK_USER_ID,
  email: 'user@example.com',
  currentRole: Role.PARTICIPANT,
  isVerified: true,
  universityId: 'uni-1',
  participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
  organizerProfileId: null,
  hasCreatedProfile: true,
  ...overrides,
});

const createMockSocket = (overrides: Record<string, any> = {}): Socket =>
  ({
    id: 'socket-1',
    handshake: { auth: {}, headers: {} },
    data: {},
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as Socket;

const MOCK_PARTICIPANT_RETURN_MESSAGE: ReturnMessageDto = {
  id: MOCK_PARTICIPANT_MESSAGE_ID,
  content: 'hello',
  isAnnouncement: false,
  sender: {
    id: MOCK_PARTICIPANT_PROFILE_ID,
    role: Role.PARTICIPANT,
    name: 'Jane',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 1,
};

const MOCK_ORGANIZER_RETURN_MESSAGE: ReturnMessageDto = {
  id: MOCK_ORGANIZER_MESSAGE_ID,
  content: 'hello',
  isAnnouncement: false,
  sender: {
    id: MOCK_ORGANIZER_PROFILE_ID,
    role: Role.ORGANIZER,
    name: 'John',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 2,
};

const MOCK_ANNOUNCEMENT_MESSAGE_ID = '2b3c4d5e-6789-40ab-cdef-1234567890ab';

const MOCK_ANNOUNCEMENT_RETURN_MESSAGE: ReturnMessageDto = {
  id: MOCK_ANNOUNCEMENT_MESSAGE_ID,
  content: 'important update',
  isAnnouncement: true,
  sender: {
    id: MOCK_ORGANIZER_PROFILE_ID,
    role: Role.ORGANIZER,
    name: 'John',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 3,
};

const discussionServiceMock = mockDeep<DiscussionService>();
const jwtServiceMock = mockDeep<JwtService>();

describe('DiscussionGateway', () => {
  let gateway: DiscussionGateway;
  let roomEmitMock: jest.Mock;
  let toMock: jest.Mock;
  let fetchSocketsMock: jest.Mock;
  let inMock: jest.Mock;
  let serverMock: Server;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    mockReset(discussionServiceMock);
    mockReset(jwtServiceMock);

    discussionServiceMock.getRoomMemberIds.mockResolvedValue({
      organizerProfileId: MOCK_ORGANIZER_PROFILE_ID,
      participantProfileIds: [MOCK_PARTICIPANT_PROFILE_ID],
    });

    roomEmitMock = jest.fn();
    toMock = jest.fn(() => ({ emit: roomEmitMock }));
    fetchSocketsMock = jest.fn().mockResolvedValue([]);
    inMock = jest.fn(() => ({ fetchSockets: fetchSocketsMock }));
    serverMock = { to: toMock, in: inMock } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionGateway,
        { provide: DiscussionService, useValue: discussionServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    gateway = module.get<DiscussionGateway>(DiscussionGateway);
    gateway.server = serverMock;
  });

  describe('handleConnection', () => {
    it('UT-6-028-01: TokenInAuth + VerifySucceeds → client.data.user set, no disconnect', async () => {
      const payload = buildPayload();
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual(payload);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalled();
    });

    it('UT-6-028-02: TokenInHeader + VerifySucceeds → client.data.user set, confirms header extraction works too', async () => {
      const payload = buildPayload();
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);
      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual(payload);
      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(
        'header-token',
        expect.objectContaining({ secret: expect.anything() }),
      );
    });

    it('UT-6-028-03: no token in either location → emits error, disconnects', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized',
      });
      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('UT-6-028-04: token present + VerifyFails → emits error, disconnects, client.data.user NOT set', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('bad token'));
      const client = createMockSocket({
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized',
      });
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.data.user).toBeUndefined();
    });

    it('UT-6-028-05: VerifySucceeds + role/profileId present → joins the personal channel so chatList pushes reach this socket', async () => {
      const payload = buildPayload({
        currentRole: Role.PARTICIPANT,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
      });
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith(
        `user:${Role.PARTICIPANT}:${MOCK_PARTICIPANT_PROFILE_ID}`,
      );
    });

    it('UT-6-028-06: VerifySucceeds + no currentRole yet (profile not created) → does not join any personal channel', async () => {
      const payload = buildPayload({
        currentRole: null,
        participantProfileId: null,
      });
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);
      const client = createMockSocket({
        handshake: { auth: { token: 'valid-token' }, headers: {} },
      });

      await gateway.handleConnection(client);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('logs the disconnection without throwing', () => {
      const client = createMockSocket();

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('extractTokenFromHandshake (private)', () => {
    it('UT-ET-01: AuthTokenPresent → returns auth.token, header ignored', () => {
      const client = createMockSocket({
        handshake: {
          auth: { token: 'auth-token' },
          headers: { authorization: 'Bearer header-token' },
        },
      });

      const result = (gateway as any).extractTokenFromHandshake(client);

      expect(result).toBe('auth-token');
    });

    it('UT-ET-02: AuthTokenAbsent + HeaderPresent → returns stripped header token', () => {
      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
      });

      const result = (gateway as any).extractTokenFromHandshake(client);

      expect(result).toBe('header-token');
    });

    it('UT-ET-03: AuthTokenAbsent + HeaderAbsent → throws UnauthorizedException', () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: {} },
      });

      expect(() => (gateway as any).extractTokenFromHandshake(client)).toThrow(
        UnauthorizedException,
      );
      expect(() => (gateway as any).extractTokenFromHandshake(client)).toThrow(
        'No token provided',
      );
    });
  });

  describe('requireUser (private)', () => {
    it('UT-RU-01: client.data.user set → returns the payload', () => {
      const payload = buildPayload();
      const client = createMockSocket({ data: { user: payload } });

      const result = (gateway as any).requireUser(client);

      expect(result).toEqual(payload);
    });

    it('UT-RU-02: client.data.user unset → throws UnauthorizedException', () => {
      const client = createMockSocket({ data: {} });

      expect(() => (gateway as any).requireUser(client)).toThrow(
        UnauthorizedException,
      );
      expect(() => (gateway as any).requireUser(client)).toThrow(
        'Socket not authenticated',
      );
    });
  });

  describe('handleJoinRoom', () => {
    it('UT-6-029-01: not authenticated → emitError called with room:join, UNAUTHORIZED code', async () => {
      const client = createMockSocket({ data: {} });

      await gateway.handleJoinRoom(client, { roomId: MOCK_ROOM_ID });

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.UNAUTHORIZED,
        message: 'Socket not authenticated',
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('UT-6-029-02: RoleOrganizer + AuthorizeSucceeds → client.join called, emits room:joined', async () => {
      const payload = buildPayload({
        currentRole: Role.ORGANIZER,
        participantProfileId: null,
        organizerProfileId: MOCK_ORGANIZER_PROFILE_ID,
      });
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.authorizeRoomJoinAccess.mockResolvedValue({
        message: 'Organizer has access to this room.',
      });

      await gateway.handleJoinRoom(client, { roomId: MOCK_ROOM_ID });

      expect(discussionServiceMock.authorizeRoomJoinAccess).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
      expect(client.join).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(client.emit).toHaveBeenCalledWith('room:joined', {
        roomId: MOCK_ROOM_ID,
      });
    });

    it('UT-6-029-03: RoleParticipant + AuthorizeSucceeds → client.join called, emits room:joined', async () => {
      const payload = buildPayload({
        currentRole: Role.PARTICIPANT,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
        organizerProfileId: null,
      });
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.authorizeRoomJoinAccess.mockResolvedValue({
        message: 'Participant has access to this room.',
      });

      await gateway.handleJoinRoom(client, { roomId: MOCK_ROOM_ID });

      expect(discussionServiceMock.authorizeRoomJoinAccess).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
      expect(client.join).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(client.emit).toHaveBeenCalledWith('room:joined', {
        roomId: MOCK_ROOM_ID,
      });
    });

    it('UT-6-029-04: AuthorizeFails → client.join NOT called, emitError called with resolved error code', async () => {
      const payload = buildPayload();
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.authorizeRoomJoinAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );

      await gateway.handleJoinRoom(client, { roomId: MOCK_ROOM_ID });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.ROOM_ACCESS_DENIED,
        message: 'You do not have permission to access this discussion room.',
      });
    });
  });

  describe('handleLeaveRoom', () => {
    it('UT-6-030-01: calls client.leave with data.roomId', async () => {
      const client = createMockSocket();

      await gateway.handleLeaveRoom(client, { roomId: MOCK_ROOM_ID });

      expect(client.leave).toHaveBeenCalledWith(MOCK_ROOM_ID);
    });
  });

  describe('handleSendMessage', () => {
    const dto: CreateMessageDto = { content: 'hello' };

    it('UT-6-031-01: not authenticated → emitError(message:send, UNAUTHORIZED), server.to(...).emit NOT called', async () => {
      const client = createMockSocket({ data: {} });

      await gateway.handleSendMessage(client, { roomId: MOCK_ROOM_ID, dto });

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'message:send',
        code: DiscussionErrorCode.UNAUTHORIZED,
        message: 'Socket not authenticated',
      });
      expect(toMock).not.toHaveBeenCalled();
    });

    it('UT-6-031-02: RoleOrganizer + SendSucceeds → server.to(roomId).emit(message:new, message) called', async () => {
      const payload = buildPayload({
        currentRole: Role.ORGANIZER,
        participantProfileId: null,
        organizerProfileId: MOCK_ORGANIZER_PROFILE_ID,
      });
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.sendMessage.mockResolvedValue(MOCK_ORGANIZER_RETURN_MESSAGE);

      await gateway.handleSendMessage(client, { roomId: MOCK_ROOM_ID, dto });

      expect(discussionServiceMock.sendMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
      expect(toMock).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(roomEmitMock).toHaveBeenCalledWith(
        'message:new',
        MOCK_ORGANIZER_RETURN_MESSAGE,
      );
      expect(discussionServiceMock.getRoomMemberIds).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
      );
      expect(toMock).toHaveBeenCalledWith([
        `user:${Role.ORGANIZER}:${MOCK_ORGANIZER_PROFILE_ID}`,
        `user:${Role.PARTICIPANT}:${MOCK_PARTICIPANT_PROFILE_ID}`,
      ]);
      expect(roomEmitMock).toHaveBeenCalledWith('chatList:update', {
        roomId: MOCK_ROOM_ID,
        lastMessage: MOCK_ORGANIZER_RETURN_MESSAGE,
        lastSerialNumber: MOCK_ORGANIZER_RETURN_MESSAGE.serialNumber,
      });
    });

    it('UT-6-031-03: RoleParticipant + SendSucceeds → correct profile id threaded through', async () => {
      const payload = buildPayload({
        currentRole: Role.PARTICIPANT,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
        organizerProfileId: null,
      });
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.sendMessage.mockResolvedValue(MOCK_PARTICIPANT_RETURN_MESSAGE);

      await gateway.handleSendMessage(client, { roomId: MOCK_ROOM_ID, dto });

      expect(discussionServiceMock.sendMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        dto,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
      expect(roomEmitMock).toHaveBeenCalledWith(
        'message:new',
        MOCK_PARTICIPANT_RETURN_MESSAGE,
      );
    });

    it('UT-6-031-04: SendFails → server.to(...).emit NOT called, emitError(message:send, <resolved code>) called', async () => {
      const payload = buildPayload();
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.sendMessage.mockRejectedValue(
        new MessageContentInvalidException('Message cannot be empty.'),
      );

      await gateway.handleSendMessage(client, { roomId: MOCK_ROOM_ID, dto });

      expect(toMock).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'message:send',
        code: DiscussionErrorCode.MESSAGE_CONTENT_INVALID,
        message: 'Message cannot be empty.',
      });
      expect(discussionServiceMock.getRoomMemberIds).not.toHaveBeenCalled();
    });
  });

  describe('handleSendAnnouncement', () => {
    const dto: CreateAnnouncementDto = { content: 'important update' };

    it('not authenticated → emitError(announcement:send, UNAUTHORIZED), server.to(...).emit NOT called', async () => {
      const client = createMockSocket({ data: {} });

      await gateway.handleSendAnnouncement(client, { roomId: MOCK_ROOM_ID, dto });

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'announcement:send',
        code: DiscussionErrorCode.UNAUTHORIZED,
        message: 'Socket not authenticated',
      });
      expect(toMock).not.toHaveBeenCalled();
    });

    it('ORGANIZER role, send succeeds → server.to(roomId).emit(message:new / announcement:new, announcement) called, chat list updated', async () => {
      const payload = buildPayload({
        currentRole: Role.ORGANIZER,
        participantProfileId: null,
        organizerProfileId: MOCK_ORGANIZER_PROFILE_ID,
      });
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.sendAnnouncement.mockResolvedValue(
        MOCK_ANNOUNCEMENT_RETURN_MESSAGE,
      );

      await gateway.handleSendAnnouncement(client, { roomId: MOCK_ROOM_ID, dto });

      expect(discussionServiceMock.sendAnnouncement).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
      expect(toMock).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(roomEmitMock).toHaveBeenCalledWith(
        'message:new',
        MOCK_ANNOUNCEMENT_RETURN_MESSAGE,
      );
      expect(roomEmitMock).toHaveBeenCalledWith(
        'announcement:new',
        MOCK_ANNOUNCEMENT_RETURN_MESSAGE,
      );
      expect(roomEmitMock).toHaveBeenCalledWith('chatList:update', {
        roomId: MOCK_ROOM_ID,
        lastMessage: MOCK_ANNOUNCEMENT_RETURN_MESSAGE,
        lastSerialNumber: MOCK_ANNOUNCEMENT_RETURN_MESSAGE.serialNumber,
      });
    });

    it('SendFails → server.to(...).emit NOT called, emitError(announcement:send, <resolved code>) called', async () => {
      const payload = buildPayload({
        currentRole: Role.PARTICIPANT,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
        organizerProfileId: null,
      });
      const client = createMockSocket({ data: { user: payload } });
      discussionServiceMock.sendAnnouncement.mockRejectedValue(
        new AnnouncementNotAllowedException(),
      );

      await gateway.handleSendAnnouncement(client, { roomId: MOCK_ROOM_ID, dto });

      expect(toMock).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'announcement:send',
        code: DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED,
        message: 'Only the organizer can send announcements.',
      });
      expect(discussionServiceMock.getRoomMemberIds).not.toHaveBeenCalled();
    });
  });

  describe('handleRoomReadUpdated', () => {
    it('UT-6-034-01: PARTICIPANT read update → pushes chatList:read to that participant\'s personal channel', () => {
      gateway.handleRoomReadUpdated({
        roomId: MOCK_ROOM_ID,
        role: Role.PARTICIPANT,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
        organizerProfileId: null,
        lastReadSerialNumber: 5,
      });

      expect(toMock).toHaveBeenCalledWith(
        `user:${Role.PARTICIPANT}:${MOCK_PARTICIPANT_PROFILE_ID}`,
      );
      expect(roomEmitMock).toHaveBeenCalledWith('chatList:read', {
        roomId: MOCK_ROOM_ID,
        lastReadSerialNumber: 5,
      });
    });

    it('UT-6-034-02: ORGANIZER read update → pushes chatList:read to that organizer\'s personal channel', () => {
      gateway.handleRoomReadUpdated({
        roomId: MOCK_ROOM_ID,
        role: Role.ORGANIZER,
        participantProfileId: null,
        organizerProfileId: MOCK_ORGANIZER_PROFILE_ID,
        lastReadSerialNumber: 8,
      });

      expect(toMock).toHaveBeenCalledWith(
        `user:${Role.ORGANIZER}:${MOCK_ORGANIZER_PROFILE_ID}`,
      );
      expect(roomEmitMock).toHaveBeenCalledWith('chatList:read', {
        roomId: MOCK_ROOM_ID,
        lastReadSerialNumber: 8,
      });
    });
  });

  describe('handleRegistrationCancelled', () => {
    it('UT-6-032-01: RoomFound → forceDisconnectParticipant called with (roomId, participantProfileId)', async () => {
      discussionServiceMock.findRoomByEventId.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
      });
      fetchSocketsMock.mockResolvedValue([]);

      await gateway.handleRegistrationCancelled({
        eventId: MOCK_EVENT_ID,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
      });

      expect(discussionServiceMock.findRoomByEventId).toHaveBeenCalledWith(
        MOCK_EVENT_ID,
      );
      expect(inMock).toHaveBeenCalledWith(MOCK_ROOM_ID);
    });

    it('UT-6-032-02: RoomNotFound → forceDisconnectParticipant NOT called', async () => {
      discussionServiceMock.findRoomByEventId.mockResolvedValue(null);

      await gateway.handleRegistrationCancelled({
        eventId: MOCK_EVENT_ID,
        participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
      });

      expect(inMock).not.toHaveBeenCalled();
    });

    it('UT-6-032-03: findRoomByEventId throws → error is caught, does not propagate', async () => {
      discussionServiceMock.findRoomByEventId.mockRejectedValue(
        new Error('db unavailable'),
      );

      await expect(
        gateway.handleRegistrationCancelled({
          eventId: MOCK_EVENT_ID,
          participantProfileId: MOCK_PARTICIPANT_PROFILE_ID,
        }),
      ).resolves.toBeUndefined();

      expect(inMock).not.toHaveBeenCalled();
    });
  });

  describe('forceDisconnectParticipant (private)', () => {
    it('UT-6-033-01: NoSockets → no emit, no leave calls at all', async () => {
      fetchSocketsMock.mockResolvedValue([]);

      const result = await (gateway as any).forceDisconnectParticipant(
        MOCK_ROOM_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(inMock).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(result).toEqual({ message: `No room sockets found.` });
    });

    it('UT-6-033-02: single socket, Matches → emits room:kicked and leaves', async () => {
      const remoteSocket = {
        data: { user: { participantProfileId: MOCK_PARTICIPANT_PROFILE_ID } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      fetchSocketsMock.mockResolvedValue([remoteSocket]);

      const result = await (gateway as any).forceDisconnectParticipant(
        MOCK_ROOM_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(remoteSocket.emit).toHaveBeenCalledWith('room:kicked', {
        roomId: MOCK_ROOM_ID,
      });
      expect(remoteSocket.leave).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(result).toEqual({
        message: `Participant ${MOCK_PARTICIPANT_PROFILE_ID} disconnected from room ${MOCK_ROOM_ID}`,
      });
    });

    it('UT-6-033-03: single socket, NoMatch → neither emit nor leave called', async () => {
      const remoteSocket = {
        data: { user: { participantProfileId: MOCK_OTHER_PARTICIPANT_PROFILE_ID } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      fetchSocketsMock.mockResolvedValue([remoteSocket]);

      const result = await (gateway as any).forceDisconnectParticipant(
        MOCK_ROOM_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(remoteSocket.emit).not.toHaveBeenCalled();
      expect(remoteSocket.leave).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: `No participant with profile ID ${MOCK_PARTICIPANT_PROFILE_ID} found in room ${MOCK_ROOM_ID}`,
      });
    });

    it('UT-6-033-04: multiple sockets, mixed match → only matching sockets receive emit+leave', async () => {
      const matchingSocket = {
        data: { user: { participantProfileId: MOCK_PARTICIPANT_PROFILE_ID } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      const otherSocket = {
        data: { user: { participantProfileId: MOCK_OTHER_PARTICIPANT_PROFILE_ID } },
        emit: jest.fn(),
        leave: jest.fn(),
      };
      fetchSocketsMock.mockResolvedValue([matchingSocket, otherSocket]);

      const result = await (gateway as any).forceDisconnectParticipant(
        MOCK_ROOM_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(matchingSocket.emit).toHaveBeenCalledWith('room:kicked', {
        roomId: MOCK_ROOM_ID,
      });
      expect(matchingSocket.leave).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(otherSocket.emit).not.toHaveBeenCalled();
      expect(otherSocket.leave).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: `Participant ${MOCK_PARTICIPANT_PROFILE_ID} disconnected from room ${MOCK_ROOM_ID}`,
      });
    });
  });

  describe('resolveErrorCode (private)', () => {
    it.each([
      [new RoomNotFoundException(), DiscussionErrorCode.ROOM_NOT_FOUND],
      [new RoomAccessDeniedException(), DiscussionErrorCode.ROOM_ACCESS_DENIED],
      [
        new RegistrationNotFoundException(),
        DiscussionErrorCode.REGISTRATION_NOT_FOUND,
      ],
      [new RoomReadOnlyException(), DiscussionErrorCode.ROOM_READ_ONLY],
      [
        new MessageContentInvalidException(),
        DiscussionErrorCode.MESSAGE_CONTENT_INVALID,
      ],
      [
        new AnnouncementNotAllowedException(),
        DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED,
      ],
      [new UnauthorizedException(), DiscussionErrorCode.UNAUTHORIZED],
      [new Error('some other error'), DiscussionErrorCode.UNKNOWN_ERROR],
      ['a plain string throw', DiscussionErrorCode.UNKNOWN_ERROR],
    ])('UT-6-034: maps %p to %s', (error, expectedCode) => {
      const result = (gateway as any).resolveErrorCode(error);

      expect(result).toBe(expectedCode);
    });
  });

  describe('emitError (private)', () => {
    it('UT-6-035-01: IsError → message = error.message', () => {
      const client = createMockSocket();
      const error = new RoomAccessDeniedException('custom message');

      (gateway as any).emitError(client, 'room:join', error);

      expect(client.emit).toHaveBeenCalledWith('error', {
        event: 'room:join',
        code: DiscussionErrorCode.ROOM_ACCESS_DENIED,
        message: 'custom message',
      });
    });

    it('UT-6-035-02: NotError → message = "An unexpected error occurred."', () => {
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
