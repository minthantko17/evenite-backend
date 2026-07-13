import { InternalServerErrorException } from '@nestjs/common';

export class SaveRegistrationException extends InternalServerErrorException {
  constructor() {
    super(
      'An unexpected error occurred while processing your registration. Please try again later.',
    );
  }
}
