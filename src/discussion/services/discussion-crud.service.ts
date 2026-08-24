import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role, EventStatus, RegistrationStatus } from '@prisma/client';
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
import { EventWithDiscussionRoom } from '../types/discussion.types';

const MAX_MESSAGE_PAGE_SIZE = 25;
const MAX_ANNOUNCEMENT_PAGE_SIZE = 15;

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
            select: {
              id: true,
              firstName: true,
              nickname: true,
              imageUrl: true,
            },
          },
          senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
        },
      });
      return this.mapToReturnMessageDto(message);
    } catch (error) {
      this.logger.error('Failed to create message', error);
      throw new SaveMessageException();
    }
  }

  // get messages with cursor pagination
  async getPaginatedMessagesByCursor(
    roomId: string,
    cursor: string | undefined,
    direction: 'before' | 'after',
    limit: number,
    isAnnouncement: boolean = false,
  ): Promise<ReturnMessagePageDto> {
    const take = Math.min(
      limit,
      isAnnouncement ? MAX_ANNOUNCEMENT_PAGE_SIZE : MAX_MESSAGE_PAGE_SIZE,
    );
    const isBefore = direction === 'before';

    const messages = await this.prisma.message.findMany({
      where: {
        roomId,
        ...(isAnnouncement && { isAnnouncement: true }),
      },
      orderBy: isBefore
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: take + 1, // fetch extra one to check if there's more
      include: {
        senderParticipant: {
          select: { id: true, firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    const hasMoreMessageInQueriedDirection = messages.length > take;
    const page = hasMoreMessageInQueriedDirection
      ? messages.slice(0, take)
      : messages;
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

  async getPaginatedMessagesByTimestamp(
    roomId: string,
    lastReadAt: Date,
    limit: number,
  ): Promise<ReturnMessagePageDto> {
    const take = Math.min(limit, MAX_MESSAGE_PAGE_SIZE);

    // find the actual last-read message
    const anchorMessage = await this.prisma.message.findFirst({
      where: { roomId, createdAt: { lte: lastReadAt } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // if no message exists at or before lastReadAt (e.g. room empty), just return everything from the beginning
    const anchorTime = anchorMessage?.createdAt ?? new Date(0);

    const messages = await this.prisma.message.findMany({
      where: { roomId, createdAt: { gte: anchorTime } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
      include: {
        senderParticipant: {
          select: { id: true, firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    const hasMoreNewer = messages.length > take;
    const page = hasMoreNewer ? messages.slice(0, take) : messages;
    const mapped = page.map((m) => this.mapToReturnMessageDto(m));

    return {
      messages: mapped,
      hasMoreOlder: true,
      hasMoreNewer,
      oldestCursor: page.length > 0 ? page[0].id : null,
      newestCursor: page.length > 0 ? page[page.length - 1].id : null,
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
          select: { id: true, firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
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
  async getParticipantEventsWithRoom(
    participantProfileId: string,
    statusFilter?: EventStatus[],
  ): Promise<EventWithDiscussionRoom[]> {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        participantId: participantProfileId,
        status: RegistrationStatus.CONFIRMED,
        ...(statusFilter && { event: { status: { in: statusFilter } } }),
      },
      include: {
        event: { include: { discussionRoom: true } },
      },
    });

    return registrations.map((registration) => registration.event);
  }

  async getOrganizerEventsWithRoom(
    organizerProfileId: string,
    statusFilter?: EventStatus[],
  ): Promise<EventWithDiscussionRoom[]> {
    return this.prisma.event.findMany({
      where: {
        organizerId: organizerProfileId,
        ...(statusFilter && { status: { in: statusFilter } }),
      },
      include: { discussionRoom: true },
    });
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
          id: message.senderOrganizer!.id,
          role: Role.ORGANIZER,
          name: message.senderOrganizer?.name ?? '',
          imageUrl: message.senderOrganizer?.imageUrl ?? '',
        }
      : {
          id: message.senderParticipant!.id,
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
