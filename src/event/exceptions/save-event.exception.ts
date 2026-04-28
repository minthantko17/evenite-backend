import { InternalServerErrorException } from '@nestjs/common';

export class SaveEventException extends InternalServerErrorException {
  constructor() {
    super('Failed to save event. Please try again.');
  }
}