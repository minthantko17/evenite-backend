import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscussionCrudService } from './discussion-crud.service';
import { SaveMessageException } from '../exceptions/save-message.exception';
import { SaveRoomReadStatusException } from '../exceptions/save-room-read-status.exception';
import { RoomNotFoundException } from '../exceptions/room-not-found.exception';
import {
  USERS,
  ROOMS,
  EVENTS,
  NOT_FOUND_ROOM_ID,
  NOT_FOUND_EVENT_ID,
  NOT_FOUND_MESSAGE_ID,
  READ_STATUS_NEW_MESSAGE_ID,
  READ_STATUS_FIRST_READ_MESSAGE_ID,
  CREATE_MESSAGE_ROWS,
  PAGINATION_ROOMS,
  PAGINATION_CURSOR_ID,
  PAGINATION_EMPTY_PAGE_CURSOR_ID,
  ANNOUNCEMENTS_ROOM,
  applyCentralMockImplementations,
  mapRawToExpected,
} from './discussion-crud.service.mock-db';

// This spec sources its fixtures from ./discussion-crud.service.mock-db.ts —
// a single centralized "mock database" (ROOM_MAIN/ROOM_EMPTY with seeded
// messages, read statuses, and serial numbers; EVENTS/EVENT_REGISTRATIONS).
// Structural lookups (room/event existence, read status, serial-number
// claim, event queries) are fully simulated from those fixtures via
// applyCentralMockImplementations, so most tests call the service directly
// against a fixture id and assert — no per-test Prisma mock plumbing.
// Row-shape-sensitive methods (createMessage, the paginated message
// queries) still set the exact Prisma response per test, via shared row
// builders instead of ad-hoc literals.
//
// Within each describe block, happy-path cases come first, followed by
// error cases.

const prismaMock = mockDeep<PrismaService>();

describe('DiscussionCrudService', () => {
  let service: DiscussionCrudService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    mockReset(prismaMock);
    applyCentralMockImplementations(prismaMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionCrudService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DiscussionCrudService>(DiscussionCrudService);
  });

  // ==========================================================================
  // createMessage
  // ==========================================================================
  describe('createMessage', () => {
    it('UT-createMessage-01: PARTICIPANT sender, regular message — creates with the claimed serial number and resolves the mapped DTO', async () => {
      const raw = CREATE_MESSAGE_ROWS.PARTICIPANT_REGULAR;
      prismaMock.message.create.mockResolvedValueOnce(raw as any);

      const result = await service.createMessage(
        ROOMS.ROOM_MAIN.id,
        raw.content,
        false,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      const expected = mapRawToExpected(raw);
      expect(result).toEqual(expected);
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            roomId: ROOMS.ROOM_MAIN.id,
            content: raw.content,
            isAnnouncement: false,
            senderParticipantId: USERS.PARTICIPANT_MAIN.id,
            senderOrganizerId: null,
            serialNumber: raw.serialNumber,
          },
        }),
      );
    });

    it('UT-createMessage-02: ORGANIZER sender, announcement — creates with isAnnouncement true and resolves the mapped DTO', async () => {
      const raw = CREATE_MESSAGE_ROWS.ORGANIZER_ANNOUNCEMENT;
      prismaMock.message.create.mockResolvedValueOnce(raw as any);

      const result = await service.createMessage(
        ROOMS.ROOM_MAIN.id,
        raw.content,
        true,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      const expected = mapRawToExpected(raw);
      expect(result).toEqual(expected);
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isAnnouncement: true, content: raw.content }),
        }),
      );
    });

    it('UT-createMessage-03: participant sender with nickname empty — sender.name falls back to firstName', async () => {
      const raw = CREATE_MESSAGE_ROWS.PARTICIPANT_NICKNAME_EMPTY;
      prismaMock.message.create.mockResolvedValueOnce(raw as any);

      const result = await service.createMessage(
        ROOMS.ROOM_MAIN.id,
        raw.content,
        false,
        USERS.PARTICIPANT_NICKNAME_EMPTY.id,
        null,
      );

      const expected = mapRawToExpected(raw);
      expect(result).toEqual(expected);
      expect(result.sender.name).toBe(USERS.PARTICIPANT_NICKNAME_EMPTY.firstName);
    });

    it("UT-createMessage-04: participant sender with nickname and firstName both empty, imageUrl null — sender.name and sender.imageUrl fall back to ''", async () => {
      const raw = CREATE_MESSAGE_ROWS.PARTICIPANT_NAME_EMPTY;
      prismaMock.message.create.mockResolvedValueOnce(raw as any);

      const result = await service.createMessage(
        ROOMS.ROOM_MAIN.id,
        raw.content,
        false,
        USERS.PARTICIPANT_NAME_EMPTY.id,
        null,
      );

      const expected = mapRawToExpected(raw);
      expect(result).toEqual(expected);
      expect(result.sender.name).toBe('');
      expect(result.sender.imageUrl).toBe('');
    });

    it("UT-createMessage-05: organizer sender with name and imageUrl both null — sender.name and sender.imageUrl fall back to ''", async () => {
      const raw = CREATE_MESSAGE_ROWS.ORGANIZER_NAME_EMPTY;
      prismaMock.message.create.mockResolvedValueOnce(raw as any);

      const result = await service.createMessage(
        ROOMS.ROOM_MAIN.id,
        raw.content,
        false,
        null,
        USERS.ORGANIZER_NAME_EMPTY.id,
      );

      const expected = mapRawToExpected(raw);
      expect(result).toEqual(expected);
      expect(result.sender.name).toBe('');
      expect(result.sender.imageUrl).toBe('');
    });

    it('UT-createMessage-06 [error]: room does not exist — the serial-number claim fails, rejects with SaveMessageException', async () => {
      const promise = service.createMessage(
        NOT_FOUND_ROOM_ID,
        'hi',
        false,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      await expect(promise).rejects.toThrow(SaveMessageException);
      await expect(promise).rejects.toThrow('Failed to save message. Please try again.');

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('UT-createMessage-07 [error] [single]: message.create fails since database disconnected — rejects with SaveMessageException', async () => {
      prismaMock.message.create.mockRejectedValueOnce(new Error('DB down'));

      const promise = service.createMessage(
        ROOMS.ROOM_MAIN.id,
        'hi',
        false,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      await expect(promise).rejects.toThrow(SaveMessageException);
      await expect(promise).rejects.toThrow('Failed to save message. Please try again.');
    });
  });

  // ==========================================================================
  // getPaginatedMessagesByCursor
  // ==========================================================================
  describe('getPaginatedMessagesByCursor', () => {
    it('UT-getPaginatedMessagesByCursor-01: before + cursor + more pages — reverses the page to ascending order, hasMoreOlder=true, hasMoreNewer=true', async () => {
      const raws = PAGINATION_ROOMS.LARGE.messages; // 26 messages
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.LARGE.id,
        PAGINATION_CURSOR_ID,
        'before',
        25,
      );

      const orderedPage = raws.slice(0, 25).reverse();
      const expected = {
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: raws[24].id,
        newestCursor: raws[0].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-02: before + cursor + no more pages — hasMoreOlder=false, hasMoreNewer=true', async () => {
      const raws = PAGINATION_ROOMS.SMALL.messages; // 5 messages
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.SMALL.id,
        PAGINATION_CURSOR_ID,
        'before',
        10,
      );

      const orderedPage = [...raws].reverse();
      const expected = {
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: raws[4].id,
        newestCursor: raws[0].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-03: before + no cursor + more pages — initial latest-page load, hasMoreOlder=true, hasMoreNewer=false', async () => {
      const raws = PAGINATION_ROOMS.MEDIUM.messages; // 11 messages
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.MEDIUM.id,
        undefined,
        'before',
        10,
      );

      const orderedPage = raws.slice(0, 10).reverse();
      const expected = {
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: raws[9].id,
        newestCursor: raws[0].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-04: before + no cursor + no more pages — room has fewer messages than the page size', async () => {
      const raws = PAGINATION_ROOMS.TINY.messages; // 3 messages
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        undefined,
        'before',
        10,
      );

      const orderedPage = [...raws].reverse();
      const expected = {
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: false,
        oldestCursor: raws[2].id,
        newestCursor: raws[0].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-05: after + cursor + more pages — hasMoreOlder=true, hasMoreNewer=true', async () => {
      const raws = PAGINATION_ROOMS.MEDIUM.messages;
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.MEDIUM.id,
        PAGINATION_CURSOR_ID,
        'after',
        10,
      );

      const orderedPage = raws.slice(0, 10);
      const expected = {
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: true,
        oldestCursor: raws[0].id,
        newestCursor: raws[9].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-06: after + cursor + no more pages — hasMoreOlder=true, hasMoreNewer=false', async () => {
      const raws = PAGINATION_ROOMS.TINY.messages;
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        PAGINATION_CURSOR_ID,
        'after',
        10,
      );

      const expected = {
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: raws[0].id,
        newestCursor: raws[2].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-07: after + no cursor + more pages — hasMoreOlder=false, hasMoreNewer=true', async () => {
      const raws = PAGINATION_ROOMS.MEDIUM.messages;
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.MEDIUM.id,
        undefined,
        'after',
        10,
      );

      const orderedPage = raws.slice(0, 10);
      const expected = {
        messages: orderedPage.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: raws[0].id,
        newestCursor: raws[9].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-08: after + no cursor + no more pages', async () => {
      const raws = PAGINATION_ROOMS.TINY.messages;
      prismaMock.message.findMany.mockResolvedValueOnce(raws as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        undefined,
        'after',
        10,
      );

      const expected = {
        messages: raws.map(mapRawToExpected),
        hasMoreOlder: false,
        hasMoreNewer: false,
        oldestCursor: raws[0].id,
        newestCursor: raws[2].id,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-09 [single]: before + cursor + empty page — oldestCursor/newestCursor fall back to the input cursor', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        PAGINATION_EMPTY_PAGE_CURSOR_ID,
        'before',
        10,
      );

      const expected = {
        messages: [],
        hasMoreOlder: false,
        hasMoreNewer: true,
        oldestCursor: PAGINATION_EMPTY_PAGE_CURSOR_ID,
        newestCursor: PAGINATION_EMPTY_PAGE_CURSOR_ID,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-10 [single]: after + cursor + empty page — oldestCursor/newestCursor fall back to the input cursor', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      const result = await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        PAGINATION_EMPTY_PAGE_CURSOR_ID,
        'after',
        10,
      );

      const expected = {
        messages: [],
        hasMoreOlder: true,
        hasMoreNewer: false,
        oldestCursor: PAGINATION_EMPTY_PAGE_CURSOR_ID,
        newestCursor: PAGINATION_EMPTY_PAGE_CURSOR_ID,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getPaginatedMessagesByCursor-11 [single]: fetches take = limit + 1, to probe for more results', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      await service.getPaginatedMessagesByCursor(PAGINATION_ROOMS.TINY.id, undefined, 'before', 5);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      );
    });

    it('UT-getPaginatedMessagesByCursor-12 [single]: limit is trusted as-is — no clamping at this layer', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        undefined,
        'before',
        999,
      );

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    it('UT-getPaginatedMessagesByCursor-13 [single]: where filters only by roomId', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      await service.getPaginatedMessagesByCursor(
        PAGINATION_ROOMS.TINY.id,
        undefined,
        'before',
        10,
      );

      const callArgs = prismaMock.message.findMany.mock.calls[0][0];
      const expectedWhere = { roomId: PAGINATION_ROOMS.TINY.id };
      expect(callArgs?.where).toEqual(expectedWhere);
    });
  });

  // ==========================================================================
  // getLatestAnnouncements
  // ==========================================================================
  describe('getLatestAnnouncements', () => {
    it('UT-getLatestAnnouncements-01: room has announcements — resolves them in chronological order (fetched newest-first, then reversed)', async () => {
      const raws = ANNOUNCEMENTS_ROOM.messages;
      prismaMock.message.findMany.mockResolvedValueOnce([...raws] as any);

      const result = await service.getLatestAnnouncements(ANNOUNCEMENTS_ROOM.id, 15);

      const expected = [...raws].reverse().map(mapRawToExpected);
      expect(result).toEqual(expected);
      const expectedFindManyArgs = {
        where: { roomId: ANNOUNCEMENTS_ROOM.id, isAnnouncement: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 15,
        include: {
          senderParticipant: {
            select: { id: true, firstName: true, nickname: true, imageUrl: true },
          },
          senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
        },
      };
      expect(prismaMock.message.findMany).toHaveBeenCalledWith(expectedFindManyArgs);
    });

    it('UT-getLatestAnnouncements-02 [single]: room has more announcements than the limit — only the latest `limit` are queried', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      await service.getLatestAnnouncements(ANNOUNCEMENTS_ROOM.id, 2);

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
    });

    it('UT-getLatestAnnouncements-03: room has zero announcements — resolves []', async () => {
      prismaMock.message.findMany.mockResolvedValueOnce([] as any);

      const result = await service.getLatestAnnouncements(ANNOUNCEMENTS_ROOM.id, 15);

      const expected: unknown[] = [];
      expect(result).toEqual(expected);
    });
  });

  // ==========================================================================
  // getLatestMessageForRoom
  // ==========================================================================
  describe('getLatestMessageForRoom', () => {
    it('UT-getLatestMessageForRoom-01: room has messages — resolves the chronologically latest one, mapped, regardless of isAnnouncement', async () => {
      const result = await service.getLatestMessageForRoom(ROOMS.ROOM_MAIN.id);

      const latestRaw = ROOMS.ROOM_MAIN.messages[ROOMS.ROOM_MAIN.messages.length - 1];
      const expected = mapRawToExpected(latestRaw);
      expect(result).toEqual(expected);
      expect(latestRaw.isAnnouncement).toBe(true); // confirms ordering ignores isAnnouncement
    });

    it('UT-getLatestMessageForRoom-02: room has zero messages — resolves null', async () => {
      const result = await service.getLatestMessageForRoom(ROOMS.ROOM_EMPTY.id);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // upsertLastReadMessage
  // ==========================================================================
  describe('upsertLastReadMessage', () => {
    it('UT-upsertLastReadMessage-01: ORGANIZER, existing row — update branch overwrites lastReadMessageId and lastReadSerialNumber', async () => {
      const newMessageId = READ_STATUS_NEW_MESSAGE_ID;

      const result = await service.upsertLastReadMessage(
        ROOMS.ROOM_MAIN.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        newMessageId,
        9,
      );

      const expected = {
        roomId: ROOMS.ROOM_MAIN.id,
        lastReadMessageId: newMessageId,
        lastReadSerialNumber: 9,
      };
      expect(result).toEqual(expected);
      const expectedUpsertArgs = {
        where: {
          roomId_readerOrganizerId: {
            roomId: ROOMS.ROOM_MAIN.id,
            readerOrganizerId: USERS.ORGANIZER_MAIN.id,
          },
        },
        create: {
          roomId: ROOMS.ROOM_MAIN.id,
          readerParticipantId: null,
          readerOrganizerId: USERS.ORGANIZER_MAIN.id,
          lastReadMessageId: newMessageId,
          lastReadSerialNumber: 9,
        },
        update: { lastReadMessageId: newMessageId, lastReadSerialNumber: 9 },
      };
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith(expectedUpsertArgs);
    });

    it('UT-upsertLastReadMessage-02: PARTICIPANT, no existing row — create branch stores readerParticipantId, readerOrganizerId null', async () => {
      const messageId = READ_STATUS_FIRST_READ_MESSAGE_ID;

      const result = await service.upsertLastReadMessage(
        ROOMS.ROOM_EMPTY.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
        messageId,
        1,
      );

      const expected = {
        roomId: ROOMS.ROOM_EMPTY.id,
        lastReadMessageId: messageId,
        lastReadSerialNumber: 1,
      };
      expect(result).toEqual(expected);
    });

    it('UT-upsertLastReadMessage-03 [single]: lastReadMessageId omitted, no existing row — create branch defaults it to null', async () => {
      const result = await service.upsertLastReadMessage(
        ROOMS.ROOM_EMPTY.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        undefined,
        undefined,
      );

      const expected = {
        roomId: ROOMS.ROOM_EMPTY.id,
        lastReadMessageId: null,
        lastReadSerialNumber: 0,
      };
      expect(result).toEqual(expected);
    });

    it('UT-upsertLastReadMessage-04 [single]: lastReadMessageId and lastReadSerialNumber omitted, existing row — update branch leaves the stored values untouched', async () => {
      const existing = ROOMS.ROOM_MAIN.readStatus.organizer!;

      const result = await service.upsertLastReadMessage(
        ROOMS.ROOM_MAIN.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        undefined,
        undefined,
      );

      const expected = {
        roomId: existing.roomId,
        lastReadMessageId: existing.lastReadMessageId,
        lastReadSerialNumber: existing.lastReadSerialNumber,
      };
      expect(result).toEqual(expected);
      expect(prismaMock.roomReadStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: {} }),
      );
    });

    it('UT-upsertLastReadMessage-05 [error] [single]: upsert throws — rejects with SaveRoomReadStatusException', async () => {
      prismaMock.roomReadStatus.upsert.mockRejectedValueOnce(new Error('DB down'));

      const promise = service.upsertLastReadMessage(
        ROOMS.ROOM_MAIN.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
        undefined,
        undefined,
      );

      await expect(promise).rejects.toThrow(SaveRoomReadStatusException);
      await expect(promise).rejects.toThrow('Failed to update read status. Please try again.');
    });
  });

  // ==========================================================================
  // getRoomReadStatus
  // ==========================================================================
  describe('getRoomReadStatus', () => {
    it('UT-getRoomReadStatus-01: ORGANIZER, record found — resolves { lastReadMessageId }, queried by roomId_readerOrganizerId', async () => {
      const result = await service.getRoomReadStatus(
        ROOMS.ROOM_MAIN.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      const expected = {
        lastReadMessageId: ROOMS.ROOM_MAIN.readStatus.organizer!.lastReadMessageId,
      };
      expect(result).toEqual(expected);
      const expectedFindUniqueArgs = {
        where: {
          roomId_readerOrganizerId: {
            roomId: ROOMS.ROOM_MAIN.id,
            readerOrganizerId: USERS.ORGANIZER_MAIN.id,
          },
        },
      };
      expect(prismaMock.roomReadStatus.findUnique).toHaveBeenCalledWith(expectedFindUniqueArgs);
    });

    it('UT-getRoomReadStatus-02: PARTICIPANT, record found — resolves { lastReadMessageId }, queried by roomId_readerParticipantId', async () => {
      const result = await service.getRoomReadStatus(
        ROOMS.ROOM_MAIN.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      const expected = {
        lastReadMessageId: ROOMS.ROOM_MAIN.readStatus.participant!.lastReadMessageId,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getRoomReadStatus-03: ORGANIZER, record not found — resolves null', async () => {
      const result = await service.getRoomReadStatus(
        ROOMS.ROOM_EMPTY.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      expect(result).toBeNull();
    });

    it('UT-getRoomReadStatus-04: PARTICIPANT, record not found — resolves null', async () => {
      const result = await service.getRoomReadStatus(
        ROOMS.ROOM_EMPTY.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // countUnreadMessages
  // ==========================================================================
  describe('countUnreadMessages', () => {
    it("UT-countUnreadMessages-01: lastReadMessageId present, message still exists — counts messages created after that message's own createdAt", async () => {
      const lastReadMessage = ROOMS.ROOM_MAIN.messages[5]; // serialNumber 6

      const result = await service.countUnreadMessages(ROOMS.ROOM_MAIN.id, lastReadMessage.id);

      const expected = 6; // messages 7..12
      expect(result).toBe(expected);
      const expectedFindUniqueArgs = {
        where: { id: lastReadMessage.id },
        select: { createdAt: true },
      };
      expect(prismaMock.message.findUnique).toHaveBeenCalledWith(expectedFindUniqueArgs);
      const expectedCountArgs = {
        where: {
          roomId: ROOMS.ROOM_MAIN.id,
          createdAt: { gt: lastReadMessage.createdAt },
        },
      };
      expect(prismaMock.message.count).toHaveBeenCalledWith(expectedCountArgs);
    });

    it('UT-countUnreadMessages-02: lastReadMessageId is null — skips the message lookup, counts from epoch', async () => {
      const result = await service.countUnreadMessages(ROOMS.ROOM_MAIN.id, null);

      const expected = 12;
      expect(result).toBe(expected);
      expect(prismaMock.message.findUnique).not.toHaveBeenCalled();
      const expectedCountArgs = {
        where: { roomId: ROOMS.ROOM_MAIN.id, createdAt: { gt: new Date(0) } },
      };
      expect(prismaMock.message.count).toHaveBeenCalledWith(expectedCountArgs);
    });

    it('UT-countUnreadMessages-03: lastReadMessageId points to a since-deleted message — falls back to epoch so nothing is hidden as read', async () => {
      const result = await service.countUnreadMessages(
        ROOMS.ROOM_MAIN.id,
        NOT_FOUND_MESSAGE_ID,
      );

      const expected = 12;
      expect(result).toBe(expected);
    });
  });

  // ==========================================================================
  // claimNextRoomSerialNumber
  // ==========================================================================
  describe('claimNextRoomSerialNumber', () => {
    it('UT-claimNextRoomSerialNumber-01: room exists — atomically increments and resolves the new lastSerialNumber', async () => {
      const result = await service.claimNextRoomSerialNumber(ROOMS.ROOM_MAIN.id);

      const expected = ROOMS.ROOM_MAIN.lastSerialNumber + 1;
      expect(result).toBe(expected);
    });

    it('UT-claimNextRoomSerialNumber-02 [single]: two calls for the same room resolve strictly increasing values', async () => {
      const first = await service.claimNextRoomSerialNumber(ROOMS.ROOM_MAIN.id);
      const second = await service.claimNextRoomSerialNumber(ROOMS.ROOM_MAIN.id);

      const expected = first + 1;
      expect(second).toBe(expected);
    });

    it('UT-claimNextRoomSerialNumber-03 [single]: tx provided — the raw query runs through the tx client, not a fresh transaction', async () => {
      const txMock = mockDeep<PrismaService>();
      (txMock as any).$queryRaw.mockResolvedValue([{ lastSerialNumber: 99 }]);

      const result = await service.claimNextRoomSerialNumber(
        ROOMS.ROOM_MAIN.id,
        txMock as any,
      );

      const expected = 99;
      expect(result).toBe(expected);
      expect((txMock as any).$queryRaw).toHaveBeenCalled();
      expect((prismaMock as any).$queryRaw).not.toHaveBeenCalled();
    });

    it('UT-claimNextRoomSerialNumber-04 [error]: room does not exist — throws RoomNotFoundException', async () => {
      const promise = service.claimNextRoomSerialNumber(NOT_FOUND_ROOM_ID);

      await expect(promise).rejects.toThrow(RoomNotFoundException);
      await expect(promise).rejects.toThrow('Discussion room not found.');
    });
  });

  // ==========================================================================
  // getMessageSerialNumber
  // ==========================================================================
  describe('getMessageSerialNumber', () => {
    it('UT-getMessageSerialNumber-01: message exists — resolves its serialNumber', async () => {
      const message = ROOMS.ROOM_MAIN.messages[0];

      const result = await service.getMessageSerialNumber(message.id);

      const expected = message.serialNumber;
      expect(result).toBe(expected);
    });

    it('UT-getMessageSerialNumber-02: message does not exist — resolves null', async () => {
      const result = await service.getMessageSerialNumber(NOT_FOUND_MESSAGE_ID);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getUnreadStatusBySerialNumber
  // ==========================================================================
  describe('getUnreadStatusBySerialNumber', () => {
    it('UT-getUnreadStatusBySerialNumber-01: ORGANIZER, existing read status — unreadCount = room.lastSerialNumber - lastReadSerialNumber', async () => {
      const result = await service.getUnreadStatusBySerialNumber(
        ROOMS.ROOM_MAIN.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      const organizerReadStatus = ROOMS.ROOM_MAIN.readStatus.organizer!;
      const expected = {
        unreadCount: ROOMS.ROOM_MAIN.lastSerialNumber - organizerReadStatus.lastReadSerialNumber,
        lastReadSerialNumber: organizerReadStatus.lastReadSerialNumber,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getUnreadStatusBySerialNumber-02: PARTICIPANT, existing read status — unreadCount computed from the participant branch', async () => {
      const result = await service.getUnreadStatusBySerialNumber(
        ROOMS.ROOM_MAIN.id,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      const participantReadStatus = ROOMS.ROOM_MAIN.readStatus.participant!;
      const expected = {
        unreadCount: ROOMS.ROOM_MAIN.lastSerialNumber - participantReadStatus.lastReadSerialNumber,
        lastReadSerialNumber: participantReadStatus.lastReadSerialNumber,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getUnreadStatusBySerialNumber-03: no read status record — lastReadSerialNumber treated as 0', async () => {
      const result = await service.getUnreadStatusBySerialNumber(
        ROOMS.ROOM_EMPTY.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      const expected = { unreadCount: 0, lastReadSerialNumber: 0 };
      expect(result).toEqual(expected);
    });

    it('UT-getUnreadStatusBySerialNumber-04 [single]: unreadCount never goes negative even when the stored lastReadSerialNumber is ahead of the room', async () => {
      prismaMock.roomReadStatus.findUnique.mockResolvedValueOnce({
        lastReadSerialNumber: 99,
      } as any);

      const result = await service.getUnreadStatusBySerialNumber(
        ROOMS.ROOM_MAIN.id,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      const expected = { unreadCount: 0, lastReadSerialNumber: 99 };
      expect(result).toEqual(expected);
    });

    it('UT-getUnreadStatusBySerialNumber-05 [error]: room does not exist — throws RoomNotFoundException', async () => {
      const promise = service.getUnreadStatusBySerialNumber(
        NOT_FOUND_ROOM_ID,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      await expect(promise).rejects.toThrow(RoomNotFoundException);
      await expect(promise).rejects.toThrow('Discussion room not found.');
    });
  });

  // ==========================================================================
  // getParticipantEventsWithRoom
  // ==========================================================================
  describe('getParticipantEventsWithRoom', () => {
    it('UT-getParticipantEventsWithRoom-01: no filter — resolves every CONFIRMED-registration event, excluding CANCELLED registrations', async () => {
      const result = await service.getParticipantEventsWithRoom(USERS.PARTICIPANT_MAIN.id);

      const expected = [EVENTS.MAIN, EVENTS.ARCHIVED];
      expect(result).toEqual(expected);
    });

    it('UT-getParticipantEventsWithRoom-02: statusFilter provided — only matching-status events are resolved', async () => {
      const result = await service.getParticipantEventsWithRoom(USERS.PARTICIPANT_MAIN.id, [
        'CONCLUDED' as any,
      ]);

      const expected = [EVENTS.ARCHIVED];
      expect(result).toEqual(expected);
    });

    it('UT-getParticipantEventsWithRoom-03: participant has zero CONFIRMED registrations — resolves []', async () => {
      const result = await service.getParticipantEventsWithRoom(
        USERS.PARTICIPANT_NICKNAME_EMPTY.id,
      );

      const expected: unknown[] = [];
      expect(result).toEqual(expected);
    });
  });

  // ==========================================================================
  // getOrganizerEventsWithRoom
  // ==========================================================================
  describe('getOrganizerEventsWithRoom', () => {
    it('UT-getOrganizerEventsWithRoom-01: no filter — resolves every event owned by the organizer', async () => {
      const result = await service.getOrganizerEventsWithRoom(USERS.ORGANIZER_MAIN.id);

      const expected = [EVENTS.MAIN, EVENTS.ARCHIVED, EVENTS.NO_ROOM];
      expect(result).toEqual(expected);
    });

    it('UT-getOrganizerEventsWithRoom-02: statusFilter provided — only matching-status events are resolved', async () => {
      const result = await service.getOrganizerEventsWithRoom(USERS.ORGANIZER_MAIN.id, [
        'PUBLISHED' as any,
      ]);

      const expected = [EVENTS.MAIN, EVENTS.NO_ROOM];
      expect(result).toEqual(expected);
    });

    it('UT-getOrganizerEventsWithRoom-03: organizer owns zero events — resolves []', async () => {
      const result = await service.getOrganizerEventsWithRoom(USERS.ORGANIZER_OTHER.id);

      const expected: unknown[] = [];
      expect(result).toEqual(expected);
    });
  });

  // ==========================================================================
  // findRoomByEventId
  // ==========================================================================
  describe('findRoomByEventId', () => {
    it('UT-findRoomByEventId-01: a DiscussionRoom exists for the event — resolves { roomId }', async () => {
      const result = await service.findRoomByEventId(ROOMS.ROOM_MAIN.eventId);

      const expected = { roomId: ROOMS.ROOM_MAIN.id };
      expect(result).toEqual(expected);
    });

    it('UT-findRoomByEventId-02: no DiscussionRoom exists for the event — resolves null', async () => {
      const result = await service.findRoomByEventId(NOT_FOUND_EVENT_ID);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getRoomMemberIds
  // ==========================================================================
  describe('getRoomMemberIds', () => {
    it('UT-getRoomMemberIds-01: room exists — resolves organizerProfileId and the confirmed participantProfileIds', async () => {
      const result = await service.getRoomMemberIds(ROOMS.ROOM_MAIN.id);

      const expected = {
        organizerProfileId: ROOMS.ROOM_MAIN.organizerId,
        participantProfileIds: ROOMS.ROOM_MAIN.confirmedParticipantIds,
      };
      expect(result).toEqual(expected);
    });

    it('UT-getRoomMemberIds-02: room has zero confirmed participants — resolves an empty array', async () => {
      const result = await service.getRoomMemberIds(ROOMS.ROOM_EMPTY.id);

      const expected: unknown[] = [];
      expect(result.participantProfileIds).toEqual(expected);
    });

    it('UT-getRoomMemberIds-03 [error]: room does not exist — throws RoomNotFoundException', async () => {
      const promise = service.getRoomMemberIds(NOT_FOUND_ROOM_ID);

      await expect(promise).rejects.toThrow(RoomNotFoundException);
      await expect(promise).rejects.toThrow('Discussion room not found.');
    });
  });
});
