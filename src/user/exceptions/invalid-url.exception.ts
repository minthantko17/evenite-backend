import { BadRequestException } from '@nestjs/common';

export class InvalidUrlException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
