import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';
import { EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscussionCrudService } from './discussion-crud.service';
import { ReturnMessageDto } from '../dto/return-message.dto';
import { SaveMessageException } from '../exceptions/save-message.exception';
import { SaveRoomReadStatusException } from '../exceptions/save-room-read-status.exception';
import { RoomNotFoundException } from '../exceptions/room-not-found.exception';

const MOCK_ROOM_ID = 'e8946e7f-42a6-4586-9089-9267d0312bff';
const MOCK_EVENT_ID = '1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8';
const MOCK_OTHER_EVENT_ID = '6a552788-764e-4613-bad0-30a595762649';
const MOCK_PARTICIPANT_PROFILE_ID = 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44';
const MOCK_ORGANIZER_PROFILE_ID = '084066b4-231a-4e1e-bb37-084d5ea66c8a';
const MOCK_MESSAGE_ID = 'e9697c17-fc38-4625-aaeb-a4f43cce4e09';
const MOCK_CURSOR_ID = 'bb0d173c-621e-4065-8022-9b8b17eb9f7c';

// pool of distinct uuidv4s for sequentially generated message fixtures
const MOCK_MESSAGE_IDS = [
  '8b2e4235-9659-4e26-81ba-cd3d069e165d',
  '012207df-bc1a-41e2-9810-418355ee4233',
  '3db57247-17a6-4254-b5f0-eeb1489bed47',
  '5ac0f7a7-b029-497f-a6c7-1937ab6501a9',
  'e7308906-0a95-4e24-968a-bb820449a674',
  '432f7bd3-e13d-4386-8561-d7183695d85b',
  'f9ed9b7e-1975-4cf0-adde-bcaecdf3ab32',
  '417be413-1759-4dc3-a29c-b494b22a0c41',
  'c561aa78-7381-45ee-8cb5-b14e64124972',
  '25db2ffa-8100-4355-be3c-904724963e5c',
  '157b19ea-4fc0-48c8-a52f-eca29e0f726d',
  'bf5ce410-51da-4f90-856a-f08223bcd09d',
  '49837a5b-8c90-4998-a2e7-ae3caa1f0f63',
  '2b8fa815-067e-453c-a4c5-ebca1b8a3dd5',
  '3d03e6bd-1332-4171-bfa6-79a5f214e689',
  '0f201050-f915-4fdf-893b-be78ed2522b8',
  '078c0a05-311f-4418-8ab3-9772ee39bca1',
  'e5574ca4-5958-4f1c-a7e8-d14da59c846c',
  'fbde6c39-4a2a-4026-af47-7fc391f902d9',
  '62a56809-e8d0-4647-b0c3-d6a4e6af83f5',
  'e73c2296-7c70-46f8-910f-0715973f8ca3',
  'f4573578-f708-4f0a-8b7b-6acf72ddc9dc',
  '929d27c5-9f2f-433e-afa9-b88123476ba1',
  '375e56cc-b1e2-4360-8761-2b8e3c5e0c92',
  '083eff78-4a36-4ed3-af22-11cae757a46d',
  '6799a0c0-2e10-4b42-a69a-f2f8e7385eef',
];

const mockMessageId = (n: number) => MOCK_MESSAGE_IDS[n];

const MAX_MESSAGE_PAGE_SIZE = 25;

const buildRawMessage = (overrides: Record<string, any> = {}) => ({
  id: MOCK_MESSAGE_ID,
  roomId: MOCK_ROOM_ID,
  content: 'hello world',
  isAnnouncement: false,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  serialNumber: 1,
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

const buildRawMessages = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    buildRawMessage({
      id: mockMessageId(i),
      createdAt: new Date(2026, 7, 1, 0, i),
    }),
  );

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
  serialNumber: raw.serialNumber,
});

const prismaMock = mockDeep<PrismaService>();

describe('DiscussionCrudService', () => {
  let service: DiscussionCrudService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    mockReset(prismaMock);
    // createMessage wraps the serial claim + insert in a transaction; run the
    // callback against the same mock so tx.message.create / tx.$queryRaw
    // calls land on prismaMock and stay assertable
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
    prismaMock.$queryRaw.mockResolvedValue([{ lastSerialNumber: 1 }] as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionCrudService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DiscussionCrudService>(DiscussionCrudService);
  });

  describe('createMessage', () => {
    it('UT-6-006-01: FromParticipant + NotAnnouncement + CreateSucceeds → sender.role = PARTICIPANT', async () => {
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
            serialNumber: 1,
          },
        }),
      );
    });

    it('UT-6-006-02: FromOrganizer + Announcement + CreateSucceeds → sender.role = ORGANIZER, isAnnouncement: true', async () => {
      const raw = buildRawMessage({
        content: 'announcement text',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: 'announcement text' }),
        }),
      );
    });

    it('UT-6-006-03: participant sender with nickname present → sender.name = nickname (preferred over firstName)', async () => {
      const raw = buildRawMessage({
        content: 'hi',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'hi' }) }),
      );
    });

    it('UT-6-006-04: participant sender with nickname null/empty → sender.name = firstName (fallback)', async () => {
      const raw = buildRawMessage({
        content: 'hi',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'hi' }) }),
      );
    });

    it("UT-6-006-05: participant sender with both nickname and firstName empty → sender.name = ''", async () => {
      const raw = buildRawMessage({
        content: 'hi',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'hi' }) }),
      );
    });

    it("UT-6-006-06: organizer sender with imageUrl null → sender.imageUrl = ''", async () => {
      const raw = buildRawMessage({
        content: 'hi',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'hi' }) }),
      );
    });

    it('UT-6-006-07: any sender combination + CreateThrows → throws SaveMessageException, logs error', async () => {
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

    it("UT-6-006-08: organizer sender with name null → sender.name = ''", async () => {
      const raw = buildRawMessage({
        content: 'hi',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'hi' }) }),
      );
    });

    it("UT-6-006-09: participant sender with imageUrl null → sender.imageUrl = ''", async () => {
      const raw = buildRawMessage({
        content: 'hi',
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
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: 'hi' }) }),
      );
    });
  });

  describe('getPaginatedMessagesByCursor', () => {
    it('UT-6-007-01: Before + HasCursor + MorePages → hasMoreOlder=true, hasMoreNewer=true, page reversed to ascending', async () => {
      const raws = buildRawMessages(26);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'before',
        MAX_MESSAGE_PAGE_SIZE,
      );

      const orderedPage = raws.slice(0, 25).reverse();
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: mockMessageId(24),
        newestCursor: mockMessageId(0),
      });
    });

    it('UT-6-007-02: Before + HasCursor + NoMorePages → hasMoreOlder=false, hasMoreNewer=true', async () => {
      const raws = buildRawMessages(5);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'before',
        10,
      );

      const orderedPage = [...raws].reverse();
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: mockMessageId(4),
        newestCursor: mockMessageId(0),
      });
    });

    it('UT-6-007-03: Before + NoCursor + MorePages → hasMoreOlder=true, hasMoreNewer=false (initial latest-page load)', async () => {
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
        oldestCursor: mockMessageId(9),
        newestCursor: mockMessageId(0),
      });
    });

    it('UT-6-007-04: Before + NoCursor + NoMorePages → hasMoreOlder=false, hasMoreNewer=false (room has <= take messages total)', async () => {
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
        oldestCursor: mockMessageId(2),
        newestCursor: mockMessageId(0),
      });
    });

    it('UT-6-007-05: After + HasCursor + MorePages → hasMoreOlder=true, hasMoreNewer=true', async () => {
      const raws = buildRawMessages(11);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'after',
        10,
      );

      const orderedPage = raws.slice(0, 10);
      expect(result).toEqual({
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: mockMessageId(0),
        newestCursor: mockMessageId(9),
      });
    });

    it('UT-6-007-06: After + HasCursor + NoMorePages → hasMoreOlder=true, hasMoreNewer=false', async () => {
      const raws = buildRawMessages(3);
      prismaMock.message.findMany.mockResolvedValue(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'after',
        10,
      );

      expect(result).toEqual({
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: mockMessageId(0),
        newestCursor: mockMessageId(2),
      });
    });

    it('UT-6-007-07: After + NoCursor + MorePages → hasMoreOlder=false, hasMoreNewer=true (edge case: after with no cursor)', async () => {
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
        oldestCursor: mockMessageId(0),
        newestCursor: mockMessageId(9),
      });
    });

    it('UT-6-007-08: After + NoCursor + NoMorePages → hasMoreOlder=false, hasMoreNewer=false', async () => {
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
        oldestCursor: mockMessageId(0),
        newestCursor: mockMessageId(2),
      });
    });

    it('UT-6-007-09: Before + HasCursor + EmptyPage → oldestCursor = newestCursor = input cursor (fallback)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'before',
        10,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: MOCK_CURSOR_ID,
        newestCursor: MOCK_CURSOR_ID,
      });
    });

    it('UT-6-007-10: After + HasCursor + EmptyPage → oldestCursor = newestCursor = input cursor (fallback)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        MOCK_ROOM_ID,
        MOCK_CURSOR_ID,
        'after',
        10,
      );

      expect(result).toEqual({
        messages: [],
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: MOCK_CURSOR_ID,
        newestCursor: MOCK_CURSOR_ID,
      });
    });

    it('UT-6-007-11: take = limit + 1, for a limit under the service-layer max', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      await service.getPaginatedMessagesByCursor(MOCK_ROOM_ID, undefined, 'before', 5);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      );
    });

    it('UT-6-007-12: limit is trusted as-is — no clamping in this method (that is the service layer\'s job)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      await service.getPaginatedMessagesByCursor(MOCK_ROOM_ID, undefined, 'before', 999);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    it('UT-6-007-13: where filters only by roomId (no isAnnouncement concept in this method anymore)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      await service.getPaginatedMessagesByCursor(MOCK_ROOM_ID, undefined, 'before', 10);

      const callArgs = prismaMock.message.findMany.mock.calls[0][0];
      expect(callArgs?.where).toEqual({ roomId: MOCK_ROOM_ID });
    });
  });

  describe('getLatestAnnouncements', () => {
    it('queries only isAnnouncement=true messages for the room, ordered newest-first then reversed to chronological order, take = limit as given', async () => {
      const raws = [
        buildRawMessage({
          id: mockMessageId(0),
          isAnnouncement: true,
          createdAt: new Date('2026-08-01T00:02:00Z'),
        }),
        buildRawMessage({
          id: mockMessageId(1),
          isAnnouncement: true,
          createdAt: new Date('2026-08-01T00:01:00Z'),
        }),
        buildRawMessage({
          id: mockMessageId(2),
          isAnnouncement: true,
          createdAt: new Date('2026-08-01T00:00:00Z'),
        }),
      ];
      const expected = [...raws].reverse().map(mapRawToExpected);
      prismaMock.message.findMany.mockResolvedValue([...raws] as any);

      const result = await service.getLatestAnnouncements(MOCK_ROOM_ID, 15);

      expect(result).toEqual(expected);
      expect(prismaMock.message.findMany).toHaveBeenCalledWith({
        where: { roomId: MOCK_ROOM_ID, isAnnouncement: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 15,
        include: {
          senderParticipant: {
            select: { id: true, firstName: true, nickname: true, imageUrl: true },
          },
          senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
        },
      });
    });

    it('room has no announcements → returns an empty array', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      const result = await service.getLatestAnnouncements(MOCK_ROOM_ID, 15);

      expect(result).toEqual([]);
    });

    it('limit is trusted as-is — no clamping in this method (that is the service layer\'s job)', async () => {
      prismaMock.message.findMany.mockResolvedValue([] as any);

      await service.getLatestAnnouncements(MOCK_ROOM_ID, 999);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 999 }),
      );
    });
  });

  describe('getLatestMessageForRoom', () => {
    it('UT-6-009-01: room has at least one message → returns mapped latest ReturnMessageDto', async () => {
      const raw = buildRawMessage();
      prismaMock.message.findFirst.mockResolvedValue(raw as any);

      const result = await service.getLatestMessageForRoom(MOCK_ROOM_ID);

      expect(result).toEqual(mapRawToExpected(raw));
    });

    it('UT-6-009-02: room has zero messages → returns null', async () => {
      prismaMock.message.findFirst.mockResolvedValue(null);

      const result = await service.getLatestMessageForRoom(MOCK_ROOM_ID);

      expect(result).toBeNull();
    });
  });

  describe('upsertLastReadMessage', () => {
    it('UT-6-010-01: RoleOrganizer + lastReadMessageId provided → upserts keyed on roomId_readerOrganizerId, readerOrganizerId set, readerParticipantId null, lastReadMessageId set to provided id', async () => {
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: MOCK_MESSAGE_ID,
        lastReadSerialNumber: 5,
      } as any);

      const result = await service.upsertLastReadMessage(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
        MOCK_MESSAGE_ID,
        5,
      );

      expect(result).toEqual({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: MOCK_MESSAGE_ID,
        lastReadSerialNumber: 5,
      });
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
          lastReadMessageId: MOCK_MESSAGE_ID,
          lastReadSerialNumber: 5,
        },
        update: { lastReadMessageId: MOCK_MESSAGE_ID, lastReadSerialNumber: 5 },
      });
    });

    it('UT-6-010-02: RoleParticipant + lastReadMessageId provided → upserts keyed on roomId_readerParticipantId, readerParticipantId set, readerOrganizerId null, lastReadMessageId set to provided id', async () => {
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: MOCK_MESSAGE_ID,
        lastReadSerialNumber: 5,
      } as any);

      const result = await service.upsertLastReadMessage(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        MOCK_MESSAGE_ID,
        5,
      );

      expect(result).toEqual({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: MOCK_MESSAGE_ID,
        lastReadSerialNumber: 5,
      });
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
          lastReadMessageId: MOCK_MESSAGE_ID,
          lastReadSerialNumber: 5,
        },
        update: { lastReadMessageId: MOCK_MESSAGE_ID, lastReadSerialNumber: 5 },
      });
    });

    it('UT-6-010-04: lastReadMessageId provided + existing row → update branch overwrites the stored lastReadMessageId with the provided id', async () => {
      const newMessageId = 'e9697c17-fc38-4625-aaeb-a4f43cce4e10';
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: newMessageId,
      } as any);

      const result = await service.upsertLastReadMessage(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        newMessageId,
        undefined,
      );

      expect(result).toEqual({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: newMessageId,
      });
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { lastReadMessageId: newMessageId },
        }),
      );
    });

    it('UT-6-010-05: lastReadMessageId omitted + no existing row → create branch stores lastReadMessageId as null', async () => {
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: null,
      } as any);

      const result = await service.upsertLastReadMessage(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
        undefined,
        undefined,
      );

      expect(result).toEqual({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: null,
      });
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ lastReadMessageId: null }),
          update: {},
        }),
      );
    });

    it('UT-6-010-06: lastReadMessageId omitted + existing row → update branch leaves the existing lastReadMessageId untouched', async () => {
      prismaMock.roomReadStatus.upsert.mockResolvedValue({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: MOCK_MESSAGE_ID,
      } as any);

      const result = await service.upsertLastReadMessage(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
        undefined,
        undefined,
      );

      expect(result).toEqual({
        roomId: MOCK_ROOM_ID,
        lastReadMessageId: MOCK_MESSAGE_ID,
      });
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: {} }),
      );
    });

    it('UT-6-010-03: any role/row combination + UpsertThrows → throws SaveRoomReadStatusException, logs error', async () => {
      prismaMock.roomReadStatus.upsert.mockRejectedValue(new Error('DB down'));

      const attempt = () =>
        service.upsertLastReadMessage(
          MOCK_ROOM_ID,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
          undefined,
          undefined,
        );

      await expect(attempt()).rejects.toThrow(SaveRoomReadStatusException);
      await expect(attempt()).rejects.toThrow(
        'Failed to update read status. Please try again.',
      );
    });
  });

  describe('getRoomReadStatus', () => {
    it('UT-6-011-01: RoleOrganizer + Found → returns lastReadMessageId, queried by roomId_readerOrganizerId', async () => {
      prismaMock.roomReadStatus.findUnique.mockResolvedValue({
        lastReadMessageId: MOCK_MESSAGE_ID,
      } as any);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual({ lastReadMessageId: MOCK_MESSAGE_ID });
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_readerOrganizerId: {
            roomId: MOCK_ROOM_ID,
            readerOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
          },
        },
      });
    });

    it('UT-6-011-02: RoleOrganizer + NotFound → returns null', async () => {
      prismaMock.roomReadStatus.findUnique.mockResolvedValue(null);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toBeNull();
    });

    it('UT-6-011-03: RoleParticipant + Found → returns lastReadMessageId, queried by roomId_readerParticipantId', async () => {
      prismaMock.roomReadStatus.findUnique.mockResolvedValue({
        lastReadMessageId: MOCK_MESSAGE_ID,
      } as any);

      const result = await service.getRoomReadStatus(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual({ lastReadMessageId: MOCK_MESSAGE_ID });
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_readerParticipantId: {
            roomId: MOCK_ROOM_ID,
            readerParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
          },
        },
      });
    });

    it('UT-6-011-04: RoleParticipant + NotFound → returns null', async () => {
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
    it('UT-6-012-01: lastReadMessageId present + message still exists → counts messages created after that message\'s own createdAt', async () => {
      const lastReadCreatedAt = new Date('2026-08-01T00:00:00Z');
      prismaMock.message.findUnique.mockResolvedValue(
        buildRawMessage({ id: MOCK_MESSAGE_ID, createdAt: lastReadCreatedAt }) as any,
      );
      prismaMock.message.count.mockResolvedValue(4);

      const result = await service.countUnreadMessages(
        MOCK_ROOM_ID,
        MOCK_MESSAGE_ID,
      );

      expect(result).toBe(4);
      expect(prismaMock.message.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_MESSAGE_ID },
        select: { createdAt: true },
      });
      expect(prismaMock.message.count).toHaveBeenCalledWith({
        where: { roomId: MOCK_ROOM_ID, createdAt: { gt: lastReadCreatedAt } },
      });
    });

    it('UT-6-012-02: lastReadMessageId is null → skips the message lookup, counts from epoch', async () => {
      prismaMock.message.count.mockResolvedValue(0);

      const result = await service.countUnreadMessages(MOCK_ROOM_ID, null);

      expect(result).toBe(0);
      expect(prismaMock.message.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.message.count).toHaveBeenCalledWith({
        where: { roomId: MOCK_ROOM_ID, createdAt: { gt: new Date(0) } },
      });
    });

    it('UT-6-012-03: lastReadMessageId points to a since-deleted message → falls back to epoch so nothing is hidden as read', async () => {
      prismaMock.message.findUnique.mockResolvedValue(null);
      prismaMock.message.count.mockResolvedValue(7);

      const result = await service.countUnreadMessages(
        MOCK_ROOM_ID,
        MOCK_MESSAGE_ID,
      );

      expect(result).toBe(7);
      expect(prismaMock.message.count).toHaveBeenCalledWith({
        where: { roomId: MOCK_ROOM_ID, createdAt: { gt: new Date(0) } },
      });
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

    it('UT-6-013-01: HasFilter + HasRegistrations → query includes status filter, returns extracted events', async () => {
      const registration = buildRegistration();
      prismaMock.eventRegistration.findMany.mockResolvedValue([
        registration,
      ] as any);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
        [EventStatus.PUBLISHED, EventStatus.ONGOING],
      );

      expect(result).toEqual([registration.event]);
      expect(prismaMock.eventRegistration.findMany).toHaveBeenCalledWith({
        where: {
          participantId: MOCK_PARTICIPANT_PROFILE_ID,
          status: 'CONFIRMED',
          event: { status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING] } },
        },
        include: { event: { include: { discussionRoom: true } } },
      });
    });

    it('UT-6-013-02: NoFilter + HasRegistrations → query has no status filter, returns extracted events', async () => {
      const registration = buildRegistration();
      prismaMock.eventRegistration.findMany.mockResolvedValue([
        registration,
      ] as any);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual([registration.event]);
      expect(prismaMock.eventRegistration.findMany).toHaveBeenCalledWith({
        where: {
          participantId: MOCK_PARTICIPANT_PROFILE_ID,
          status: 'CONFIRMED',
        },
        include: { event: { include: { discussionRoom: true } } },
      });
    });

    it('UT-6-013-03: zero registrations found → returns [] (filter-independent)', async () => {
      prismaMock.eventRegistration.findMany.mockResolvedValue([]);

      const result = await service.getParticipantEventsWithRoom(
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual([]);
    });

    it('UT-6-013-04: mix of RoomPresent/RoomAbsent → method returns both as-is, unfiltered', async () => {
      const withRoom = buildRegistration();
      const withoutRoom = buildRegistration({
        id: MOCK_OTHER_EVENT_ID,
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
    it('UT-6-014-01: HasFilter + HasEvents → query includes status filter', async () => {
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

    it('UT-6-014-02: NoFilter + HasEvents → query has no status filter', async () => {
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

    it('UT-6-014-03: zero events found → returns [] (filter-independent)', async () => {
      prismaMock.event.findMany.mockResolvedValue([]);

      const result = await service.getOrganizerEventsWithRoom(
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual([]);
    });
  });

  describe('findRoomByEventId', () => {
    it('UT-6-015-01: a DiscussionRoom exists for this eventId → returns { roomId }', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        id: MOCK_ROOM_ID,
      } as any);

      const result = await service.findRoomByEventId(MOCK_EVENT_ID);

      expect(result).toEqual({ roomId: MOCK_ROOM_ID });
      expect(prismaMock.discussionRoom.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: MOCK_EVENT_ID } }),
      );
    });

    it('UT-6-015-02: no DiscussionRoom exists for this eventId → returns null', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue(null);

      const result = await service.findRoomByEventId(MOCK_EVENT_ID);

      expect(result).toBeNull();
    });
  });

  describe('claimNextRoomSerialNumber', () => {
    it('UT-6-016-01: room exists → atomically increments and returns the new lastSerialNumber', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        { lastSerialNumber: 12 },
      ] as any);

      const result = await service.claimNextRoomSerialNumber(MOCK_ROOM_ID);

      expect(result).toBe(12);
    });

    it('UT-6-016-02: room does not exist → throws RoomNotFoundException', async () => {
      prismaMock.$queryRaw.mockResolvedValue([] as any);

      await expect(
        service.claimNextRoomSerialNumber(MOCK_ROOM_ID),
      ).rejects.toThrow(RoomNotFoundException);
    });

    it('UT-6-016-03: tx provided → runs the raw query against the tx client, not a fresh transaction', async () => {
      const txMock = mockDeep<PrismaService>();
      txMock.$queryRaw.mockResolvedValue([{ lastSerialNumber: 3 }] as any);

      const result = await service.claimNextRoomSerialNumber(
        MOCK_ROOM_ID,
        txMock as any,
      );

      expect(result).toBe(3);
      expect(txMock.$queryRaw).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('getMessageSerialNumber', () => {
    it('UT-6-016-04: message exists → returns its serialNumber', async () => {
      prismaMock.message.findUnique.mockResolvedValue({
        serialNumber: 7,
      } as any);

      const result = await service.getMessageSerialNumber(MOCK_MESSAGE_ID);

      expect(result).toBe(7);
      expect(prismaMock.message.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_MESSAGE_ID },
        select: { serialNumber: true },
      });
    });

    it('UT-6-016-05: message does not exist → returns null', async () => {
      prismaMock.message.findUnique.mockResolvedValue(null);

      const result = await service.getMessageSerialNumber(MOCK_MESSAGE_ID);

      expect(result).toBeNull();
    });
  });

  describe('getUnreadCountBySerialNumber', () => {
    it('UT-6-016-06: ORGANIZER + existing read status → returns room.lastSerialNumber - readStatus.lastReadSerialNumber', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        lastSerialNumber: 10,
      } as any);
      prismaMock.roomReadStatus.findUnique.mockResolvedValue({
        lastReadSerialNumber: 4,
      } as any);

      const result = await service.getUnreadCountBySerialNumber(
        MOCK_ROOM_ID,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toBe(6);
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_readerOrganizerId: {
            roomId: MOCK_ROOM_ID,
            readerOrganizerId: MOCK_ORGANIZER_PROFILE_ID,
          },
        },
        select: { lastReadSerialNumber: true },
      });
    });

    it('UT-6-016-07: PARTICIPANT + no read status yet → treats lastReadSerialNumber as 0', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        lastSerialNumber: 5,
      } as any);
      prismaMock.roomReadStatus.findUnique.mockResolvedValue(null);

      const result = await service.getUnreadCountBySerialNumber(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toBe(5);
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_readerParticipantId: {
            roomId: MOCK_ROOM_ID,
            readerParticipantId: MOCK_PARTICIPANT_PROFILE_ID,
          },
        },
        select: { lastReadSerialNumber: true },
      });
    });

    it('UT-6-016-08: result never goes negative even if stored lastReadSerialNumber is stale/ahead', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        lastSerialNumber: 3,
      } as any);
      prismaMock.roomReadStatus.findUnique.mockResolvedValue({
        lastReadSerialNumber: 9,
      } as any);

      const result = await service.getUnreadCountBySerialNumber(
        MOCK_ROOM_ID,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toBe(0);
    });

    it('UT-6-016-09: room does not exist → throws RoomNotFoundException', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue(null);

      await expect(
        service.getUnreadCountBySerialNumber(
          MOCK_ROOM_ID,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RoomNotFoundException);
    });
  });

  describe('getRoomMemberIds', () => {
    it('UT-6-016-10: room exists → returns organizerProfileId and confirmed participantProfileIds', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        event: {
          organizerId: MOCK_ORGANIZER_PROFILE_ID,
          eventRegistrations: [
            { participantId: MOCK_PARTICIPANT_PROFILE_ID },
            { participantId: 'other-participant-id' },
          ],
        },
      } as any);

      const result = await service.getRoomMemberIds(MOCK_ROOM_ID);

      expect(result).toEqual({
        organizerProfileId: MOCK_ORGANIZER_PROFILE_ID,
        participantProfileIds: [
          MOCK_PARTICIPANT_PROFILE_ID,
          'other-participant-id',
        ],
      });
      expect(prismaMock.discussionRoom.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: MOCK_ROOM_ID } }),
      );
    });

    it('UT-6-016-11: room does not exist → throws RoomNotFoundException', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue(null);

      await expect(service.getRoomMemberIds(MOCK_ROOM_ID)).rejects.toThrow(
        RoomNotFoundException,
      );
    });
  });
});
