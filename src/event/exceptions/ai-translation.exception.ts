import { InternalServerErrorException } from '@nestjs/common';

export class AiTranslationException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message || 'There was an error translating the event fields. Please try again.');
  }
}