import { ConflictException } from '@nestjs/common';

export class FormResponseAlreadyExistsException extends ConflictException {
  constructor() {
    super('You have already submitted a response for this form.');
  }
}
