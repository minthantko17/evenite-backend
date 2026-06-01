import { BadRequestException } from '@nestjs/common';

export class InvalidMailException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}