import { BadRequestException } from '@nestjs/common';

export class InvalidPreferencesException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}