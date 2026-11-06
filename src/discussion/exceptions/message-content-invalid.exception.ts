import { BadRequestException } from '@nestjs/common';

export class MessageContentInvalidException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Message content is invalid.');
  }
}
