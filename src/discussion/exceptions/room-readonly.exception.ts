import { ForbiddenException } from '@nestjs/common';

export class RoomReadOnlyException extends ForbiddenException {
  constructor(message?: string) {
    super(
      message ||
        'This discussion room is read-only and no longer accepts new messages.',
    );
  }
}
