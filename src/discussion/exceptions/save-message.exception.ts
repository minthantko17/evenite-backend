import { InternalServerErrorException } from '@nestjs/common';

export class SaveMessageException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message || 'Failed to save message. Please try again.');
  }
}
