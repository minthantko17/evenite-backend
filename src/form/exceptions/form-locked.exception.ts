import { BadRequestException } from '@nestjs/common';

export class FormLockedException extends BadRequestException {
  constructor() {
    super('Form cannot be edited after the event is published.');
  }
}