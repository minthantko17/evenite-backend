import { InternalServerErrorException } from '@nestjs/common';

export class SaveProfileException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message || 'Failed to save profile. Please try again.');
  }
}
