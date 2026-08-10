import { ForbiddenException } from '@nestjs/common';

export class AnnouncementNotAllowedException extends ForbiddenException {
  constructor(message?: string) {
    super(message || 'Only the organizer can send announcements.');
  }
}
