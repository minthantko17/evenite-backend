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

const MOCK_ROOM_ID = 'e8946e7f-42a6-4586-9089-9267d0312bff';
const MOCK_ORGANIZER_PROFILE_ID = '084066b4-231a-4e1e-bb37-084d5ea66c8a';
const MOCK_PARTICIPANT_PROFILE_ID = 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44';
const MOCK_EVENT_ID = '1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8';
const MOCK_OTHER_EVENT_ID = '6a552788-764e-4613-bad0-30a595762649';
const MOCK_EVENT_ID_NO_BANNER = '3856264d-5fa6-423f-ad50-0c2950e4add5';
const MOCK_UNKNOWN_EVENT_ID = '5b53e2f2-95f3-411e-a00c-717acaed502e';
const MOCK_MESSAGE_ID = 'e9697c17-fc38-4625-aaeb-a4f43cce4e09';
const MOCK_CURSOR_ID = 'bb0d173c-621e-4065-8022-9b8b17eb9f7c';

const MOCK_EVENT: Event = {
  id: MOCK_EVENT_ID,
  organizerId: MOCK_ORGANIZER_PROFILE_ID,
  status: EventStatus.PUBLISHED,
  startAt: new Date('2026-08-01T00:00:00Z'),
  endAt: new Date('2026-08-01T02:00:00Z'),
} as Event;

const MOCK_RETURN_MESSAGE: ReturnMessageDto = {
  id: MOCK_MESSAGE_ID,
  content: 'hello world',
  isAnnouncement: false,
  sender: {
    id: MOCK_PARTICIPANT_PROFILE_ID,
    role: Role.PARTICIPANT,
    name: 'Jane Doe',
    imageUrl: '',
  },
  createdAt: new Date('2026-08-01T00:00:00Z'),
};

// distinct sentinels per crud method, so a `result` assertion alone proves
// which method's output actually flowed through — not just that "a" mocked
// page came back (both crud methods are mocked simultaneously in beforeEach)
const MOCK_MESSAGE_PAGE_BY_CURSOR: ReturnMessagePageDto = {
  messages: [MOCK_RETURN_MESSAGE],
  hasMoreOlder: false,
  hasMoreNewer: false,
  oldestCursor: MOCK_MESSAGE_ID,
  newestCursor: MOCK_MESSAGE_ID,
};

const MOCK_MESSAGE_PAGE_BY_TIMESTAMP: ReturnMessagePageDto = {
  messages: [MOCK_RETURN_MESSAGE],
  hasMoreOlder: true,
  hasMoreNewer: true,
  oldestCursor: MOCK_CURSOR_ID,
  newestCursor: MOCK_CURSOR_ID,
};

const MOCK_LAST_READ_AT = new Date('2026-08-01T01:00:00Z');
const MOCK_READ_STATUS = { lastReadAt: MOCK_LAST_READ_AT };
const MOCK_ROOM_READ_STATUS_DTO = {
  roomId: MOCK_ROOM_ID,
  lastReadAt: MOCK_LAST_READ_AT,
};

const MOCK_EVENT_WITH_ROOM = {
  id: MOCK_EVENT_ID,
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
  id: MOCK_OTHER_EVENT_ID,
  discussionRoom: null,
} as unknown as EventWithDiscussionRoom;

const MOCK_EVENT_WITH_ROOM_NO_BANNER = {
  ...MOCK_EVENT_WITH_ROOM,
  id: MOCK_EVENT_ID_NO_BANNER,
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
    crudServiceMock.getPaginatedMessagesByCursor.mockResolvedValue(
      MOCK_MESSAGE_PAGE_BY_CURSOR,
    );
    crudServiceMock.getPaginatedMessagesByTimestamp.mockResolvedValue(
      MOCK_MESSAGE_PAGE_BY_TIMESTAMP,
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
    it('UT-6-017-01: throws RoomNotFoundException when room does not exist, and skips all downstream validation', async () => {
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
      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow('Discussion room not found.');

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(
        validationServiceMock.validateMessageContent,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-6-017-02: throws RoomAccessDeniedException when caller is neither owner nor confirmed participant', async () => {
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
      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );

      expect(validationServiceMock.validateRoomWritable).not.toHaveBeenCalled();
      expect(
        validationServiceMock.validateMessageContent,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-6-017-03: throws RoomReadOnlyException when room is not writable (concluded past grace period / cancelled)', async () => {
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
      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(
        'This discussion room is read-only and no longer accepts new messages.',
      );

      expect(
        validationServiceMock.validateMessageContent,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-6-017-04: throws MessageContentInvalidException when content is empty/whitespace-only or exceeds 2000 characters', async () => {
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
      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow('Message cannot be empty.');

      expect(
        validationServiceMock.validateAnnouncementPermission,
      ).not.toHaveBeenCalled();
      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-6-017-05: throws AnnouncementNotAllowedException when a PARTICIPANT attempts to send an announcement', async () => {
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
      await expect(
        service.sendMessage(
          MOCK_ROOM_ID,
          dto,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow('Only the organizer can send announcements.');

      expect(crudServiceMock.createMessage).not.toHaveBeenCalled();
    });

    it('UT-6-017-06: creates a regular message for an ORGANIZER, setting senderOrganizerId and leaving senderParticipantId null', async () => {
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

    it('UT-6-017-07: creates an announcement for an ORGANIZER when dto.isAnnouncement is true', async () => {
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

    it('UT-6-017-08: creates a regular message for a confirmed PARTICIPANT, setting senderParticipantId and leaving senderOrganizerId null', async () => {
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

    it('UT-6-017-09: defaults isAnnouncement to false when dto.isAnnouncement is undefined', async () => {
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

    it('UT-6-017-10: trims surrounding whitespace from dto.content before persisting the message', async () => {
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

    it('UT-6-017-11: passes the resolved event and caller identity through the validation pipeline in order', async () => {
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
    it('UT-6-018-01: throws RoomNotFoundException when room does not exist', async () => {
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
      await expect(
        service.getMessages(
          MOCK_ROOM_ID,
          query,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow('Discussion room not found.');

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
    });

    it('UT-6-018-02: throws RoomAccessDeniedException when caller is not authorized', async () => {
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
      await expect(
        service.getMessages(
          MOCK_ROOM_ID,
          query,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );

      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).not.toHaveBeenCalled();
    });

    it('UT-6-018-03: with an explicit cursor, calls getPaginatedMessagesByCursor and skips the read-status lookup', async () => {
      const query: GetMessagesQueryDto = {
        cursor: MOCK_CURSOR_ID,
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

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'after',
        10,
        false,
      );
    });

    it('UT-6-018-04: with an explicit cursor and no direction, defaults direction to "before" and pageSize to DEFAULT_MESSAGE_PAGE_SIZE', async () => {
      const query: GetMessagesQueryDto = { cursor: MOCK_CURSOR_ID };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'before',
        25,
        false,
      );
    });

    it('UT-6-018-05: with no cursor and an existing read status, fetches messages from the last-read timestamp', async () => {
      crudServiceMock.getRoomReadStatus.mockResolvedValue(MOCK_READ_STATUS);
      const query: GetMessagesQueryDto = { limit: 20 };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_TIMESTAMP);
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_READ_STATUS.lastReadAt,
        20,
      );
      expect(crudServiceMock.getPaginatedMessagesByCursor).not.toHaveBeenCalled();
    });

    it('UT-6-018-06: with no cursor and no read status, falls through to the latest-page fetch', async () => {
      crudServiceMock.getRoomReadStatus.mockResolvedValue(null);
      const query: GetMessagesQueryDto = { limit: 20 };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        undefined,
        'before',
        20,
        false,
      );
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).not.toHaveBeenCalled();
    });

    it('UT-6-018-07: limit omitted + NotAnnouncement → pageSize defaults to DEFAULT_MESSAGE_PAGE_SIZE (25)', async () => {
      crudServiceMock.getRoomReadStatus.mockResolvedValue(null);
      const query: GetMessagesQueryDto = {};

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        undefined,
        'before',
        25,
        false,
      );
    });

    it('UT-6-018-08: limit omitted + Announcement → pageSize defaults to DEFAULT_ANNOUNCEMENT_PAGE_SIZE (15)', async () => {
      const query: GetMessagesQueryDto = { isAnnouncement: true };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        undefined,
        'before',
        15,
        true,
      );
    });

    it('UT-6-018-09: Announcement + NoCursor → skips the read-status lookup entirely (regardless of whether a read status exists) and calls getPaginatedMessagesByCursor', async () => {
      const query: GetMessagesQueryDto = { isAnnouncement: true, limit: 10 };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByTimestamp).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        undefined,
        'before',
        10,
        true,
      );
    });

    it('UT-6-018-10: Announcement + ExplicitCursor → calls getPaginatedMessagesByCursor with isAnnouncement=true, skips read-status lookup', async () => {
      const query: GetMessagesQueryDto = {
        cursor: MOCK_CURSOR_ID,
        direction: 'after',
        isAnnouncement: true,
        limit: 5,
      };

      const result = await service.getMessages(
        MOCK_ROOM_ID,
        query,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(MOCK_MESSAGE_PAGE_BY_CURSOR);
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'after',
        5,
        true,
      );
    });
  });

  describe('markRoomAsRead', () => {
    it('UT-6-019-01: throws RoomNotFoundException when room does not exist', async () => {
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
      await expect(
        service.markRoomAsRead(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow('Discussion room not found.');

      expect(crudServiceMock.upsertRoomReadStatus).not.toHaveBeenCalled();
    });

    it('UT-6-019-02: throws RoomAccessDeniedException when caller is not authorized', async () => {
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
      await expect(
        service.markRoomAsRead(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );

      expect(crudServiceMock.upsertRoomReadStatus).not.toHaveBeenCalled();
    });

    it('UT-6-019-03: for an ORGANIZER, upserts the read status keyed on organizerProfileId', async () => {
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

    it('UT-6-019-04: for a PARTICIPANT, upserts the read status keyed on participantProfileId', async () => {
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
    it('UT-6-020-01: filter="active" resolves to ACTIVE_ROOM_STATUSES', async () => {
      await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
        'active',
      );

      expect(
        crudServiceMock.getOrganizerEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_ORGANIZER_PROFILE_ID, ACTIVE_ROOM_STATUSES);
    });

    it('UT-6-020-02: filter="archived" resolves to ARCHIVED_ROOM_STATUSES', async () => {
      await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
        'archived',
      );

      expect(
        crudServiceMock.getOrganizerEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_ORGANIZER_PROFILE_ID, ARCHIVED_ROOM_STATUSES);
    });

    it('UT-6-020-03: filter omitted resolves to undefined (no status filter)', async () => {
      await service.getCreatedDiscussionRooms(MOCK_ORGANIZER_PROFILE_ID);

      expect(
        crudServiceMock.getOrganizerEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_ORGANIZER_PROFILE_ID, undefined);
    });

    it('UT-6-020-04: filters out events with no discussionRoom before mapping', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
        MOCK_EVENT_WITHOUT_ROOM,
      ]);

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
          lastMessage: null,
          unreadCount: 0,
          isReadOnly: false,
        },
      ]);
      expect(crudServiceMock.getLatestMessageForRoom).toHaveBeenCalledTimes(1);
    });

    it('UT-6-020-05: returns [] without mapping when CRUD returns no events', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([]);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([]);
      expect(crudServiceMock.getLatestMessageForRoom).not.toHaveBeenCalled();
    });

    it('UT-6-020-06: composes the room DTO from lastMessage, readStatus-derived unreadCount, and writability', async () => {
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

    it('UT-6-020-07: lastMessage is null when the room has no messages', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      crudServiceMock.getLatestMessageForRoom.mockResolvedValue(null);

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
          lastMessage: null,
          unreadCount: 0,
          isReadOnly: false,
        },
      ]);
    });

    it('UT-6-020-08: event bannerUrl falls back to an empty string when null', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM_NO_BANNER,
      ]);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([
        {
          roomId: MOCK_ROOM_ID,
          event: {
            id: MOCK_EVENT_WITH_ROOM_NO_BANNER.id,
            title: MOCK_EVENT_WITH_ROOM_NO_BANNER.title,
            bannerUrl: '',
            status: MOCK_EVENT_WITH_ROOM_NO_BANNER.status,
          },
          lastMessage: null,
          unreadCount: 0,
          isReadOnly: false,
        },
      ]);
    });

    it('UT-6-020-09: counts unread messages from the epoch when no read status exists', async () => {
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

    it('UT-6-020-10: isReadOnly is true when the room is not currently writable', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      validationServiceMock.validateRoomWritable.mockImplementation(() => {
        throw new RoomReadOnlyException();
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
          lastMessage: null,
          unreadCount: 0,
          isReadOnly: true,
        },
      ]);
    });
  });

  describe('getJoinedDiscussionRooms', () => {
    it('UT-6-021-01: delegates to getParticipantEventsWithRoom with the caller id and resolved status filter', async () => {
      await service.getJoinedDiscussionRooms(
        MOCK_PARTICIPANT_PROFILE_ID,
        'archived',
      );

      expect(
        crudServiceMock.getParticipantEventsWithRoom,
      ).toHaveBeenCalledWith(MOCK_PARTICIPANT_PROFILE_ID, ARCHIVED_ROOM_STATUSES);
    });

    it('UT-6-021-02: maps rooms using the participant role and profile id, filtering out roomless events', async () => {
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
          unreadCount: 0,
          isReadOnly: false,
        },
      ]);
      expect(crudServiceMock.getRoomReadStatus).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );
    });
  });

  describe('authorizeRoomJoinAccess', () => {
    it('UT-6-026-01: bubbles RoomNotFoundException when the room does not exist', async () => {
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
      await expect(
        service.authorizeRoomJoinAccess(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow('Discussion room not found.');
    });

    it('UT-6-026-02: bubbles RoomAccessDeniedException when the caller is not authorized', async () => {
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
      await expect(
        service.authorizeRoomJoinAccess(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
    });

    it('UT-6-026-03: returns the access-confirmation message with no other side effects when authorized', async () => {
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
    it('UT-6-027-01: returns { roomId } when a DiscussionRoom exists for the event', async () => {
      crudServiceMock.findRoomByEventId.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
      });

      const result = await service.findRoomByEventId(MOCK_EVENT_ID);

      expect(result).toEqual({ roomId: MOCK_ROOM_ID });
      expect(crudServiceMock.findRoomByEventId).toHaveBeenCalledWith(
        MOCK_EVENT_ID,
      );
    });

    it('UT-6-027-02: returns null when no DiscussionRoom exists for the event', async () => {
      crudServiceMock.findRoomByEventId.mockResolvedValue(null);

      const result = await service.findRoomByEventId(MOCK_UNKNOWN_EVENT_ID);

      expect(result).toBeNull();
    });
  });
});
