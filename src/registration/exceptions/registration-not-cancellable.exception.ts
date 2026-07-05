import { BadRequestException } from '@nestjs/common';

export class RegistrationNotCancellableException extends BadRequestException {
  constructor(message?: string) {
    super(message ?? 'This registration cannot be cancelled.');
  }
}
