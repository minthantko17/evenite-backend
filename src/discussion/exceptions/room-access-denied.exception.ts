import { ForbiddenException } from '@nestjs/common';

export class RoomAccessDeniedException extends ForbiddenException {
  constructor(message?: string) {
    super(
      message || 'You do not have permission to access this discussion room.',
    );
  }
}
