import { InternalServerErrorException } from '@nestjs/common';

export class DeleteFormException extends InternalServerErrorException {
  constructor() {
    super('Failed to delete form. Please try again.');
  }
}