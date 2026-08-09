// discussion/services/discussion-crud.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReturnMessageDto,
  ReturnMessageSenderDto,
} from '../dto/return-message.dto';
import { ReturnMessagePageDto } from '../dto/return-message-page.dto';
import { ReturnDiscussionRoomListDto } from '../dto/return-discussion-room-list.dto';
import { ReturnRoomReadStatusDto } from '../dto/return-room-read-status.dto';
import { SaveMessageException } from '../exceptions/save-message.exception';
import { SaveRoomReadStatusException } from '../exceptions/save-room-read-status.exception';
import type { BilingualField } from '../../event/dto/bilingual-field.dto';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;

@Injectable()
export class DiscussionCrudService {
  private readonly logger = new Logger(DiscussionCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createMessage(
    roomId: string,
    content: string,
    isAnnouncement: boolean,
    senderParticipantId: string | null,
    senderOrganizerId: string | null,
  ): Promise<ReturnMessageDto> {
    try {
      const message = await this.prisma.message.create({
        data: {
          roomId,
          content,
          isAnnouncement,
          senderParticipantId,
          senderOrganizerId,
        },
        include: {
          senderParticipant: {
            select: { firstName: true, nickname: true, imageUrl: true },
          },
          senderOrganizer: { select: { name: true, imageUrl: true } },
        },
      });
      return this.mapToReturnMessageDto(message);
    } catch (error) {
      this.logger.error('Failed to create message', error);
      throw new SaveMessageException();
    }
  }

  // get messages with cursor pagination
  async getMessagePage(
    roomId: string,
    cursor: string | undefined,
    direction: 'before' | 'after',
    limit: number | undefined,
  ): Promise<ReturnMessagePageDto> {
    const take = Math.min(limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const isBefore = direction === 'before';

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: isBefore
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: take + 1, // fetch extra one to check if there's more
      include: {
        senderParticipant: {
          select: { firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { name: true, imageUrl: true } },
      },
    });

    const hasMoreMessageInQueriedDirection = messages.length > take;
    const page = hasMoreMessageInQueriedDirection ? messages.slice(0, take) : messages;
    const orderedPage = isBefore ? [...page].reverse() : page;
    const mapped = orderedPage.map((m) => this.mapToReturnMessageDto(m));

    const hasMoreOlder = isBefore ? hasMoreMessageInQueriedDirection : !!cursor;
    const hasMoreNewer = isBefore ? !!cursor : hasMoreMessageInQueriedDirection;

    const oldestCursor =
      orderedPage.length > 0 ? orderedPage[0].id : (cursor ?? null);
    const newestCursor =
      orderedPage.length > 0
        ? orderedPage[orderedPage.length - 1].id
        : (cursor ?? null);

    return {
      messages: mapped,
      hasMoreOlder,
      hasMoreNewer,
      oldestCursor,
      newestCursor,
    };
  }

  async getLatestMessageForRoom(
    roomId: string,
  ): Promise<ReturnMessageDto | null> {
    const message = await this.prisma.message.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        senderParticipant: {
          select: { firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { name: true, imageUrl: true } },
      },
    });
    return message ? this.mapToReturnMessageDto(message) : null;
  }

  // update last read time
  async upsertRoomReadStatus(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnRoomReadStatusDto> {
    const where =
      role === Role.ORGANIZER
        ? {
            roomId_readerOrganizerId: {
              roomId,
              readerOrganizerId: organizerProfileId!,
            },
          }
        : {
            roomId_readerParticipantId: {
              roomId,
              readerParticipantId: participantProfileId!,
            },
          };

    try {
      const result = await this.prisma.roomReadStatus.upsert({
        where,
        create: {
          roomId,
          readerParticipantId:
            role === Role.PARTICIPANT ? participantProfileId : null,
          readerOrganizerId:
            role === Role.ORGANIZER ? organizerProfileId : null,
          lastReadAt: new Date(),
        },
        update: { lastReadAt: new Date() },
      });
      return { roomId: result.roomId, lastReadAt: result.lastReadAt };
    } catch (error) {
      this.logger.error('Failed to update room read status', error);
      throw new SaveRoomReadStatusException();
    }
  }

  // to know last read time for room
  async getRoomReadStatus(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<{ lastReadAt: Date } | null> {
    const where =
      role === Role.ORGANIZER
        ? {
            roomId_readerOrganizerId: {
              roomId,
              readerOrganizerId: organizerProfileId!,
            },
          }
        : {
            roomId_readerParticipantId: {
              roomId,
              readerParticipantId: participantProfileId!,
            },
          };

    const result = await this.prisma.roomReadStatus.findUnique({ where });
    return result ? { lastReadAt: result.lastReadAt } : null;
  }

  async countUnreadMessages(roomId: string, sinceDate: Date): Promise<number> {
    return this.prisma.message.count({
      where: { roomId, createdAt: { gt: sinceDate } },
    });
  }

  // get room list (Chat List)
  async getRoomsForParticipant(
    participantProfileId: string,
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { participantId: participantProfileId, status: 'CONFIRMED' },
      select: {
        event: {
          select: {
            id: true,
            title: true,
            bannerUrl: true,
            status: true,
            discussionRoom: { select: { id: true } },
          },
        },
      },
    });

    return Promise.all(
      registrations
        .filter((r) => r.event.discussionRoom)
        .map((r) =>
          this.buildRoomListEntry(r.event, r.event.discussionRoom!.id),
        ),
    );
  }

  async getRoomsForOrganizer(
    organizerProfileId: string,
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const events = await this.prisma.event.findMany({
      where: { organizerId: organizerProfileId },
      select: {
        id: true,
        title: true,
        bannerUrl: true,
        status: true,
        discussionRoom: { select: { id: true } },
      },
    });

    return Promise.all(
      events
        .filter((e) => e.discussionRoom)
        .map((e) => this.buildRoomListEntry(e, e.discussionRoom!.id)),
    );
  }

  // Need to refactor later, rn only returning shape for unread count and readOnly and service is handling it (badbad)
  private async buildRoomListEntry(
    event: {
      id: string;
      title: unknown;
      bannerUrl: string | null;
      status: string;
    },
    roomId: string,
  ): Promise<ReturnDiscussionRoomListDto> {
    const lastMessage = await this.getLatestMessageForRoom(roomId);
    return {
      roomId,
      event: {
        id: event.id,
        title: event.title as BilingualField,
        bannerUrl: event.bannerUrl ?? '',
        status: event.status as any,
      },
      lastMessage,
      unreadCount: 0, // will be filled in by service layer
      isReadOnly: false, // will be filled in by service layer
    };
  }

  async findClosestMessageIdToGivenTime(
    roomId: string,
    timestamp: Date,
  ): Promise<string | null> {
    const message = await this.prisma.message.findFirst({
      where: { roomId, createdAt: { lte: timestamp } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return message?.id ?? null;
  }

  async findRoomByEventId(eventId: string): Promise<{ roomId: string } | null> {
    const room = await this.prisma.discussionRoom.findUnique({
      where: { eventId },
      select: { id: true },
    });
    return room ? { roomId: room.id } : null;
  }

  private mapToReturnMessageDto(message: any): ReturnMessageDto {
    const isOrganizerSender = message.senderOrganizerId !== null;
    const sender: ReturnMessageSenderDto = isOrganizerSender
      ? {
          role: Role.ORGANIZER,
          name: message.senderOrganizer?.name ?? '',
          imageUrl: message.senderOrganizer?.imageUrl ?? '',
        }
      : {
          role: Role.PARTICIPANT,
          name:
            message.senderParticipant?.nickname ||
            message.senderParticipant?.firstName ||
            '',
          imageUrl: message.senderParticipant?.imageUrl ?? '',
        };

    return {
      id: message.id,
      content: message.content,
      isAnnouncement: message.isAnnouncement,
      sender,
      createdAt: message.createdAt,
    };
  }
}
