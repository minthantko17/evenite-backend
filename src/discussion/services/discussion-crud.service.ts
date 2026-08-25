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
import { RoomNotFoundException } from '../exceptions/room-not-found.exception';
import type { BilingualField } from '../../event/dto/bilingual-field.dto';
import { EventWithDiscussionRoom } from '../types/discussion.types';

@Injectable()
export class DiscussionCrudService {
  private readonly logger = new Logger(DiscussionCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  // returns tx if provided, falls back to prisma — allows methods to work inside or outside transaction
  private getClient(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async createMessage(
    roomId: string,
    content: string,
    isAnnouncement: boolean,
    senderParticipantId: string | null,
    senderOrganizerId: string | null,
  ): Promise<ReturnMessageDto> {
    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const serialNumber = await this.claimNextRoomSerialNumber(roomId, tx);
        return tx.message.create({
          data: {
            roomId,
            content,
            isAnnouncement,
            senderParticipantId,
            senderOrganizerId,
            serialNumber,
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
            senderOrganizer: {
              select: { id: true, name: true, imageUrl: true },
            },
          },
        });
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
  ): Promise<ReturnMessagePageDto> {
    const isBefore = direction === 'before';

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: isBefore
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: limit + 1, // fetch extra one to check if there's more
      include: {
        senderParticipant: {
          select: { id: true, firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    const hasMoreMessageInQueriedDirection = messages.length > limit;
    const page = hasMoreMessageInQueriedDirection
      ? messages.slice(0, limit)
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

  // retrieve only fixed number of latest announcements, no pagination
  async getLatestAnnouncements(
    roomId: string,
    limit: number,
  ): Promise<ReturnMessageDto[]> {
    const messages = await this.prisma.message.findMany({
      where: { roomId, isAnnouncement: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        senderParticipant: {
          select: { id: true, firstName: true, nickname: true, imageUrl: true },
        },
        senderOrganizer: { select: { id: true, name: true, imageUrl: true } },
      },
    });

    return messages.reverse().map((m) => this.mapToReturnMessageDto(m));
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

  // update last read message
  async upsertLastReadMessage(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
    lastReadMessageId: string | undefined,
    lastReadSerialNumber: number | undefined,
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
          lastReadMessageId: lastReadMessageId ?? null,
          lastReadSerialNumber: lastReadSerialNumber ?? 0,
        },
        update: {
          ...(lastReadMessageId !== undefined && { lastReadMessageId }),
          ...(lastReadSerialNumber !== undefined && { lastReadSerialNumber }),
        },
      });
      return {
        roomId: result.roomId,
        lastReadMessageId: result.lastReadMessageId,
      };
    } catch (error) {
      this.logger.error('Failed to update room read status', error);
      throw new SaveRoomReadStatusException();
    }
  }

  // to know last read message for room
  async getRoomReadStatus(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<{ lastReadMessageId: string | null } | null> {
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
    return result
      ? { lastReadMessageId: result.lastReadMessageId }
      : null;
  }

  async countUnreadMessages(
    roomId: string,
    lastReadMessageId: string | null,
  ): Promise<number> {
    const sinceDate = await this.resolveLastReadCreatedAt(lastReadMessageId);
    return this.prisma.message.count({
      where: { roomId, createdAt: { gt: sinceDate } },
    });
  }

  async claimNextRoomSerialNumber(
    roomId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = this.getClient(tx);
    const result = await client.$queryRaw<{ lastSerialNumber: number }[]>`
      UPDATE "DiscussionRoom"
      SET "lastSerialNumber" = "lastSerialNumber" + 1
      WHERE id = ${roomId}
      RETURNING "lastSerialNumber"
    `;

    if (result.length === 0) {
      throw new RoomNotFoundException();
    }

    return result[0].lastSerialNumber;
  }

  async getMessageSerialNumber(messageId: string): Promise<number | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { serialNumber: true },
    });
    return message?.serialNumber ?? null;
  }

  async getUnreadCountBySerialNumber(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<number> {
    const readStatusWhere =
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

    const [room, readStatus] = await Promise.all([
      this.prisma.discussionRoom.findUnique({
        where: { id: roomId },
        select: { lastSerialNumber: true },
      }),
      this.prisma.roomReadStatus.findUnique({
        where: readStatusWhere,
        select: { lastReadSerialNumber: true },
      }),
    ]);

    if (!room) {
      throw new RoomNotFoundException();
    }

    const lastReadSerialNumber = readStatus?.lastReadSerialNumber ?? 0;
    return Math.max(0, room.lastSerialNumber - lastReadSerialNumber);
  }

  private async resolveLastReadCreatedAt(
    lastReadMessageId: string | null,
  ): Promise<Date> {
    if (!lastReadMessageId) {
      return new Date(0);
    }
    const lastReadMessage = await this.prisma.message.findUnique({
      where: { id: lastReadMessageId },
      select: { createdAt: true },
    });
    // if the referenced message was since deleted, fall back to epoch so we
    // never under-count and hide genuinely new messages from the user
    return lastReadMessage?.createdAt ?? new Date(0);
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

  async getRoomMemberIds(
    roomId: string,
  ): Promise<{ organizerProfileId: string; participantProfileIds: string[] }> {
    const room = await this.prisma.discussionRoom.findUnique({
      where: { id: roomId },
      select: {
        event: {
          select: {
            organizerId: true,
            eventRegistrations: {
              where: { status: RegistrationStatus.CONFIRMED },
              select: { participantId: true },
            },
          },
        },
      },
    });

    if (!room) {
      throw new RoomNotFoundException();
    }

    return {
      organizerProfileId: room.event.organizerId,
      participantProfileIds: room.event.eventRegistrations.map(
        (registration) => registration.participantId,
      ),
    };
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
      serialNumber: message.serialNumber,
    };
  }
}
