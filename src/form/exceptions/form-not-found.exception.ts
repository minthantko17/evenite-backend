import { NotFoundException } from '@nestjs/common';

export class FormNotFoundException extends NotFoundException {
  constructor() {
    super('Form not found.');
  }
}
