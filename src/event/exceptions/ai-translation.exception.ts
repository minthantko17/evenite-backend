import { InternalServerErrorException } from '@nestjs/common';

export class AiTranslationException extends InternalServerErrorException {
  constructor() {
    super('There was an error translating the event fields. Please try again.');
  }
}