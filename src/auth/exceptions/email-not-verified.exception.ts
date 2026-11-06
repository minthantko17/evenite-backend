import { ForbiddenException } from '@nestjs/common';

export class EmailNotVerifiedException extends ForbiddenException {
  constructor() {
    super('Please verify your email before logging in.');
  }
}
