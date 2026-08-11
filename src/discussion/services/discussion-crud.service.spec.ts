import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';
import { EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscussionCrudService } from './discussion-crud.service';
import { ReturnMessageDto } from '../dto/return-message.dto';
import { SaveMessageException } from '../exceptions/save-message.exception';
import { SaveRoomReadStatusException } from '../exceptions/save-room-read-status.exception';

const MOCK_ROOM_ID = 'room-1';
const MOCK_EVENT_ID = 'event-1';
const MOCK_PARTICIPANT_PROFILE_ID = 'participant-1';
const MOCK_ORGANIZER_PROFILE_ID = 'organizer-1';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 25;

const buildRawMessage = (overrides: Record<string, any> = {}) => ({
  id: 'message-1',
  roomId: MOCK_ROOM_ID,
  content: 'hello world',
  isAnnouncement: false,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  senderParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
  senderOrganizerId: null,
  senderParticipant: {
    id: MOCK_PARTICIPANT_PROFILE_ID,
    firstName: 'Jane',
    nickname: 'JJ',
    imageUrl: 'jane.png',
  },
  senderOrganizer: null,
  ...overrides,
});

const buildRawMessages = (count: number, prefix = 'message') =>
  Array.from({ length: count }, (_, i) =>
    buildRawMessage({
      id: `${prefix}-${i}`,
      createdAt: new Date(2026, 7, 1, 0, i),
    }),
  );

// mirrors DiscussionCrudService's private mapToReturnMessageDto, so expectations
// are derived from the same raw fixture rather than hand-duplicated per test
const mapRawToExpected = (raw: Record<string, any>): ReturnMessageDto => ({
  id: raw.id,
  content: raw.content,
  isAnnouncement: raw.isAnnouncement,
  sender: raw.senderOrganizerId
    ? {
        id: raw.senderOrganizer.id,
        role: Role.ORGANIZER,
        name: raw.senderOrganizer.name ?? '',
        imageUrl: raw.senderOrganizer.imageUrl ?? '',
      }
    : {
        id: raw.senderParticipant.id,
        role: Role.PARTICIPANT,
        name:
          raw.senderParticipant.nickname ||
          raw.senderParticipant.firstName ||
          '',
        imageUrl: raw.senderParticipant.imageUrl ?? '',
      },
  createdAt: raw.createdAt,
});

const prismaMock = mockDeep<PrismaService>();

describe('DiscussionCrudService', () => {
  let service: DiscussionCrudService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    mockReset(prismaMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionCrudService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DiscussionCrudService>(DiscussionCrudService);
  });

  describe('createMessage', () => {
    it('UT-CM-01: FromParticipant + NotAnnouncement + CreateSucceeds → sender.role = PARTICIPANT', async () => {
      const raw = buildRawMessage({
        senderParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
        senderOrganizerId: null,
        isAnnouncement: false,
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hello world',
        false,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            roomId: MOCK_ROOM_ID,
            content: 'hello world',
            isAnnouncement: false,
            senderParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
            senderOrganizerId: null,
          },
        }),
      );
    });

    it('UT-CM-02: FromOrganizer + Announcement + CreateSucceeds → sender.role = ORGANIZER, isAnnouncement: true', async () => {
      const raw = buildRawMessage({
        senderParticipantId: null,
        senderOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
        senderParticipant: null,
        senderOrganizer: {
          id: MOCK_ORGANIZER_PROFILE_ID,
          name: 'Org Name',
          imageUrl: 'org.png',
        },
        isAnnouncement: true,
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'announcement text',
        true,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(mapRawToExpected(raw));
    });

    it('UT-CM-03: participant sender with nickname present → sender.name = nickname (preferred over firstName)', async () => {
      const raw = buildRawMessage({
        senderParticipant: {
          id: MOCK_PARTICIPANT_PROFILE_ID,
          firstName: 'Jane',
          nickname: 'JJ',
          imageUrl: 'jane.png',
        },
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hi',
        false,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(result.sender.name).toBe('JJ');
    });

    it('UT-CM-04: participant sender with nickname null/empty → sender.name = firstName (fallback)', async () => {
      const raw = buildRawMessage({
        senderParticipant: {
          id: MOCK_PARTICIPANT_PROFILE_ID,
          firstName: 'Jane',
          nickname: '',
          imageUrl: 'jane.png',
        },
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hi',
        false,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(result.sender.name).toBe('Jane');
    });

    it("UT-CM-05: participant sender with both nickname and firstName empty → sender.name = ''", async () => {
      const raw = buildRawMessage({
        senderParticipant: {
          id: MOCK_PARTICIPANT_PROFILE_ID,
          firstName: '',
          nickname: '',
          imageUrl: 'jane.png',
        },
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hi',
        false,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(result.sender.name).toBe('');
    });

    it("UT-CM-06: organizer sender with imageUrl null → sender.imageUrl = ''", async () => {
      const raw = buildRawMessage({
        senderParticipantId: null,
        senderOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
        senderParticipant: null,
        senderOrganizer: {
          id: MOCK_ORGANIZER_PROFILE_ID,
          name: 'Org Name',
          imageUrl: null,
        },
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hi',
        false,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(result.sender.imageUrl).toBe('');
    });

    it("UT-CM-08: organizer sender with name null → sender.name = ''", async () => {
      const raw = buildRawMessage({
        senderParticipantId: null,
        senderOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
        senderParticipant: null,
        senderOrganizer: {
          id: MOCK_ORGANIZER_PROFILE_ID,
          name: null,
          imageUrl: 'org.png',
        },
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hi',
        false,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(result.sender.name).toBe('');
    });

    it("UT-CM-09: participant sender with imageUrl null → sender.imageUrl = ''", async () => {
      const raw = buildRawMessage({
        senderParticipant: {
          id: MOCK_PARTICIPANT_PROFILE_ID,
          firstName: 'Jane',
          nickname: 'JJ',
          imageUrl: null,
        },
      });
      prismaMock.message.create.mockResolvedValue(raw as any);

      const result = await service.createMessage(
        MOCK_ROOM_ID,
        'hi',
        false,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual(mapRawToExpected(raw));
      expect(result.sender.imageUrl).toBe('');
    });

    it('UT-CM-07: any sender combination + CreateThrows → throws SaveMessageException, logs error', async () => {
      prismaMock.message.create.mockRejectedValue(new Error('DB down'));

      const attempt = () =>
        service.createMessage(
          MOCK_ROOM_ID,
          'hi',
          false,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        );

      await expect(attempt()).rejects.toThrow(SaveMessageException);
      await expect(attempt()).rejects.toThrow(
        'Failed to save message. Please try again.',
      );
    });
  });

  describe('getPaginatedMessagesByCursor', () => {
    it('UT-GMP-01: Before + HasCursor + MorePages → hasMoreOlder=true, hasMoreNewer=true, page reversed to ascending', async () => {
      const raws = buildRawMessages(26);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        'cursor-1',
        'before',
        undefined,
      );

      const orderedPage = raws.slice(0, 25).reverse();
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: 'message-24',
        newestCursor: 'message-0',
      });
    });

    it('UT-GMP-02: Before + HasCursor + NoMorePages → hasMoreOlder=false, hasMoreNewer=true', async () => {
      const raws = buildRawMessages(5);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        'cursor-1',
        'before',
        10,
      );

      const orderedPage = [...raws].reverse();
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: 'message-4',
        newestCursor: 'message-0',
      });
    });

    it('UT-GMP-03: Before + NoCursor + MorePages → hasMoreOlder=true, hasMoreNewer=false (initial latest-page load)', async () => {
      const raws = buildRawMessages(11);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        undefined,
        'before',
        10,
      );

      const orderedPage = raws.slice(0, 10).reverse();
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: 'message-9',
        newestCursor: 'message-0',
      });
    });

    it('UT-GMP-04: Before + NoCursor + NoMorePages → hasMoreOlder=false, hasMoreNewer=false (room has <= take messages total)', async () => {
      const raws = buildRawMessages(3);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        undefined,
        'before',
        10,
      );

      const orderedPage = [...raws].reverse();
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: false,
        oldestCursor: 'message-2',
        newestCursor: 'message-0',
      });
    });

    it('UT-GMP-05: After + HasCursor + MorePages → hasMoreOlder=true, hasMoreNewer=true', async () => {
      const raws = buildRawMessages(11);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        'cursor-1',
        'after',
        10,
      );

      const orderedPage = raws.slice(0, 10);
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: 'message-0',
        newestCursor: 'message-9',
      });
    });

    it('UT-GMP-06: After + HasCursor + NoMorePages → hasMoreOlder=true, hasMoreNewer=false', async () => {
      const raws = buildRawMessages(3);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        'cursor-1',
        'after',
        10,
      );

      expect(result).toEqual({
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: 'message-0',
        newestCursor: 'message-2',
      });
    });

    it('UT-GMP-07: After + NoCursor + MorePages → hasMoreOlder=false, hasMoreNewer=true (edge case: after with no cursor)', async () => {
      const raws = buildRawMessages(11);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        undefined,
        'after',
        10,
      );

      const orderedPage = raws.slice(0, 10);
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: 'message-0',
        newestCursor: 'message-9',
      });
    });

    it('UT-GMP-08: After + NoCursor + NoMorePages → hasMoreOlder=false, hasMoreNewer=false', async () => {
      const raws = buildRawMessages(3);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        undefined,
        'after',
        10,
      );

      expect(result).toEqual({
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: false,
        oldestCursor: 'message-0',
        newestCursor: 'message-2',
      });
    });

    it('UT-GMP-09: Before + HasCursor + EmptyPage → oldestCursor = newestCursor = input cursor (fallback)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        'cursor-1',
        'before',
        10,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: 'cursor-1',
        newestCursor: 'cursor-1',
      });
    });

    it('UT-GMP-10: After + HasCursor + EmptyPage → oldestCursor = newestCursor = input cursor (fallback)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        'cursor-1',
        'after',
        10,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: 'cursor-1',
        newestCursor: 'cursor-1',
      });
    });

    it('UT-GMP-11: DefaultLimit (undefined) → take = DEFAULT_PAGE_SIZE used in the Prisma call', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        undefined,
        'before',
        undefined,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: false,
        hasMoreNewer: false,
        oldestCursor: null,
        newestCursor: null,
      });
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: DEFAULT_PAGE_SIZE + 1 }),
      );
    });

    it('UT-GMP-12: CustomLimit (<= MAX_PAGE_SIZE) → take = provided limit', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      await service.getPaginatedMessagesByCursor(MOCK_ROOM_ID, undefined, 'before', 5);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      );
    });

    it('UT-GMP-13: ClampedLimit (> MAX_PAGE_SIZE) → take = MAX_PAGE_SIZE', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      await service.getPaginatedMessagesByCursor(MOCK_ROOM_ID, undefined, 'before', 999);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: MAX_PAGE_SIZE + 1 }),
      );
    });
  });

  describe('getPaginatedMessagesByTimestamp', () => {
    const lastReadAt = new Date('2026-08-01T00:05:00Z');

    it('UT-GFT-01: AnchorFound + NoMoreNewer → hasMoreOlder=true (always), hasMoreNewer=false', async () => {
      prismaMock.message.findFirst.mockResolvedValue(
        buildRawMessage({ createdAt: lastReadAt }) as any,
      );
      const raws = buildRawMessages(3);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByTimestamp(
        MOCK_ROOM_ID,
        lastReadAt,
        10,
      );

      expect(result).toEqual({
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: 'message-0',
        newestCursor: 'message-2',
      });
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roomId: MOCK_ROOM_ID, createdAt: { gte: lastReadAt } },
        }),
      );
    });

    it('UT-GFT-02: AnchorFound + MoreNewer → returns take messages starting at anchor, hasMoreNewer=true', async () => {
      prismaMock.message.findFirst.mockResolvedValue(
        buildRawMessage({ createdAt: lastReadAt }) as any,
      );
      const raws = buildRawMessages(11);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByTimestamp(
        MOCK_ROOM_ID,
        lastReadAt,
        10,
      );

      const page = raws.slice(0, 10);
      expect(result).toEqual({
        messages: page.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: 'message-0',
        newestCursor: 'message-9',
      });
    });

    it('UT-GFT-03: NoAnchor + room has messages → anchorTime=epoch, returns from the very beginning of the room', async () => {
      prismaMock.message.findFirst.mockResolvedValue(null);
      const raws = buildRawMessages(3);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByTimestamp(
        MOCK_ROOM_ID,
        lastReadAt,
        10,
      );

      expect(result).toEqual({
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: 'message-0',
        newestCursor: 'message-2',
      });
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roomId: MOCK_ROOM_ID, createdAt: { gte: new Date(0) } },
        }),
      );
    });

    it('UT-GFT-04: NoAnchor + room empty → EmptyResult, messages=[], cursors=null, hasMoreOlder=true', async () => {
      prismaMock.message.findFirst.mockResolvedValue(null);
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByTimestamp(
        MOCK_ROOM_ID,
        lastReadAt,
        10,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: null,
        newestCursor: null,
      });
    });

    it('UT-GFT-05: limit omitted → take = DEFAULT_PAGE_SIZE used in the Prisma call', async () => {
      prismaMock.message.findFirst.mockResolvedValue(null);
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByTimestamp(
        MOCK_ROOM_ID,
        lastReadAt,
        undefined,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: null,
        newestCursor: null,
      });
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: DEFAULT_PAGE_SIZE + 1 }),
      );
    });
  });

  describe('getLatestMessageForRoom', () => {
    it('UT-LM-01: room has at least one message → returns mapped latest ReturnMessageDto', async () => {
      const raw = buildRawMessage();
      prismaMock.message.findFirst.mockResolvedValue(raw as any);

      const result = await service.getLatestMessageForRoom(MOCK_ROOM_ID);

      expect(result).toEqual(mapRawToExpected(raw));
    });

    it('UT-LM-02: room has zero messages → returns null', async () => {
      prismaMock.message.findFirst.mockResolvedValue(null);

      const result = await service.getLatestMessageForRoom(MOCK_ROOM_ID);

      expect(result).toBeNull();
    });
  });

  describe('upsertRoomReadStatus', () => {
    it('UT-UR-01: RoleOrganizer → upserts keyed on roomId_readerOrganizerId, readerOrganizerId set, readerParticipantId null', async () => {
      const lastReadAt = new Date('2026-08-01T00:00:00Z');
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadAt,
      } as any);

      const result = await service.upsertRoomReadStatus(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual({ roomId: MOCK_ROOM_ID, lastReadAt });
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith({
        where: {
          roomId_readerOrganizerId: {
            roomId: MOCK_ROOM_ID,
            readerOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
          },
        },
        create: {
          roomId: MOCK_ROOM_ID,
          readerParticipantId: null,
          readerOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
          lastReadAt: expect.any(Date),
        },
        update: { lastReadAt: expect.any(Date) },
      });
    });

    it('UT-UR-02: RoleParticipant → upserts keyed on roomId_readerParticipantId, readerParticipantId set, readerOrganizerId null', async () => {
      const lastReadAt = new Date('2026-08-01T00:00:00Z');
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadAt,
      } as any);

      const result = await service.upsertRoomReadStatus(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual({ roomId: MOCK_ROOM_ID, lastReadAt });
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith({
        where: {
          roomId_readerParticipantId: {
            roomId: MOCK_ROOM_ID,
            readerParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
          },
        },
        create: {
          roomId: MOCK_ROOM_ID,
          readerParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
          readerOrganizerId: null,
          lastReadAt: expect.any(Date),
        },
        update: { lastReadAt: expect.any(Date) },
      });
    });

    it('UT-UR-03: any role/row combination + UpsertThrows → throws SaveRoomReadStatusException, logs error', async () => {
      prismaMock.roomReadStatus.upsert.mockRejectedValue(new Error('DB down'));

      const attempt = () =>
        service.upsertRoomReadStatus(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        );

      await expect(attempt()).rejects.toThrow(SaveRoomReadStatusException);
      await expect(attempt()).rejects.toThrow(
        'Failed to update read status. Please try again.',
      );
    });
  });

  describe('getRoomReadStatus', () => {
    it('UT-RS-01: RoleOrganizer + Found → returns lastReadAt, queried by roomId_readerOrganizerId', async () => {
      const lastReadAt = new Date('2026-08-01T00:00:00Z');
      prismaMock.roomReadStatus.findUnique.mockResolvedValue({
        lastReadAt,
      } as any);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual({ lastReadAt });
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_readerOrganizerId: {
            roomId: MOCK_ROOM_ID,
            readerOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
          },
        },
      });
    });

    it('UT-RS-02: RoleOrganizer + NotFound → returns null', async () => {
      prismaMock.roomReadStatus.findUnique.mockResolvedValue(null);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toBeNull();
    });

    it('UT-RS-03: RoleParticipant + Found → returns lastReadAt, queried by roomId_readerParticipantId', async () => {
      const lastReadAt = new Date('2026-08-01T00:00:00Z');
      prismaMock.roomReadStatus.findUnique.mockResolvedValue({
        lastReadAt,
      } as any);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual({ lastReadAt });
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_readerParticipantId: {
            roomId: MOCK_ROOM_ID,
            readerParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
          },
        },
      });
    });

    it('UT-RS-04: RoleParticipant + NotFound → returns null', async () => {
      prismaMock.roomReadStatus.findUnique.mockResolvedValue(null);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toBeNull();
    });
  });

  describe('countUnreadMessages', () => {
    it('UT-CU-01: count > 0 → returns that number', async () => {
      prismaMock.message.count.mockResolvedValue(4);

      const result = await service.countUnreadMessages(
        MOCK_ROOM_ID,
        new Date('2026-08-01T00:00:00Z'),
      );

      expect(result).toBe(4);
    });

    it('UT-CU-02: count == 0 → returns 0', async () => {
      prismaMock.message.count.mockResolvedValue(0);

      const result = await service.countUnreadMessages(
        MOCK_ROOM_ID,
        new Date('2026-08-01T00:00:00Z'),
      );

      expect(result).toBe(0);
    });
  });

  describe('getParticipantEventsWithRoom', () => {
    const buildRegistration = (eventOverrides: Record<string, any> = {}) => ({
      event: {
        id: MOCK_EVENT_ID,
        status: EventStatus.PUBLISHED,
        discussionRoom: { id: MOCK_ROOM_ID },
        ...eventOverrides,
      },
    });

    it('UT-PE-01: HasFilter + HasRegistrations → query includes status filter, returns extracted events', async () => {
      prismaMock.eventRegistration.findMany.mockResolvedValue([
        buildRegistration(),
      ] as any);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
        [EventStatus.PUBLISHED, EventStatus.ONGOING],
      );

      expect(result).toEqual([buildRegistration().event]);
      expect(prismaMock.eventRegistration.findMany).toHaveBeenCalledWith({
        where: {
          participantId: MOCK_PARTICIPANT_PROFILE_ID,
          status: 'CONFIRMED',
          event: { status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING] } },
        },
        include: { event: { include: { discussionRoom: true } } },
      });
    });

    it('UT-PE-02: NoFilter + HasRegistrations → query has no status filter, returns extracted events', async () => {
      prismaMock.eventRegistration.findMany.mockResolvedValue([
        buildRegistration(),
      ] as any);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual([buildRegistration().event]);
      expect(prismaMock.eventRegistration.findMany).toHaveBeenCalledWith({
        where: {
          participantId: MOCK_PARTICIPANT_PROFILE_ID,
          status: 'CONFIRMED',
        },
        include: { event: { include: { discussionRoom: true } } },
      });
    });

    it('UT-PE-03: zero registrations found → returns [] (filter-independent)', async () => {
      prismaMock.eventRegistration.findMany.mockResolvedValue([]);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual([]);
    });

    it('UT-PE-04: mix of RoomPresent/RoomAbsent → method returns both as-is, unfiltered', async () => {
      const withRoom = buildRegistration();
      const withoutRoom = buildRegistration({
        id: 'event-2',
        discussionRoom: null,
      });
      prismaMock.eventRegistration.findMany.mockResolvedValue([
        withRoom,
        withoutRoom,
      ] as any);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual([withRoom.event, withoutRoom.event]);
    });
  });

  describe('getOrganizerEventsWithRoom', () => {
    it('UT-OE-01: HasFilter + HasEvents → query includes status filter', async () => {
      const events = [{ id: MOCK_EVENT_ID, discussionRoom: { id: MOCK_ROOM_ID } }];
      prismaMock.event.findMany.mockResolvedValue(events as any);

      const result = await service.getOrganizerEventsWithRoom(
        MOCK_ORGANIZER_PROFILE_ID,
        [EventStatus.CONCLUDED, EventStatus.CANCELLED],
      );

      expect(result).toEqual(events);
      expect(prismaMock.event.findMany).toHaveBeenCalledWith({
        where: {
          organizerId: MOCK_ORGANIZER_PROFILE_ID,
          status: { in: [EventStatus.CONCLUDED, EventStatus.CANCELLED] },
        },
        include: { discussionRoom: true },
      });
    });

    it('UT-OE-02: NoFilter + HasEvents → query has no status filter', async () => {
      const events = [{ id: MOCK_EVENT_ID, discussionRoom: { id: MOCK_ROOM_ID } }];
      prismaMock.event.findMany.mockResolvedValue(events as any);

      const result = await service.getOrganizerEventsWithRoom(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual(events);
      expect(prismaMock.event.findMany).toHaveBeenCalledWith({
        where: { organizerId: MOCK_ORGANIZER_PROFILE_ID },
        include: { discussionRoom: true },
      });
    });

    it('UT-OE-03: zero events found → returns [] (filter-independent)', async () => {
      prismaMock.event.findMany.mockResolvedValue([]);

      const result = await service.getOrganizerEventsWithRoom(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([]);
    });
  });

  describe('findRoomByEventId', () => {
    it('UT-FE-01: a DiscussionRoom exists for this eventId → returns { roomId }', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        id: MOCK_ROOM_ID,
      } as any);

      const result = await service.findRoomByEventId(MOCK_EVENT_ID);

      expect(result).toEqual({ roomId: MOCK_ROOM_ID });
    });

    it('UT-FE-02: no DiscussionRoom exists for this eventId → returns null', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue(null);

      const result = await service.findRoomByEventId(MOCK_EVENT_ID);

      expect(result).toBeNull();
    });
  });
});
