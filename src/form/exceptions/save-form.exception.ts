import { InternalServerErrorException } from '@nestjs/common';

export class SaveFormException extends InternalServerErrorException {
  constructor() {
    super('Failed to save form. Please try again.');
  }
}