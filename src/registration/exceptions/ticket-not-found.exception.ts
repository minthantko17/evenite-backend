import { NotFoundException } from '@nestjs/common';

export class TicketNotFoundException extends NotFoundException {
  constructor() {
    super('Ticket not found.');
  }
}
