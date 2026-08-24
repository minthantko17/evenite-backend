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
import { ReturnRoomReadStatusDto } from './dto/return-room-read-status.dto';
import { ReturnDiscussionRoomListDto } from './dto/return-discussion-room-list.dto';
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
const MOCK_CURSOR_ID = 'bb0d173c-621e-4065-8022-9b8b17eb9f7c';

// message ids are unique per authoring scenario so an assertion on `result`
// actually proves which sender/branch produced it, rather than just proving
// "a" mocked message came back
const MOCK_ORGANIZER_MESSAGE_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_ANNOUNCEMENT_MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const MOCK_PARTICIPANT_MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const MOCK_DEFAULT_MESSAGE_ID = '44444444-4444-4444-8444-444444444444';

// ---- base factories -------------------------------------------------------
// Each factory returns a fresh object with sane defaults; tests pass only the
// overrides that matter for that scenario, keeping fixtures self-explanatory
// instead of reaching for one ambiguous shared constant.

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: MOCK_EVENT_ID,
    organizerId: MOCK_ORGANIZER_PROFILE_ID,
    status: EventStatus.PUBLISHED,
    startAt: new Date('2026-08-01T00:00:00Z'),
    endAt: new Date('2026-08-01T02:00:00Z'),
    ...overrides,
  } as Event;
}

function buildSender(
  role: Role,
  overrides: Partial<ReturnMessageDto['sender']> = {},
): ReturnMessageDto['sender'] {
  const base =
    role === Role.ORGANIZER
      ? { id: MOCK_ORGANIZER_PROFILE_ID, role: Role.ORGANIZER, name: 'Alex Organizer' }
      : { id: MOCK_PARTICIPANT_PROFILE_ID, role: Role.PARTICIPANT, name: 'Jane Doe' };
  return { ...base, imageUrl: '', ...overrides };
}

function buildReturnMessage(
  overrides: Partial<ReturnMessageDto> = {},
): ReturnMessageDto {
  return {
    id: MOCK_DEFAULT_MESSAGE_ID,
    content: 'hello world',
    isAnnouncement: false,
    sender: buildSender(Role.PARTICIPANT),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

function buildRoomReadStatusDto(
  overrides: Partial<ReturnRoomReadStatusDto> = {},
): ReturnRoomReadStatusDto {
  return {
    roomId: MOCK_ROOM_ID,
    lastReadMessageId: null,
    ...overrides,
  };
}

function buildEventWithRoom(
  overrides: Partial<EventWithDiscussionRoom> = {},
): EventWithDiscussionRoom {
  return {
    id: MOCK_EVENT_ID,
    organizerId: MOCK_ORGANIZER_PROFILE_ID,
    status: EventStatus.PUBLISHED,
    startAt: new Date('2026-08-01T00:00:00Z'),
    endAt: new Date('2026-08-01T02:00:00Z'),
    title: { en: 'Orientation', th: 'ปฐมนิเทศ' },
    bannerUrl: 'banner.png',
    discussionRoom: { id: MOCK_ROOM_ID },
    ...overrides,
  } as unknown as EventWithDiscussionRoom;
}

function buildRoomListDto(
  event: EventWithDiscussionRoom,
  overrides: Partial<ReturnDiscussionRoomListDto> = {},
): ReturnDiscussionRoomListDto {
  return {
    roomId: event.discussionRoom!.id,
    event: {
      id: event.id,
      title: event.title as unknown as ReturnDiscussionRoomListDto['event']['title'],
      bannerUrl: event.bannerUrl ?? '',
      status: event.status,
    },
    lastMessage: null,
    unreadCount: 0,
    isReadOnly: false,
    ...overrides,
  };
}

// sentinel pages so a `result` assertion proves which crud method's output
// actually flowed through (both crud methods are mocked simultaneously)
const MOCK_MESSAGE_PAGE_BY_CURSOR: ReturnMessagePageDto = {
  messages: [buildReturnMessage({ id: 'cursor-page-message-id' })],
  hasMoreOlder: false,
  hasMoreNewer: false,
  oldestCursor: 'cursor-page-oldest',
  newestCursor: 'cursor-page-newest',
};

const MOCK_EVENT: Event = buildEvent();
const MOCK_EVENT_WITH_ROOM = buildEventWithRoom();
const MOCK_EVENT_WITHOUT_ROOM = buildEventWithRoom({
  id: MOCK_OTHER_EVENT_ID,
  discussionRoom: null,
});
const MOCK_EVENT_WITH_ROOM_NO_BANNER = buildEventWithRoom({
  id: MOCK_EVENT_ID_NO_BANNER,
  bannerUrl: null,
});

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
    crudServiceMock.createMessage.mockResolvedValue(buildReturnMessage());
    crudServiceMock.getPaginatedMessagesByCursor.mockResolvedValue(
      MOCK_MESSAGE_PAGE_BY_CURSOR,
    );
    crudServiceMock.getRoomReadStatus.mockResolvedValue(null);
    crudServiceMock.upsertLastReadMessage.mockResolvedValue(
      buildRoomReadStatusDto(),
    );
    crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([]);
    crudServiceMock.getParticipantEventsWithRoom.mockResolvedValue([]);
    crudServiceMock.getLatestMessageForRoom.mockResolvedValue(null);
    crudServiceMock.countUnreadMessages.mockResolvedValue(0);
    crudServiceMock.findRoomByEventId.mockResolvedValue(null);
    crudServiceMock.getLatestAnnouncements.mockResolvedValue([]);

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
      const expectedMessage = buildReturnMessage({
        id: MOCK_ORGANIZER_MESSAGE_ID,
        content: 'hello',
        sender: buildSender(Role.ORGANIZER),
      });
      crudServiceMock.createMessage.mockResolvedValue(expectedMessage);
      const dto: CreateMessageDto = { content: 'hello' };

      const result = await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(expectedMessage);
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
      const expectedMessage = buildReturnMessage({
        id: MOCK_ANNOUNCEMENT_MESSAGE_ID,
        content: 'important update',
        isAnnouncement: true,
        sender: buildSender(Role.ORGANIZER),
      });
      crudServiceMock.createMessage.mockResolvedValue(expectedMessage);
      const dto: CreateMessageDto = {
        content: 'important update',
        isAnnouncement: true,
      };

      const result = await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(expectedMessage);
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
      const expectedMessage = buildReturnMessage({
        id: MOCK_PARTICIPANT_MESSAGE_ID,
        content: 'hi there',
        sender: buildSender(Role.PARTICIPANT),
      });
      crudServiceMock.createMessage.mockResolvedValue(expectedMessage);
      const dto: CreateMessageDto = { content: 'hi there' };

      const result = await service.sendMessage(
        MOCK_ROOM_ID,
        dto,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(expectedMessage);
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
      expect(crudServiceMock.getPaginatedMessagesByCursor).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'before',
        25,
      );
    });

    it('UT-6-018-05: with no cursor and an existing read status with a lastReadMessageId, resumes via getPaginatedMessagesByCursor(after)', async () => {
      const readStatus = {
        lastReadMessageId: MOCK_CURSOR_ID,
      };
      crudServiceMock.getRoomReadStatus.mockResolvedValue(readStatus);
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
        MOCK_CURSOR_ID,
        'after',
        20,
      );
    });

    it('UT-6-018-05b: with no cursor and a read status whose lastReadMessageId is null (room was empty at last read), falls through to the latest-page fetch', async () => {
      const readStatus = {
        lastReadMessageId: null,
      };
      crudServiceMock.getRoomReadStatus.mockResolvedValue(readStatus);
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
      );
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
      );
    });

    it('UT-6-018-07: limit omitted → pageSize defaults to DEFAULT_MESSAGE_PAGE_SIZE (25)', async () => {
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
      );
    });
  });

  describe('getAnnouncements', () => {
    it('UT-6-018a-01: throws RoomNotFoundException when room does not exist', async () => {
      validationServiceMock.validateRoomExists.mockRejectedValue(
        new RoomNotFoundException(),
      );

      await expect(
        service.getAnnouncements(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomNotFoundException);

      expect(validationServiceMock.validateRoomAccess).not.toHaveBeenCalled();
      expect(
        crudServiceMock.getLatestAnnouncements,
      ).not.toHaveBeenCalled();
    });

    it('UT-6-018a-02: throws RoomAccessDeniedException when caller is not authorized', async () => {
      validationServiceMock.validateRoomAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );

      await expect(
        service.getAnnouncements(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);

      expect(
        crudServiceMock.getLatestAnnouncements,
      ).not.toHaveBeenCalled();
    });

    it('UT-6-018a-03: delegates straight to DiscussionCrudService.getLatestAnnouncements(roomId, MAX_ANNOUNCEMENT_COUNT)', async () => {
      const announcements = [
        buildReturnMessage({ id: 'announcement-1', isAnnouncement: true }),
      ];
      crudServiceMock.getLatestAnnouncements.mockResolvedValue(
        announcements,
      );

      const result = await service.getAnnouncements(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(announcements);
      expect(crudServiceMock.getRoomReadStatus).not.toHaveBeenCalled();
      expect(
        crudServiceMock.getLatestAnnouncements,
      ).toHaveBeenCalledWith(MOCK_ROOM_ID, 15);
    });
  });

  describe('updateLastReadMessage', () => {
    it('UT-6-019-01: throws RoomNotFoundException when room does not exist', async () => {
      validationServiceMock.validateRoomExists.mockRejectedValue(
        new RoomNotFoundException(),
      );

      await expect(
        service.updateLastReadMessage(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
          undefined,
        ),
      ).rejects.toThrow(RoomNotFoundException);
      await expect(
        service.updateLastReadMessage(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
          undefined,
        ),
      ).rejects.toThrow('Discussion room not found.');

      expect(crudServiceMock.upsertLastReadMessage).not.toHaveBeenCalled();
    });

    it('UT-6-019-02: throws RoomAccessDeniedException when caller is not authorized', async () => {
      validationServiceMock.validateRoomAccess.mockRejectedValue(
        new RoomAccessDeniedException(),
      );

      await expect(
        service.updateLastReadMessage(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
          undefined,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);
      await expect(
        service.updateLastReadMessage(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
          undefined,
        ),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );

      expect(crudServiceMock.upsertLastReadMessage).not.toHaveBeenCalled();
    });

    it('UT-6-019-03: for an ORGANIZER, upserts the read status keyed on organizerProfileId, passing lastReadMessageId through', async () => {
      // distinct message id from the PARTICIPANT case below, so a swapped-args
      // regression (e.g. organizerId passed into the participant slot) would
      // surface as a result mismatch, not just pass because both share one dto
      const expectedStatus = buildRoomReadStatusDto({
        lastReadMessageId: 'mark-as-read-organizer-message-id',
      });
      crudServiceMock.upsertLastReadMessage.mockResolvedValue(expectedStatus);

      const result = await service.updateLastReadMessage(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
        'mark-as-read-organizer-message-id',
      );

      expect(result).toEqual(expectedStatus);
      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
        'mark-as-read-organizer-message-id',
      );
    });

    it('UT-6-019-04: for a PARTICIPANT, upserts the read status keyed on participantProfileId, passing lastReadMessageId through', async () => {
      const expectedStatus = buildRoomReadStatusDto({
        lastReadMessageId: 'mark-as-read-participant-message-id',
      });
      crudServiceMock.upsertLastReadMessage.mockResolvedValue(expectedStatus);

      const result = await service.updateLastReadMessage(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        'mark-as-read-participant-message-id',
      );

      expect(result).toEqual(expectedStatus);
      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        'mark-as-read-participant-message-id',
      );
    });

    it('UT-6-019-05: lastReadMessageId omitted → passes undefined through to upsertLastReadMessage', async () => {
      const expectedStatus = buildRoomReadStatusDto({
        lastReadMessageId: null,
      });
      crudServiceMock.upsertLastReadMessage.mockResolvedValue(expectedStatus);

      const result = await service.updateLastReadMessage(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        undefined,
      );

      expect(result).toEqual(expectedStatus);
      expect(crudServiceMock.upsertLastReadMessage).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        undefined,
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

      expect(result).toEqual([buildRoomListDto(MOCK_EVENT_WITH_ROOM)]);
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

    it('UT-6-020-06: composes the room DTO from lastMessage, readStatus-derived unreadCount, and writability, reading the status keyed on the ORGANIZER caller', async () => {
      const latestMessage = buildReturnMessage({
        id: 'created-rooms-latest-message-id',
        sender: buildSender(Role.PARTICIPANT),
      });
      const readStatus = {
        lastReadMessageId: 'created-rooms-latest-message-id',
      };
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      crudServiceMock.getLatestMessageForRoom.mockResolvedValue(latestMessage);
      crudServiceMock.getRoomReadStatus.mockResolvedValue(readStatus);
      crudServiceMock.countUnreadMessages.mockResolvedValue(3);
      validationServiceMock.validateRoomWritable.mockReturnValue({
        message: 'Discussion room is writable.',
      });

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([
        buildRoomListDto(MOCK_EVENT_WITH_ROOM, {
          lastMessage: latestMessage,
          unreadCount: 3,
        }),
      ]);
      // pins the caller identity actually forwarded into the read-status
      // lookup, catching a regression that swaps organizer/participant slots
      expect(crudServiceMock.getRoomReadStatus).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );
      expect(crudServiceMock.countUnreadMessages).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        readStatus.lastReadMessageId,
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

      expect(result).toEqual([buildRoomListDto(MOCK_EVENT_WITH_ROOM)]);
    });

    it('UT-6-020-08: event bannerUrl falls back to an empty string when null', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM_NO_BANNER,
      ]);

      const result = await service.getCreatedDiscussionRooms(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([
        buildRoomListDto(MOCK_EVENT_WITH_ROOM_NO_BANNER),
      ]);
    });

    it('UT-6-020-09: counts unread messages with a null lastReadMessageId when no read status exists', async () => {
      crudServiceMock.getOrganizerEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
      ]);
      crudServiceMock.getRoomReadStatus.mockResolvedValue(null);

      await service.getCreatedDiscussionRooms(MOCK_ORGANIZER_PROFILE_ID);

      expect(crudServiceMock.countUnreadMessages).toHaveBeenCalledWith(
        MOCK_ROOM_ID,
        null,
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
        buildRoomListDto(MOCK_EVENT_WITH_ROOM, { isReadOnly: true }),
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
      const latestMessage = buildReturnMessage({
        id: 'joined-rooms-latest-message-id',
        sender: buildSender(Role.ORGANIZER),
      });
      crudServiceMock.getParticipantEventsWithRoom.mockResolvedValue([
        MOCK_EVENT_WITH_ROOM,
        MOCK_EVENT_WITHOUT_ROOM,
      ]);
      crudServiceMock.getLatestMessageForRoom.mockResolvedValue(latestMessage);

      const result = await service.getJoinedDiscussionRooms(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual([
        buildRoomListDto(MOCK_EVENT_WITH_ROOM, { lastMessage: latestMessage }),
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
