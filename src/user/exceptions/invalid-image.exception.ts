import { BadRequestException } from '@nestjs/common';

export class InvalidImageException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
