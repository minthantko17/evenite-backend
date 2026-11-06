import { BadRequestException } from '@nestjs/common';

export class RegistrationAlreadyCancelledException extends BadRequestException {
  constructor() {
    super('Registration has already been cancelled.');
  }
}
