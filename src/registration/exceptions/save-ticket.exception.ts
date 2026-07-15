import { InternalServerErrorException } from '@nestjs/common';

export class SaveTicketException extends InternalServerErrorException {
  constructor() {
    super(
      'An error occurred while processing your ticket. Please try again later.',
    );
  }
}
