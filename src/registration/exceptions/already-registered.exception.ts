import { ConflictException } from '@nestjs/common';

export class AlreadyRegisteredException extends ConflictException {
  constructor() {
    super('You have already registered for this event.');
  }
}
