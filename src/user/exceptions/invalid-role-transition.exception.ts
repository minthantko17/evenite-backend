import { BadRequestException } from '@nestjs/common';

export class InvalidRoleTransitionException extends BadRequestException {
  constructor() {
    super('You are already in this role.');
  }
}
