import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { Event, EventStatus, Role } from '@prisma/client';
import { DiscussionService } from './discussion.service';
import { DiscussionValidationService } from './services/discussion-validation.service';
import { DiscussionCrudService } from './services/discussion-crud.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ReturnMessageDto } from './dto/return-message.dto';
import { ReturnMessagePageDto } from './dto/return-message-page.dto';
import { RoomNotFoundException } from './exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from './exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from './exceptions/room-read-only.exception';
import { MessageContentInvalidException } from './exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from './exceptions/announcement-not-allowed.exception';
import {
  ACTIVE_ROOM_STATUSES,
  ARCHIVED_ROOM_STATUSES,
} from './constants/discussion-room-filter.constants';
import { EventWithDiscussionRoom } from './types/discussion.types';

const MOCK_ROOM_ID = 'room-1';
const MOCK_ORGANIZER_PROFILE_ID = 'organizer-1';
const MOCK_PARTICIPANT_PROFILE_ID = 'participant-1';

const MOCK_EVENT: Event = {
  id: 'event-1',
  organizerId: MOCK_ORGANIZER_PROFILE_ID,
  status: EventStatus.PUBLISHED,
  startAt: new Date('2026-08-01T00:00:00Z'),
  endAt: new Date('2026-08-01T02:00:00Z'),
} as Event;

const MOCK_RETURN_MESSAGE: ReturnMessageDto = {
  id: 'message-1',
  content: 'hello world',
  isAnnouncement: false,
  sender: {
    role: Role.PARTICIPANT,
    name: 'Jane Doe',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
};

const MOCK_MESSAGE_PAGE: ReturnMessagePageDto = {
  messages: [MOCK_RETURN_MESSAGE],
  hasMoreOlder: false,
  hasMoreNewer: false,
  oldestCursor: 'message-1',
  newestCursor: 'message-1',
};

const MOCK_LAST_READ_AT = new Date('2026-08-01T01:00:00Z');
const MOCK_READ_STATUS = { lastReadAt: MOCK_LAST_READ_AT };
const MOCK_ROOM_READ_STATUS_DTO = {
  roomId: MOCK_ROOM_ID,
  lastReadAt: MOCK_LAST_READ_AT,
};

const MOCK_EVENT_WITH_ROOM = {
  id: 'event-1',
  organizerId: MOCK_ORGANIZER_PROFILE_ID,
  status: EventStatus.PUBLISHED,
  startAt: new Date('2026-08-01T00:00:00Z'),
  endAt: new Date('2026-08-01T02:00:00Z'),
  title: { en: 'Orientation', th: 'ปฐมนิเทศ' },
  bannerUrl: 'banner.png',
  discussionRoom: { id: MOCK_ROOM_ID },
} as unknown as EventWithDiscussionRoom;

const MOCK_EVENT_WITHOUT_ROOM = {
  ...MOCK_EVENT_WITH_ROOM,
  id: 'event-2',
  discussionRoom: null,
} as unknown as EventWithDiscussionRoom;

const MOCK_EVENT_WITH_ROOM_NO_BANNER = {
  ...MOCK_EVENT_WITH_ROOM,
  id: 'event-3',
  bannerUrl: null,
} as unknown as EventWithDiscussionRoom;

const validationServiceMock = mockDeep<DiscussionValidationService>();
const crudServiceMock = mockDeep<DiscussionCrudService>();

describe('DiscussionService', () => {
  let service: DiscussionService;

  beforeEach(async () => {
    mockReset(validationServiceMock);
    mockReset(crudServiceMock);

    validationServiceMock.validateRoomExists.mockResolvedValue({
      roomId: MOCK_ROOM_ID,
      event: MOCK_EVENT,
    });
    validationServiceMock.validateRoomAccess.mockResolvedValue({
      message: 'Organizer has access to this room.',
    });
    validationServiceMock.validateRoomWritable.mockReturnValue({
      message: 'Discussion room is writable.',
    });
    validationServiceMock.validateMessageContent.mockImplementation(
      (content: string) => content,
    );
    validationServiceMock.validateAnnouncementPermission.mockReturnValue(false);
    crudServiceMock.createMessage.mockResolvedValue(MOCK_RETURN_MESSAGE);
    crudServiceMock.getPaginatedMessagesByCursor.mockResolvedValue(MOCK_MESSAGE_PAGE);
    crudServiceMock.getPaginatedMessagesByTimestamp.mockResolvedValue(
      MOCK_MESSAGE_PAGE,
    );
    crudServiceMock.getRoomReadStatus.mockResolvedValue(null);
    crudServiceMock.upsertRoomReadStatus.mockResolvedValue(
      MOCK_ROOM_READ_STATUS_DTO,
    );
    crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([]);
    crudServiceMock.getParticipantEventsWithRoom.mockResolvedValue([]);
    crudServiceMock.getLatestMessageForRoom.mockResolvedValue(null);
    crudServiceMock.countUnreadMessages.mockResolvedValue(0);
    crudServiceMock.findRoomByEventId.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionService,
        {
          provide: DiscussionValidationService,
          useValue: validationServiceMock,
        },
        { provide: DiscussionCrudService, useValue: crudServiceMock },
      ],
    }).compile();

    service = module.get<DiscussionService>(DiscussionService);
  });

  describe('sendMessage', () => {
    it('UT-SM-01: throws RoomNotFoundException when room does not exist, and skips all downstream validation', async () => {
      validationServiceMock.validateRoomExists.mockRejectedValue(
        new RoomNotFoundException(),
      );
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(
        validationServiceMock.validateMessageContent,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-SM-02: throws RoomAccessDeniedException when caller is neither owner nor confirmed participant', async () => {
      validationServiceMock.validateRoomAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(
        validationServiceMock.validateMessageContent,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-SM-03: throws RoomReadOnlyException when room is not writable (concluded past grace period / cancelled)', async () => {
      validationServiceMock.validateRoomWritable.mockImplementation(() => {
        throw new RoomReadOnlyException();
      });
      const dto: CreateMessageDto = { content: 'hello' };

      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomReadOnlyException);

      expect(
        validationServiceMock.validateMessageContent,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-SM-04: throws MessageContentInvalidException when content is empty/whitespace-only or exceeds 2000 characters', async () => {
      validationServiceMock.validateMessageContent.mockImplementation(() => {
        throw new MessageContentInvalidException('Message cannot be empty.');
      });
      const dto: CreateMessageDto = { content: '   ' };

      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(MessageContentInvalidException);

      expect(
        validationServiceMock.validateAnnouncementPermission,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-SM-05: throws AnnouncementNotAllowedException when a PARTICIPANT attempts to send an announcement', async () => {
      validationServiceMock.validateAnnouncementPermission.mockImplementation(
        () => {
          throw new AnnouncementNotAllowedException();
        },
      );
      const dto: CreateMessageDto = { content: 'hello', isAnnouncement: true };

      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(AnnouncementNotAllowedException);

      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-SM-06: creates a regular message for an ORGANIZER, setting senderOrganizerId and leaving senderParticipantId null', async () => {
      const dto: CreateMessageDto = { content: 'hello' };

      const result = await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(MOCK_RETURN_MESSAGE);
      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        'hello',
        false,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
    });

    it('UT-SM-07: creates an announcement for an ORGANIZER when dto.isAnnouncement is true', async () => {
      validationServiceMock.validateAnnouncementPermission.mockReturnValue(
        true,
      );
      const dto: CreateMessageDto = {
        content: 'important update',
        isAnnouncement: true,
      };

      await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(
        validationServiceMock.validateAnnouncementPermission,
      ).toHaveBeenCalledWith(true, Role.ORGANIZER);
      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        'important update',
        true,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
    });

    it('UT-SM-08: creates a regular message for a confirmed PARTICIPANT, setting senderParticipantId and leaving senderOrganizerId null', async () => {
      const dto: CreateMessageDto = { content: 'hi there' };

      const result = await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_RETURN_MESSAGE);
      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        'hi there',
        false,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
    });

    it('UT-SM-09: defaults isAnnouncement to false when dto.isAnnouncement is undefined', async () => {
      const dto: CreateMessageDto = { content: 'no flag set' };

      await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(
        validationServiceMock.validateAnnouncementPermission,
      ).toHaveBeenCalledWith(false, Role.PARTICIPANT);
    });

    it('UT-SM-10: trims surrounding whitespace from dto.content before persisting the message', async () => {
      const dto: CreateMessageDto = { content: '  padded content  ' };

      await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(crudServiceMock.createMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        'padded content',
        false,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
    });

    it('UT-SM-11: passes the resolved event and caller identity through the validation pipeline in order', async () => {
      const dto: CreateMessageDto = { content: 'hello' };

      await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(validationServiceMock.validateRoomExists).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
      );
      expect(validationServiceMock.validateRoomAccess).toHaveBeenCalledWith(
        MOCK_EVENT,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
      expect(validationServiceMock.validateRoomWritable).toHaveBeenCalledWith(
        MOCK_EVENT,
      );
      expect(validationServiceMock.validateMessageContent).toHaveBeenCalledWith(
        'hello',
      );
    });
  });

  describe('getMessages', () => {
    it('UT-GM-01: throws RoomNotFoundException when room does not exist', async () => {
      validationServiceMock.validateRoomExists.mockRejectedValue(
        new RoomNotFoundException(),
      );
      const query: GetMessagesQueryDto = {};

      await expect(
        service.getMessages(
          MOCK_ROOM_ID,
          query,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
    });

    it('UT-GM-02: throws RoomAccessDeniedException when caller is not authorized', async () => {
      validationServiceMock.validateRoomAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );
      const query: GetMessagesQueryDto = {};

      await expect(
        service.getMessages(
          MOCK_ROOM_ID,
          query,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).not.toHaveBeenCalled();
    });

    it('UT-GM-03: with an explicit cursor, calls getPaginatedMessagesByCursor and skips the read-status lookup', async () => {
      const query: GetMessagesQueryDto = {
        cursor: 'message-5',
        direction: 'after',
        limit: 10,
      };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE);
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        'message-5',
        'after',
        10,
      );
    });

    it('UT-GM-04: with an explicit cursor and no direction, defaults direction to "before"', async () => {
      const query: GetMessagesQueryDto = { cursor: 'message-5' };

      await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        'message-5',
        'before',
        undefined,
      );
    });

    it('UT-GM-05: with no cursor and an existing read status, fetches messages from the last-read timestamp', async () => {
      crudServiceMock.getRoomReadStatus.mockResolvedValue(MOCK_READ_STATUS);
      const query: GetMessagesQueryDto = { limit: 20 };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE);
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_READ_STATUS.lastReadAt,
        20,
      );
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
    });

    it('UT-GM-06: with no cursor and no read status, falls through to the latest-page fetch', async () => {
      crudServiceMock.getRoomReadStatus.mockResolvedValue(null);
      const query: GetMessagesQueryDto = { limit: 20 };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE);
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        undefined,
        'before',
        20,
      );
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).not.toHaveBeenCalled();
    });
  });

  describe('markRoomAsRead', () => {
    it('UT-MR-01: throws RoomNotFoundException when room does not exist', async () => {
      validationServiceMock.validateRoomExists.mockRejectedValue(
        new RoomNotFoundException(),
      );

      await expect(
        service.markRoomAsRead(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(crudServiceMock.upsertRoomReadStatus).not.toHaveBeenCalled();
    });

    it('UT-MR-02: throws RoomAccessDeniedException when caller is not authorized', async () => {
      validationServiceMock.validateRoomAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );

      await expect(
        service.markRoomAsRead(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(crudServiceMock.upsertRoomReadStatus).not.toHaveBeenCalled();
    });

    it('UT-MR-03: for an ORGANIZER, upserts the read status keyed on organizerProfileId', async () => {
      const result = await service.markRoomAsRead(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(MOCK_ROOM_READ_STATUS_DTO);
      expect(crudServiceMock.upsertRoomReadStatus).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
    });

    it('UT-MR-04: for a PARTICIPANT, upserts the read status keyed on participantProfileId', async () => {
      const result = await service.markRoomAsRead(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_ROOM_READ_STATUS_DTO);
      expect(crudServiceMock.upsertRoomReadStatus).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
    });
  });

  describe('getCreatedDiscussionRooms', () => {
    it('UT-CR-01: filter="active" resolves to ACTIVE_ROOM_STATUSES', async () => {
      await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
        'active',
      );

      expect(
        crudServiceMock.getOrganizerEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_ORGANIZER_PROFILE_ID, ACTIVE_ROOM_STATUSES);
    });

    it('UT-CR-02: filter="archived" resolves to ARCHIVED_ROOM_STATUSES', async () => {
      await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
        'archived',
      );

      expect(
        crudServiceMock.getOrganizerEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_ORGANIZER_PROFILE_ID, ARCHIVED_ROOM_STATUSES);
    });

    it('UT-CR-03: filter omitted resolves to undefined (no status filter)', async () => {
      await service.getCreatedDiscussionRooms(MOCK_ORGANIZER_PROFILE_ID);

      expect(
        crudServiceMock.getOrganizerEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_ORGANIZER_PROFILE_ID, undefined);
    });

    it('UT-CR-04: filters out events with no discussionRoom before mapping', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
        MOCK_EVENT_WITHOUT_ROOM,
      ]);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toHaveLength(1);
      expect(result[0].roomId).toBe(MOCK_ROOM_ID);
      expect(crudServiceMock.getLatestMessageForRoom).toHaveBeenCalledTimes(1);
    });

    it('UT-CR-05: returns [] without mapping when CRUD returns no events', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([]);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([]);
      expect(crudServiceMock.getLatestMessageForRoom).not.toHaveBeenCalled();
    });

    it('UT-CR-06: composes the room DTO from lastMessage, readStatus-derived unreadCount, and writability', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      crudServiceMock.getLatestMessageForRoom.mockResolvedValue(
        MOCK_RETURN_MESSAGE,
      );
      crudServiceMock.getRoomReadStatus.mockResolvedValue(MOCK_READ_STATUS);
      crudServiceMock.countUnreadMessages.mockResolvedValue(3);
      validationServiceMock.validateRoomWritable.mockReturnValue({
        message: 'Discussion room is writable.',
      });

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([
        {
          roomId: MOCK_ROOM_ID,
          event: {
            id: MOCK_EVENT_WITH_ROOM.id,
            title: MOCK_EVENT_WITH_ROOM.title,
            bannerUrl: MOCK_EVENT_WITH_ROOM.bannerUrl,
            status: MOCK_EVENT_WITH_ROOM.status,
          },
          lastMessage: MOCK_RETURN_MESSAGE,
          unreadCount: 3,
          isReadOnly: false,
        },
      ]);
      expect(crudServiceMock.countUnreadMessages).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_READ_STATUS.lastReadAt,
      );
    });

    it('UT-CR-07: lastMessage is null when the room has no messages', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      crudServiceMock.getLatestMessageForRoom.mockResolvedValue(null);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result[0].lastMessage).toBeNull();
    });

    it('UT-CR-07b: event bannerUrl falls back to an empty string when null', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM_NO_BANNER,
      ]);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result[0].event.bannerUrl).toBe('');
    });

    it('UT-CR-08: counts unread messages from the epoch when no read status exists', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      crudServiceMock.getRoomReadStatus.mockResolvedValue(null);

      await service.getCreatedDiscussionRooms(MOCK_ORGANIZER_PROFILE_ID);

      expect(crudServiceMock.countUnreadMessages).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        new Date(0),
      );
    });

    it('UT-CR-09: isReadOnly is true when the room is not currently writable', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      validationServiceMock.validateRoomWritable.mockImplementation(() => {
        throw new RoomReadOnlyException();
      });

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result[0].isReadOnly).toBe(true);
    });
  });

  describe('getJoinedDiscussionRooms', () => {
    it('UT-JR-01: delegates to getParticipantEventsWithRoom with the caller id and resolved status filter', async () => {
      await service.getJoinedDiscussionRooms(
        MOCK_PARTICIPANT_PROFILE_ID,
        'archived',
      );

      expect(
        crudServiceMock.getParticipantEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_PARTICIPANT_PROFILE_ID, ARCHIVED_ROOM_STATUSES);
    });

    it('UT-JR-02: maps rooms using the participant role and profile id, filtering out roomless events', async () => {
      crudServiceMock.getParticipantEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
        MOCK_EVENT_WITHOUT_ROOM,
      ]);
      crudServiceMock.getLatestMessageForRoom.mockResolvedValue(
        MOCK_RETURN_MESSAGE,
      );

      const result = await service.getJoinedDiscussionRooms(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toHaveLength(1);
      expect(crudServiceMock.getRoomReadStatus).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
    });
  });

  describe('authorizeRoomJoinAccess', () => {
    it('UT-AA-01: bubbles RoomNotFoundException when the room does not exist', async () => {
      validationServiceMock.validateRoomExists.mockRejectedValue(
        new RoomNotFoundException(),
      );

      await expect(
        service.authorizeRoomJoinAccess(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomNotFoundException);
    });

    it('UT-AA-02: bubbles RoomAccessDeniedException when the caller is not authorized', async () => {
      validationServiceMock.validateRoomAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );

      await expect(
        service.authorizeRoomJoinAccess(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);
    });

    it('UT-AA-03: returns the access-confirmation message with no other side effects when authorized', async () => {
      validationServiceMock.validateRoomAccess.mockResolvedValue({
        message: 'Participant has access to this room.',
      });

      const result = await service.authorizeRoomJoinAccess(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual({
        message: 'Participant has access to this room.',
      });
      expect(validationServiceMock.validateRoomAccess).toHaveBeenCalledWith(
        MOCK_EVENT,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });
  });

  describe('findRoomByEventId', () => {
    it('UT-FR-01: returns { roomId } when a DiscussionRoom exists for the event', async () => {
      crudServiceMock.findRoomByEventId.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
      });

      const result = await service.findRoomByEventId('event-1');

      expect(result).toEqual({ roomId: MOCK_ROOM_ID });
      expect(crudServiceMock.findRoomByEventId).toHaveBeenCalledWith(
        'event-1',
      );
    });

    it('UT-FR-02: returns null when no DiscussionRoom exists for the event', async () => {
      crudServiceMock.findRoomByEventId.mockResolvedValue(null);

      const result = await service.findRoomByEventId('event-404');

      expect(result).toBeNull();
    });
  });
});
