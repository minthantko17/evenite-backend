import { Injectable, Logger } from '@nestjs/common';
import { Role, EventStatus } from '@prisma/client';
import { DiscussionValidationService } from './services/discussion-validation.service';
import { DiscussionCrudService } from './services/discussion-crud.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ReturnMessageDto } from './dto/return-message.dto';
import { ReturnMessagePageDto } from './dto/return-message-page.dto';
import { ReturnDiscussionRoomListDto } from './dto/return-discussion-room-list.dto';
import { ReturnRoomReadStatusDto } from './dto/return-room-read-status.dto';
import { ACTIVE_ROOM_STATUSES, ARCHIVED_ROOM_STATUSES } from './constants/discussion-room-filter.constants';
import { EventWithDiscussionRoom } from './types/discussion.types';
import { BilingualField } from '../event/dto/bilingual-field.dto';

@Injectable()
export class DiscussionService {
  private readonly logger = new Logger(DiscussionService.name);

  constructor(
    private readonly discussionValidationService: DiscussionValidationService,
    private readonly discussionCrudService: DiscussionCrudService,
  ) {}

  // called from DiscussionGateway
  async sendMessage(
    roomId: string,
    dto: CreateMessageDto,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnMessageDto> {
    const { event } =
      await this.discussionValidationService.validateRoomExists(roomId);
    await this.discussionValidationService.validateRoomAccess(
      event,
      role,
      participantProfileId,
      organizerProfileId,
    );
    this.discussionValidationService.validateRoomWritable(event);

    this.discussionValidationService.validateMessageContent(dto.content);
    const trimmedContent = dto.content.trim();

    const isAnnouncement =
      this.discussionValidationService.validateAnnouncementPermission(
        dto.isAnnouncement ?? false,
        role,
      );

    const senderParticipantId =
      role === Role.PARTICIPANT ? participantProfileId : null;
    const senderOrganizerId =
      role === Role.ORGANIZER ? organizerProfileId : null;

    return this.discussionCrudService.createMessage(
      roomId,
      trimmedContent,
      isAnnouncement,
      senderParticipantId,
      senderOrganizerId,
    );
  }

  // called from REST
  async getMessages(
    roomId: string,
    query: GetMessagesQueryDto,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnMessagePageDto> {
    const { event } =
      await this.discussionValidationService.validateRoomExists(roomId);
    await this.discussionValidationService.validateRoomAccess(
      event,
      role,
      participantProfileId,
      organizerProfileId,
    );

    // if no cursor, resume from the caller's last-read position
    let cursor = query.cursor;
    let direction = query.direction ?? 'before';

    if (!cursor) {
      const readStatus = await this.discussionCrudService.getRoomReadStatus(
        roomId,
        role,
        participantProfileId,
        organizerProfileId,
      );

      if (readStatus) {
        const anchorMessage =
          await this.discussionCrudService.findClosestMessageIdToGivenTime(
            roomId,
            readStatus.lastReadAt,
          );
        if (anchorMessage) {
          cursor = anchorMessage;
          direction = 'after';
        }
      }
      // if no readStatus, cursor stays undefined
    }

    return this.discussionCrudService.getMessagePage(
      roomId,
      cursor,
      direction,
      query.limit,
    );
  }

  async markRoomAsRead(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnRoomReadStatusDto> {
    const { event } =
      await this.discussionValidationService.validateRoomExists(roomId);
    await this.discussionValidationService.validateRoomAccess(
      event,
      role,
      participantProfileId,
      organizerProfileId,
    );

    return this.discussionCrudService.upsertRoomReadStatus(
      roomId,
      role,
      participantProfileId,
      organizerProfileId,
    );
  }

  async getRoomListForCaller(
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
    filter?: 'active' | 'archived',
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const statusFilter: EventStatus[] | undefined =
      filter === 'active'
        ? ACTIVE_ROOM_STATUSES
        : filter === 'archived'
          ? ARCHIVED_ROOM_STATUSES
          : undefined;

    const events: EventWithDiscussionRoom[] =
      role === Role.PARTICIPANT
        ? await this.discussionCrudService.getParticipantEventsWithRoom(
            participantProfileId!,
            statusFilter,
          )
        : await this.discussionCrudService.getOrganizerEventsWithRoom(
            organizerProfileId!,
            statusFilter,
          );

    const eventsWithRoom: EventWithDiscussionRoom[] = events.filter(
      (event) => event.discussionRoom !== null,
    );

    return Promise.all(
      eventsWithRoom.map((event) =>
        this.mapToDiscussionRoomListDto(
          event,
          role,
          participantProfileId,
          organizerProfileId,
        ),
      ),
    );
  }

  async validateAccessOnly(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<{ message: string }> {
    const { event } =
      await this.discussionValidationService.validateRoomExists(roomId);
    return this.discussionValidationService.validateRoomAccess(
      event,
      role,
      participantProfileId,
      organizerProfileId,
    );
  }

  async findRoomByEventId(eventId: string): Promise<{ roomId: string } | null> {
    return this.discussionCrudService.findRoomByEventId(eventId);
  }

  private async mapToDiscussionRoomListDto(
    event: EventWithDiscussionRoom,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnDiscussionRoomListDto> {
    const roomId: string = event.discussionRoom!.id;

    const lastMessage: ReturnMessageDto | null =
      await this.discussionCrudService.getLatestMessageForRoom(roomId);

    const readStatus: { lastReadAt: Date } | null =
      await this.discussionCrudService.getRoomReadStatus(
        roomId,
        role,
        participantProfileId,
        organizerProfileId,
      );

    const unreadCount: number =
      await this.discussionCrudService.countUnreadMessages(
        roomId,
        readStatus?.lastReadAt ?? new Date(0),
      );

    const isReadOnly: boolean = this.checkIsReadOnly(event);

    return {
      roomId,
      event: {
        id: event.id,
        title: event.title as unknown as BilingualField,
        bannerUrl: event.bannerUrl ?? '',
        status: event.status,
      },
      lastMessage,
      unreadCount,
      isReadOnly,
    };
  }

  private checkIsReadOnly(event: EventWithDiscussionRoom): boolean {
    try {
      this.discussionValidationService.validateRoomWritable(event);
      return false;
    } catch {
      return true;
    }
  }
}
