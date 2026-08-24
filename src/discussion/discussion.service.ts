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

const DEFAULT_MESSAGE_PAGE_SIZE = 25;
const MAX_MESSAGE_PAGE_SIZE = 25;
const MAX_ANNOUNCEMENT_COUNT = 15;

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
    // validation
    const { event } =
      await this.discussionValidationService.validateRoomExists(roomId);
    await this.discussionValidationService.validateRoomAccess(
      event,
      role,
      participantProfileId,
      organizerProfileId,
    );

    const pageSize = Math.min(
      query.limit ?? DEFAULT_MESSAGE_PAGE_SIZE,
      MAX_MESSAGE_PAGE_SIZE,
    );

    // If no cursor, resume from the last read message. 
    // If never read (or the room was empty at last read), fall through to the plain latest-page fetch
    if (!query.cursor) {
      const readStatus = await this.discussionCrudService.getRoomReadStatus(
        roomId,
        role,
        participantProfileId,
        organizerProfileId,
      );

      if (readStatus?.lastReadMessageId) {
        return this.discussionCrudService.getPaginatedMessagesByCursor(
          roomId,
          readStatus.lastReadMessageId,
          'after',
          pageSize,
        );
      }
    }

    return this.discussionCrudService.getPaginatedMessagesByCursor(
      roomId,
      query.cursor,
      query.direction ?? 'before',
      pageSize,
    );
  }

  // announcements are never paginated, always return the latest
  // MAX_ANNOUNCEMENT_COUNT, no scroll-back
  async getAnnouncements(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnMessageDto[]> {
    const { event } =
      await this.discussionValidationService.validateRoomExists(roomId);
    await this.discussionValidationService.validateRoomAccess(
      event,
      role,
      participantProfileId,
      organizerProfileId,
    );

    return this.discussionCrudService.getLatestAnnouncements(
      roomId,
      MAX_ANNOUNCEMENT_COUNT,
    );
  }

  // update read position to last read message
  async markRoomAsRead(
    roomId: string,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
    lastReadMessageId: string | undefined,
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
      lastReadMessageId,
    );
  }

  async getCreatedDiscussionRooms(
    organizerProfileId: string,
    filter?: 'active' | 'archived',
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const statusFilter = this.resolveStatusFilter(filter);
    const events = await this.discussionCrudService.getOrganizerEventsWithRoom(
      organizerProfileId,
      statusFilter,
    );
    return this.mapEventsToRoomListDtos(
      events,
      Role.ORGANIZER,
      null,
      organizerProfileId,
    );
  }

  async getJoinedDiscussionRooms(
    participantProfileId: string,
    filter?: 'active' | 'archived',
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const statusFilter = this.resolveStatusFilter(filter);
    const events =
      await this.discussionCrudService.getParticipantEventsWithRoom(
        participantProfileId,
        statusFilter,
      );
    return this.mapEventsToRoomListDtos(
      events,
      Role.PARTICIPANT,
      participantProfileId,
      null,
    );
  }

  private resolveStatusFilter(
    filter?: 'active' | 'archived',
  ): EventStatus[] | undefined {
    return filter === 'active'
      ? ACTIVE_ROOM_STATUSES
      : filter === 'archived'
        ? ARCHIVED_ROOM_STATUSES
        : undefined;
  }

  private async mapEventsToRoomListDtos(
    events: EventWithDiscussionRoom[],
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const eventsWithRoom = events.filter(
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

  async authorizeRoomJoinAccess(
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

    const readStatus: { lastReadMessageId: string | null } | null =
      await this.discussionCrudService.getRoomReadStatus(
        roomId,
        role,
        participantProfileId,
        organizerProfileId,
      );

    const unreadCount: number =
      await this.discussionCrudService.countUnreadMessages(
        roomId,
        readStatus?.lastReadMessageId ?? null,
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
