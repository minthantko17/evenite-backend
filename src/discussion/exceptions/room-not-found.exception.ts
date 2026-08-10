import { NotFoundException } from '@nestjs/common';

export class RoomNotFoundException extends NotFoundException {
  constructor(message?: string) {
    super(message || 'Discussion room not found.');
  }
}
