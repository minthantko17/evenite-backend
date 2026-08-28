import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { DiscussionService } from './discussion.service';
import { DiscussionValidationService } from './services/discussion-validation.service';
import { DiscussionCrudService } from './services/discussion-crud.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { RoomNotFoundException } from './exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from './exceptions/room-access-denied.exception';
import { AnnouncementNotAllowedException } from './exceptions/announcement-not-allowed.exception';
import { SaveMessageException } from './exceptions/save-message.exception';
import { SaveRoomReadStatusException } from './exceptions/save-room-read-status.exception';
import {
  ACTIVE_ROOM_STATUSES,
  ARCHIVED_ROOM_STATUSES,
} from './constants/discussion-room-filter.constants';
import {
  USERS,
  ROOMS,
  NOT_FOUND_ROOM_ID,
  NOT_FOUND_EVENT_ID,
  NOT_FOUND_MESSAGE_ID,
  applyCentralMockImplementations,
  expectedRoomListDto,
  organizerSender,
  participantSender,
  nthCreatedMessageId,
  uuidFrom,
} from './discussion.service.mock-db';

// This spec sources all fixtures from ./discussion.service.mock-db.ts (a
// single centralized "mock database" of rooms/events/users/messages). Tests
// call the service with fixture ids/roles and assert; they generally do NOT
// need to hand-write mock setup — see applyCentralMockImplementations.
//
// Within each describe block, happy-path cases come first, followed by
// error cases.

const validationServiceMock = mockDeep<DiscussionValidationService>();
const crudServiceMock = mockDeep<DiscussionCrudService>();
const eventEmitterMock = mockDeep<EventEmitter2>();

describe('DiscussionService', () => {
  let service: DiscussionService;

  beforeEach(async () => {
    mockReset(validationServiceMock);
    mockReset(crudServiceMock);
    mockReset(eventEmitterMock);
    applyCentralMockImplementations(validationServiceMock, crudServiceMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionService,
        {
          provide: DiscussionValidationService,
          useValue: validationServiceMock,
        },
        { provide: DiscussionCrudService, useValue: crudServiceMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    service = module.get<DiscussionService>(DiscussionService);
  });

  // ==========================================================================
  // sendMessage
  // ==========================================================================
  describe('sendMessage', () => {
    it('UT-sendMessage-01: ORGANIZER sender — creates a regular message and resolves the exact ReturnMessageDto', async () => {
      const dto: CreateMessageDto = { content: 'hello' };

      const result = await service.sendMessage(
        ROOMS.ROOM_ACTIVE.id,
        dto,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        'hello',
        false,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(result).toEqual({
        id: nthCreatedMessageId(1),
        content: 'hello',
        isAnnouncement: false,
        sender: organizerSender(USERS.ORGANIZER_MAIN.id),
        createdAt: expect.any(Date),
        serialNumber: ROOMS.ROOM_ACTIVE.lastSerialNumber + 1,
      });
    });

    it('UT-sendMessage-02: PARTICIPANT sender — creates a regular message and resolves the exact ReturnMessageDto', async () => {
      const dto: CreateMessageDto = { content: 'hi there' };

      const result = await service.sendMessage(
        ROOMS.ROOM_ACTIVE.id,
        dto,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        'hi there',
        false,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );
      expect(result).toEqual({
        id: nthCreatedMessageId(1),
        content: 'hi there',
        isAnnouncement: false,
        sender: participantSender(USERS.PARTICIPANT_MAIN.id),
        createdAt: expect.any(Date),
        serialNumber: ROOMS.ROOM_ACTIVE.lastSerialNumber + 1,
      });
    });

    it('UT-sendMessage-03 [single]: trims surrounding whitespace before persisting, and the resolved content reflects the trimmed value', async () => {
      const dto: CreateMessageDto = { content: '  padded content  ' };

      const result = await service.sendMessage(
        ROOMS.ROOM_ACTIVE.id,
        dto,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        'padded content',
        false,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(result.content).toBe('padded content');
    });

    it('UT-sendMessage-04 [error]: room does not exist — throws RoomNotFoundException, skips all downstream calls', async () => {
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          NOT_FOUND_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(validationServiceMock.validateMessageContent).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendMessage-05 [error]: caller is neither owner nor a confirmed participant — throws RoomAccessDeniedException', async () => {
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.PARTICIPANT,
          USERS.PARTICIPANT_OTHER.id,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(validationServiceMock.validateMessageContent).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendMessage-06 [error]: room is not writable (cancelled / concluded past grace) — throws RoomReadOnlyException', async () => {
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          ROOMS.ROOM_CANCELLED.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow('This discussion room is read-only and no longer accepts new messages.');

      expect(validationServiceMock.validateMessageContent).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendMessage-07 [error]: content is empty/whitespace-only — throws MessageContentInvalidException', async () => {
      const dto: CreateMessageDto = { content: '   ' };

      await expect(
        service.sendMessage(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow('Message cannot be empty.');

      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendMessage-08 [error]: content exceeds the max length — throws MessageContentInvalidException', async () => {
      const dto: CreateMessageDto = { content: 'a'.repeat(2001) };

      await expect(
        service.sendMessage(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow('Message cannot exceed 2000 characters.');

      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendMessage-09 [error] [single]: createMessage fails downstream — rejects with the CRUD error', async () => {
      crudServiceMock.createMessage.mockRejectedValueOnce(new SaveMessageException());
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow(SaveMessageException);
    });
  });

  // ==========================================================================
  // sendAnnouncement
  // ==========================================================================
  describe('sendAnnouncement', () => {
    it('UT-sendAnnouncement-01: ORGANIZER — creates an announcement and resolves the exact ReturnMessageDto', async () => {
      const dto: CreateAnnouncementDto = { content: 'important update' };

      const result = await service.sendAnnouncement(
        ROOMS.ROOM_ACTIVE.id,
        dto,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        'important update',
        true,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(result).toEqual({
        id: nthCreatedMessageId(1),
        content: 'important update',
        isAnnouncement: true,
        sender: organizerSender(USERS.ORGANIZER_MAIN.id),
        createdAt: expect.any(Date),
        serialNumber: ROOMS.ROOM_ACTIVE.lastSerialNumber + 1,
      });
    });

    it('UT-sendAnnouncement-02 [single]: trims surrounding whitespace before persisting, and the resolved content reflects the trimmed value', async () => {
      const dto: CreateAnnouncementDto = { content: '  padded content  ' };

      const result = await service.sendAnnouncement(
        ROOMS.ROOM_ACTIVE.id,
        dto,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        'padded content',
        true,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
      expect(result.content).toBe('padded content');
    });

    it('UT-sendAnnouncement-03 [error]: PARTICIPANT attempts to send — throws AnnouncementNotAllowedException before any room lookup', async () => {
      const dto: CreateAnnouncementDto = { content: 'hello' };

      await expect(
        service.sendAnnouncement(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.PARTICIPANT,
          USERS.PARTICIPANT_MAIN.id,
          null,
        ),
      ).rejects.toThrow(AnnouncementNotAllowedException);

      expect(validationServiceMock.validateRoomExists).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendAnnouncement-04 [error]: room does not exist — throws RoomNotFoundException', async () => {
      const dto: CreateAnnouncementDto = { content: 'hello' };

      await expect(
        service.sendAnnouncement(
          NOT_FOUND_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendAnnouncement-05 [error]: caller is not the room owner — throws RoomAccessDeniedException', async () => {
      const dto: CreateAnnouncementDto = { content: 'hello' };

      await expect(
        service.sendAnnouncement(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_OTHER.id,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendAnnouncement-06 [error]: room is not writable — throws RoomReadOnlyException', async () => {
      const dto: CreateAnnouncementDto = { content: 'hello' };

      await expect(
        service.sendAnnouncement(
          ROOMS.ROOM_CONCLUDED_EXPIRED.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow('This discussion room is read-only and no longer accepts new messages.');

      expect(validationServiceMock.validateMessageContent).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendAnnouncement-07 [error]: content is empty/whitespace-only — throws MessageContentInvalidException', async () => {
      const dto: CreateAnnouncementDto = { content: '   ' };

      await expect(
        service.sendAnnouncement(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow('Message cannot be empty.');

      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendAnnouncement-08 [error]: content exceeds the max length — throws MessageContentInvalidException', async () => {
      const dto: CreateAnnouncementDto = { content: 'a'.repeat(2001) };

      await expect(
        service.sendAnnouncement(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow('Message cannot exceed 2000 characters.');

      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-sendAnnouncement-09 [error] [single]: createMessage fails downstream — rejects with the CRUD error', async () => {
      crudServiceMock.createMessage.mockRejectedValueOnce(new SaveMessageException());
      const dto: CreateAnnouncementDto = { content: 'hello' };

      await expect(
        service.sendAnnouncement(
          ROOMS.ROOM_ACTIVE.id,
          dto,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow(SaveMessageException);
    });
  });

  // ==========================================================================
  // getMessages
  // ==========================================================================
  describe('getMessages', () => {
    it('UT-getMessages-01: explicit cursor + direction + limit — forwarded as-is, skips the read-status lookup, resolves the CRUD page', async () => {
      const cursor = ROOMS.ROOM_ACTIVE.messages[0].id;
      const query: GetMessagesQueryDto = { cursor, direction: 'after', limit: 10 };

      const result = await service.getMessages(
        ROOMS.ROOM_ACTIVE.id,
        query,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        cursor,
        'after',
        10,
      );
      expect(result).toEqual(ROOMS.ROOM_ACTIVE.messagePage);
    });

    it('UT-getMessages-02: explicit cursor with no direction — defaults direction to "before"', async () => {
      const cursor = ROOMS.ROOM_ACTIVE.messages[0].id;
      const query: GetMessagesQueryDto = { cursor };

      const result = await service.getMessages(
        ROOMS.ROOM_ACTIVE.id,
        query,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        cursor,
        'before',
        25,
      );
      expect(result).toEqual(ROOMS.ROOM_ACTIVE.messagePage);
    });

    it('UT-getMessages-03: no cursor, read status exists with a lastReadMessageId — resumes "after" that message, ignoring query.direction', async () => {
      const query: GetMessagesQueryDto = { direction: 'before', limit: 20 };

      const result = await service.getMessages(
        ROOMS.ROOM_ACTIVE.id,
        query,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        ROOMS.ROOM_ACTIVE.readStatus.organizer!.lastReadMessageId,
        'after',
        20,
      );
      expect(result).toEqual(ROOMS.ROOM_ACTIVE.messagePage);
    });

    it('UT-getMessages-04: no cursor, read status exists but lastReadMessageId is null (room was empty at last read) — falls through to the latest-page fetch', async () => {
      const query: GetMessagesQueryDto = { limit: 20 };

      const result = await service.getMessages(
        ROOMS.ROOM_NEVER_READ_EMPTY.id,
        query,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_NEVER_READ_EMPTY.id,
        undefined,
        'before',
        20,
      );
      expect(result).toEqual(ROOMS.ROOM_NEVER_READ_EMPTY.messagePage);
    });

    it('UT-getMessages-05: no cursor, no read status record at all (never read) — falls through to the latest-page fetch', async () => {
      const query: GetMessagesQueryDto = { limit: 20 };

      const result = await service.getMessages(
        ROOMS.ROOM_NEVER_READ_EMPTY.id,
        query,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_NEVER_READ_EMPTY.id,
        undefined,
        'before',
        20,
      );
      expect(result).toEqual(ROOMS.ROOM_NEVER_READ_EMPTY.messagePage);
    });

    it('UT-getMessages-06: limit omitted — pageSize defaults to DEFAULT_MESSAGE_PAGE_SIZE (25)', async () => {
      const query: GetMessagesQueryDto = {};

      const result = await service.getMessages(
        ROOMS.ROOM_NEVER_READ_EMPTY.id,
        query,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_NEVER_READ_EMPTY.id,
        undefined,
        'before',
        25,
      );
      expect(result).toEqual(ROOMS.ROOM_NEVER_READ_EMPTY.messagePage);
    });

    it('UT-getMessages-07: limit at/above MAX_MESSAGE_PAGE_SIZE — capped to 25', async () => {
      const query: GetMessagesQueryDto = { cursor: ROOMS.ROOM_ACTIVE.messages[0].id, limit: 100 };

      const result = await service.getMessages(
        ROOMS.ROOM_ACTIVE.id,
        query,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        ROOMS.ROOM_ACTIVE.messages[0].id,
        'before',
        25,
      );
      expect(result).toEqual(ROOMS.ROOM_ACTIVE.messagePage);
    });

    it('UT-getMessages-08 [error]: room does not exist — throws RoomNotFoundException', async () => {
      const query: GetMessagesQueryDto = {};

      await expect(
        service.getMessages(
          NOT_FOUND_ROOM_ID,
          query,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
    });

    it('UT-getMessages-09 [error]: caller is not authorized — throws RoomAccessDeniedException', async () => {
      const query: GetMessagesQueryDto = {};

      await expect(
        service.getMessages(
          ROOMS.ROOM_ACTIVE.id,
          query,
          Role.PARTICIPANT,
          USERS.PARTICIPANT_OTHER.id,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getAnnouncements
  // ==========================================================================
  describe('getAnnouncements', () => {
    it('UT-getAnnouncements-01 [single]: delegates to getLatestAnnouncements(roomId, MAX_ANNOUNCEMENT_COUNT) and resolves its result', async () => {
      const result = await service.getAnnouncements(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(crudServiceMock.getLatestAnnouncements).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        15,
      );
      expect(result).toEqual(ROOMS.ROOM_ACTIVE.announcements);
    });

    it('UT-getAnnouncements-02 [error]: room does not exist — throws RoomNotFoundException', async () => {
      await expect(
        service.getAnnouncements(NOT_FOUND_ROOM_ID, Role.ORGANIZER, null, USERS.ORGANIZER_MAIN.id),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(crudServiceMock.getLatestAnnouncements).not.toHaveBeenCalled();
    });

    it('UT-getAnnouncements-03 [error]: caller is not authorized — throws RoomAccessDeniedException', async () => {
      await expect(
        service.getAnnouncements(
          ROOMS.ROOM_ACTIVE.id,
          Role.PARTICIPANT,
          USERS.PARTICIPANT_OTHER.id,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(crudServiceMock.getLatestAnnouncements).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // updateLastReadMessage
  // ==========================================================================
  describe('updateLastReadMessage', () => {
    it('UT-updateLastReadMessage-01 [single]: lastReadMessageId omitted — skips the serial-number lookup, resolves { lastReadMessageId: null, lastReadSerialNumber: 0 }', async () => {
      const result = await service.updateLastReadMessage(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        undefined,
      );

      expect(crudServiceMock.getMessageSerialNumber).not.toHaveBeenCalled();
      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        undefined,
        undefined,
      );
      expect(result).toEqual({
        roomId: ROOMS.ROOM_ACTIVE.id,
        lastReadMessageId: null,
        lastReadSerialNumber: 0,
      });
    });

    it('UT-updateLastReadMessage-02: ORGANIZER, lastReadMessageId provided and found — resolves its serial number, upserts keyed on organizerProfileId, and emits room.read-updated', async () => {
      const messageId = ROOMS.ROOM_ACTIVE.messages[1].id; // serialNumber 2

      const result = await service.updateLastReadMessage(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        messageId,
      );

      expect(crudServiceMock.getMessageSerialNumber).toHaveBeenCalledWith(messageId);
      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        messageId,
        2,
      );
      expect(result).toEqual({
        roomId: ROOMS.ROOM_ACTIVE.id,
        lastReadMessageId: messageId,
        lastReadSerialNumber: 2,
      });
      expect(eventEmitterMock.emit).toHaveBeenCalledWith('room.read-updated', {
        roomId: ROOMS.ROOM_ACTIVE.id,
        role: Role.ORGANIZER,
        participantProfileId: null,
        organizerProfileId: USERS.ORGANIZER_MAIN.id,
        lastReadSerialNumber: 2,
      });
    });

    it('UT-updateLastReadMessage-03: PARTICIPANT, lastReadMessageId provided and found — resolves its serial number and upserts keyed on participantProfileId', async () => {
      const messageId = ROOMS.ROOM_ACTIVE.announcements[0].id; // serialNumber 3

      const result = await service.updateLastReadMessage(
        ROOMS.ROOM_ACTIVE.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
        messageId,
      );

      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
        messageId,
        3,
      );
      expect(result).toEqual({
        roomId: ROOMS.ROOM_ACTIVE.id,
        lastReadMessageId: messageId,
        lastReadSerialNumber: 3,
      });
    });

    it('UT-updateLastReadMessage-04: lastReadMessageId provided but not found — falls back to lastReadSerialNumber=undefined, emits 0', async () => {
      const result = await service.updateLastReadMessage(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        NOT_FOUND_MESSAGE_ID,
      );

      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        NOT_FOUND_MESSAGE_ID,
        undefined,
      );
      expect(result).toEqual({
        roomId: ROOMS.ROOM_ACTIVE.id,
        lastReadMessageId: NOT_FOUND_MESSAGE_ID,
        lastReadSerialNumber: 0,
      });
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'room.read-updated',
        expect.objectContaining({ lastReadSerialNumber: 0 }),
      );
    });

    it('UT-updateLastReadMessage-05 [error]: room does not exist — throws RoomNotFoundException', async () => {
      await expect(
        service.updateLastReadMessage(
          NOT_FOUND_ROOM_ID,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
          undefined,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(crudServiceMock.upsertLastReadMessage).not.toHaveBeenCalled();
    });

    it('UT-updateLastReadMessage-06 [error]: caller is not authorized — throws RoomAccessDeniedException', async () => {
      await expect(
        service.updateLastReadMessage(
          ROOMS.ROOM_ACTIVE.id,
          Role.PARTICIPANT,
          USERS.PARTICIPANT_OTHER.id,
          null,
          undefined,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(crudServiceMock.upsertLastReadMessage).not.toHaveBeenCalled();
    });

    it('UT-updateLastReadMessage-07 [error] [single]: upsertLastReadMessage fails downstream — rejects with the CRUD error, still no emit', async () => {
      crudServiceMock.upsertLastReadMessage.mockRejectedValueOnce(
        new SaveRoomReadStatusException(),
      );

      await expect(
        service.updateLastReadMessage(
          ROOMS.ROOM_ACTIVE.id,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
          undefined,
        ),
      ).rejects.toThrow(SaveRoomReadStatusException);

      expect(eventEmitterMock.emit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getCreatedDiscussionRooms
  // ==========================================================================
  describe('getCreatedDiscussionRooms', () => {
    it('UT-getCreatedDiscussionRooms-01: filter="active" — forwards ACTIVE_ROOM_STATUSES and resolves the composed, roomless-filtered DTOs', async () => {
      const result = await service.getCreatedDiscussionRooms(
        USERS.ORGANIZER_MAIN.id,
        'active',
      );

      expect(crudServiceMock.getOrganizerEventsWithRoom).toHaveBeenCalledWith(
        USERS.ORGANIZER_MAIN.id,
        ACTIVE_ROOM_STATUSES,
      );
      // ROOM_NO_BANNER's fallback ('') and ROOM_NEVER_READ_EMPTY's lastMessage=null
      // are exercised inline via expectedRoomListDto below.
      expect(result).toEqual([
        expectedRoomListDto(ROOMS.ROOM_ACTIVE, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_NEVER_READ_EMPTY, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_NO_BANNER, Role.ORGANIZER),
      ]);
    });

    it('UT-getCreatedDiscussionRooms-02: filter="archived" — forwards ARCHIVED_ROOM_STATUSES and resolves DTOs with mixed isReadOnly true/false', async () => {
      const result = await service.getCreatedDiscussionRooms(
        USERS.ORGANIZER_MAIN.id,
        'archived',
      );

      expect(crudServiceMock.getOrganizerEventsWithRoom).toHaveBeenCalledWith(
        USERS.ORGANIZER_MAIN.id,
        ARCHIVED_ROOM_STATUSES,
      );
      expect(result).toEqual([
        expectedRoomListDto(ROOMS.ROOM_CANCELLED, Role.ORGANIZER), // isReadOnly: true
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_GRACE, Role.ORGANIZER), // isReadOnly: false
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_EXPIRED, Role.ORGANIZER), // isReadOnly: true
      ]);
    });

    it('UT-getCreatedDiscussionRooms-03: filter omitted — forwards undefined (no status filter), resolves every owned room', async () => {
      const result = await service.getCreatedDiscussionRooms(USERS.ORGANIZER_MAIN.id);

      expect(crudServiceMock.getOrganizerEventsWithRoom).toHaveBeenCalledWith(
        USERS.ORGANIZER_MAIN.id,
        undefined,
      );
      expect(result).toEqual([
        expectedRoomListDto(ROOMS.ROOM_ACTIVE, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_NEVER_READ_EMPTY, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_CANCELLED, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_GRACE, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_EXPIRED, Role.ORGANIZER),
        expectedRoomListDto(ROOMS.ROOM_NO_BANNER, Role.ORGANIZER),
      ]);
    });

    it('UT-getCreatedDiscussionRooms-04 [single]: reads unread status keyed on the ORGANIZER caller identity, not the participant slot', async () => {
      await service.getCreatedDiscussionRooms(USERS.ORGANIZER_MAIN.id, 'active');

      expect(crudServiceMock.getUnreadStatusBySerialNumber).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );
    });

    it('UT-getCreatedDiscussionRooms-05 [single]: no rooms for the caller — resolves [] without mapping', async () => {
      const result = await service.getCreatedDiscussionRooms(USERS.ORGANIZER_OTHER.id);

      expect(result).toEqual([]);
      expect(crudServiceMock.getLatestMessageForRoom).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getJoinedDiscussionRooms
  // ==========================================================================
  describe('getJoinedDiscussionRooms', () => {
    it('UT-getJoinedDiscussionRooms-01: filter="archived" — forwards ARCHIVED_ROOM_STATUSES and resolves the composed DTOs', async () => {
      const result = await service.getJoinedDiscussionRooms(
        USERS.PARTICIPANT_MAIN.id,
        'archived',
      );

      expect(crudServiceMock.getParticipantEventsWithRoom).toHaveBeenCalledWith(
        USERS.PARTICIPANT_MAIN.id,
        ARCHIVED_ROOM_STATUSES,
      );
      expect(result).toEqual([
        expectedRoomListDto(ROOMS.ROOM_CANCELLED, Role.PARTICIPANT),
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_GRACE, Role.PARTICIPANT),
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_EXPIRED, Role.PARTICIPANT),
      ]);
    });

    it('UT-getJoinedDiscussionRooms-02: filter omitted — resolves every joined room, filtering out roomless events, keyed on the PARTICIPANT caller identity', async () => {
      const result = await service.getJoinedDiscussionRooms(USERS.PARTICIPANT_MAIN.id);

      expect(result).toEqual([
        expectedRoomListDto(ROOMS.ROOM_ACTIVE, Role.PARTICIPANT),
        expectedRoomListDto(ROOMS.ROOM_NEVER_READ_EMPTY, Role.PARTICIPANT),
        expectedRoomListDto(ROOMS.ROOM_CANCELLED, Role.PARTICIPANT),
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_GRACE, Role.PARTICIPANT),
        expectedRoomListDto(ROOMS.ROOM_CONCLUDED_EXPIRED, Role.PARTICIPANT),
      ]);
      expect(crudServiceMock.getUnreadStatusBySerialNumber).toHaveBeenCalledWith(
        ROOMS.ROOM_ACTIVE.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );
    });

    it('UT-getJoinedDiscussionRooms-03 [single]: participant with no joined rooms — resolves []', async () => {
      const result = await service.getJoinedDiscussionRooms(USERS.PARTICIPANT_OTHER.id);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // authorizeRoomJoinAccess
  // ==========================================================================
  describe('authorizeRoomJoinAccess', () => {
    it('UT-authorizeRoomJoinAccess-01: authorized organizer — resolves the access-confirmation message with no side effects', async () => {
      const result = await service.authorizeRoomJoinAccess(
        ROOMS.ROOM_ACTIVE.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(result).toEqual({ message: 'Organizer has access to this room.' });
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-authorizeRoomJoinAccess-02: authorized confirmed participant — resolves the access-confirmation message', async () => {
      const result = await service.authorizeRoomJoinAccess(
        ROOMS.ROOM_ACTIVE.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      expect(result).toEqual({ message: 'Participant has access to this room.' });
    });

    it('UT-authorizeRoomJoinAccess-03 [error]: room does not exist — throws RoomNotFoundException', async () => {
      await expect(
        service.authorizeRoomJoinAccess(
          NOT_FOUND_ROOM_ID,
          Role.ORGANIZER,
          null,
          USERS.ORGANIZER_MAIN.id,
        ),
      ).rejects.toThrow(RoomNotFoundException);
    });

    it('UT-authorizeRoomJoinAccess-04 [error]: caller is not authorized — throws RoomAccessDeniedException', async () => {
      await expect(
        service.authorizeRoomJoinAccess(
          ROOMS.ROOM_ACTIVE.id,
          Role.PARTICIPANT,
          USERS.PARTICIPANT_OTHER.id,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);
    });
  });

  // ==========================================================================
  // findRoomByEventId
  // ==========================================================================
  describe('findRoomByEventId', () => {
    it('UT-findRoomByEventId-01 [single]: room exists for the event — resolves { roomId }', async () => {
      const result = await service.findRoomByEventId(ROOMS.ROOM_ACTIVE.event.id);

      expect(result).toEqual({ roomId: ROOMS.ROOM_ACTIVE.id });
    });

    it('UT-findRoomByEventId-02 [single]: no room exists for the event — resolves null', async () => {
      const result = await service.findRoomByEventId(NOT_FOUND_EVENT_ID);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getRoomMemberIds
  // ==========================================================================
  describe('getRoomMemberIds', () => {
    it('UT-getRoomMemberIds-01 [single]: room found — resolves the organizer id and confirmed participant ids', async () => {
      const result = await service.getRoomMemberIds(ROOMS.ROOM_ACTIVE.id);

      expect(result).toEqual({
        organizerProfileId: USERS.ORGANIZER_MAIN.id,
        participantProfileIds: [USERS.PARTICIPANT_MAIN.id],
      });
    });

    it('UT-getRoomMemberIds-02 [single]: room has no confirmed participants — resolves an empty array', async () => {
      const result = await service.getRoomMemberIds(ROOMS.ROOM_NO_BANNER.id);

      expect(result).toEqual({
        organizerProfileId: USERS.ORGANIZER_MAIN.id,
        participantProfileIds: [],
      });
    });

    it('UT-getRoomMemberIds-03 [error] [single]: room not found — throws RoomNotFoundException', async () => {
      await expect(service.getRoomMemberIds(NOT_FOUND_ROOM_ID)).rejects.toThrow(
        RoomNotFoundException,
      );
    });
  });
});

// sanity check that fixture-id generation stays in UUID v4 shape if reused
// directly in a test (`uuidFrom` is re-exported from the mock db for this).
describe('mock-db uuidFrom', () => {
  it('produces RFC-4122 v4-shaped ids', () => {
    const id = uuidFrom('sanity-check');
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
