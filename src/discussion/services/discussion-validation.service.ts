// discussion/services/discussion-validation.service.ts
import { Injectable } from '@nestjs/common';
import { Event, EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationValidationService } from '../../registration/services/registration-validation.service';
import { RoomNotFoundException } from '../exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from '../exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from '../exceptions/room-read-only.exception';
import { MessageContentInvalidException } from '../exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from '../exceptions/announcement-not-allowed.exception';

const MAX_MESSAGE_LENGTH = 2000;
const READ_ONLY_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours
const CONCLUDED_FALLBACK_OFFSET_MS = 6 * 60 * 60 * 1000; // 6 hours

@Injectable()
export class DiscussionValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrationValidationService: RegistrationValidationService,
  ) {}

  async validateRoomExists(
    roomId: string,
  ): Promise<{ roomId: string; event: Event }> {
    const room = await this.prisma.discussionRoom.findUnique({
      where: { id: roomId },
      include: { event: true },
    });
    if (!room) {
      throw new RoomNotFoundException();
    }
    return { roomId: room.id, event: room.event };
  }

  // event owner organizer or confirmed participant
  async validateRoomAccess(
    event: Event,
    role: Role,
    participantProfileId: string | null,
    organizerProfileId: string | null,
  ): Promise<{ message: string }> {
    const isOwner =
      role === Role.ORGANIZER && event.organizerId === organizerProfileId;
    if (isOwner) {
      return { message: 'Organizer has access to this room.' };
    }

    if (role === Role.PARTICIPANT && participantProfileId) {
      await this.registrationValidationService.validateConfirmedRegistration(
        event.id,
        participantProfileId,
      );
      return { message: 'Participant has access to this room.' };
    }

    throw new RoomAccessDeniedException();
  }

  // check for writeable for sending message
  validateRoomWritable(event: Event): { message: string } {
    if (event.status === EventStatus.CANCELLED) {
      throw new RoomReadOnlyException(
        'This event has been cancelled. The discussion room is read-only.',
      );
    }

    if (event.status === EventStatus.CONCLUDED) {
      const referenceTime =
        event.endAt ??
        new Date(
          (event.startAt?.getTime() ?? 0) + CONCLUDED_FALLBACK_OFFSET_MS,
        );

      const readOnlyThreshold =
        referenceTime.getTime() + READ_ONLY_GRACE_PERIOD_MS;

      if (Date.now() > readOnlyThreshold) {
        throw new RoomReadOnlyException();
      }
    }

    return { message: 'Discussion room is writable.' };
  }

  validateMessageContent(content: string): string {
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
      throw new MessageContentInvalidException('Message cannot be empty.');
    }
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      throw new MessageContentInvalidException(
        `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      );
    }

    return content;
  }

  validateAnnouncementPermission(
    isAnnouncement: boolean,
    role: Role,
  ): boolean {
    if (isAnnouncement && role !== Role.ORGANIZER) {
      throw new AnnouncementNotAllowedException();
    }
    return isAnnouncement;
  }
}
