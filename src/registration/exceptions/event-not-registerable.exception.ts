import { BadRequestException } from '@nestjs/common';

export class EventNotRegisterableException extends BadRequestException {
  constructor() {
    super('This event is not currently accepting registrations.');
  }
}
