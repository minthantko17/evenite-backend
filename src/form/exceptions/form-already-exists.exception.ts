import { ConflictException } from '@nestjs/common';

export class FormAlreadyExistsException extends ConflictException {
  constructor() {
    super('A form of this type already exists for this event.');
  }
}
