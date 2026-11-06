import { NotFoundException } from '@nestjs/common';

export class RegistrationNotFoundException extends NotFoundException {
  constructor() {
    super('Registration not found.');
  }
}
