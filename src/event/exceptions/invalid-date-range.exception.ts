import { BadRequestException } from '@nestjs/common';

export class InvalidDateRangeException extends BadRequestException {
  constructor() {
    super('Start date must be before end date.');
  }
}