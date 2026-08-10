import { InternalServerErrorException } from '@nestjs/common';

export class SaveRoomReadStatusException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message || 'Failed to update read status. Please try again.');
  }
}