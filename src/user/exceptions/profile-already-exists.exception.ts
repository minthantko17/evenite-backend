import { ConflictException } from '@nestjs/common';

export class ProfileAlreadyExistsException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}