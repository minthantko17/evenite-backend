import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DiscussionValidationService } from './services/discussion-validation.service';
import { DiscussionCrudService } from './services/discussion-crud.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ReturnMessageDto } from './dto/return-message.dto';
import { ReturnMessagePageDto } from './dto/return-message-page.dto';
import { ReturnDiscussionRoomListDto } from './dto/return-discussion-room-list.dto';
import { ReturnRoomReadStatusDto } from './dto/return-room-read-status.dto';

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
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const rooms =
      role === Role.PARTICIPANT
        ? await this.discussionCrudService.getRoomsForParticipant(
            participantProfileId!,
          )
        : await this.discussionCrudService.getRoomsForOrganizer(
            organizerProfileId!,
          );

    return Promise.all(
      rooms.map((room) =>
        this.attachReadStatusAndReadOnlyFlag(
          room,
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

  // NOTE: Need to refactor this.
  private async attachReadStatusAndReadOnlyFlag(
    room: ReturnDiscussionRoomListDto,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<ReturnDiscussionRoomListDto> {
    const readStatus = await this.discussionCrudService.getRoomReadStatus(
      room.roomId,
      role,
      participantProfileId,
      organizerProfileId,
    );
    const sinceDate = readStatus?.lastReadAt ?? new Date(0);
    const unreadCount = await this.discussionCrudService.countUnreadMessages(
      room.roomId,
      sinceDate,
    );

    const { event } = await this.discussionValidationService.validateRoomExists(
      room.roomId,
    );
    let isReadOnly = false;
    try {
      this.discussionValidationService.validateRoomWritable(event);
    } catch {
      isReadOnly = true;
    }

    return { ...room, unreadCount, isReadOnly };
  }
}
