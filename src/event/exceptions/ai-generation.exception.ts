import { InternalServerErrorException } from '@nestjs/common';

export class AiGenerationException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message || 'There was an error in creating an event, try creating manually.');
  }
}