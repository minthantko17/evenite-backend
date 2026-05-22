import { BadRequestException } from '@nestjs/common';

export class FormLockedException extends BadRequestException {
  constructor() {
    super('Form can only be edited while the event is in draft state.');
  }
}