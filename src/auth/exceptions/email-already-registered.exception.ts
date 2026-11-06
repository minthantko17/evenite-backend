import { ConflictException } from '@nestjs/common';

export class EmailAlreadyRegisteredException extends ConflictException {
  constructor() {
    super('This email is already registered.');
  }
}
