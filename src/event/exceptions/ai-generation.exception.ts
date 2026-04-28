import { InternalServerErrorException } from '@nestjs/common';

export class AiGenerationException extends InternalServerErrorException {
  constructor() {
    super('There was an error in creating an event, try creating manually.');
  }
}