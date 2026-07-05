import { ConflictException } from '@nestjs/common';

export class EventFullException extends ConflictException {
  constructor() {
    super('All seats are fully taken for this event.');
  }
}
