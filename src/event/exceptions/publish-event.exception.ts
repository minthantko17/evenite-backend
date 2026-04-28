import { InternalServerErrorException } from '@nestjs/common';

export class PublishEventException extends InternalServerErrorException {
  constructor() {
    super('Failed to publish event. Please try again.');
  }
}