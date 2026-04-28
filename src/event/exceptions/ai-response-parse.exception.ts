import { InternalServerErrorException } from '@nestjs/common';

export class AiResponseParseException extends InternalServerErrorException {
  constructor() {
    super('There was an error processing the AI response. Please try again.');
  }
}