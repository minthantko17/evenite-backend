import { InternalServerErrorException } from '@nestjs/common';

export class DeleteRegistrationException extends InternalServerErrorException {
  constructor() {
    super(
      'An error occurred while removing registration data. Please try again later.',
    );
  }
}
