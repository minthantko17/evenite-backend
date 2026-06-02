import { BadRequestException } from '@nestjs/common';

export class NameEmptyException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}