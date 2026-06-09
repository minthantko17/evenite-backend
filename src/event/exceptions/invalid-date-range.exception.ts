import { BadRequestException } from '@nestjs/common';

export class InvalidDateRangeException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Start date must be before end date.');
  }
}