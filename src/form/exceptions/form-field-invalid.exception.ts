import { BadRequestException } from '@nestjs/common';

export class FormFieldInvalidException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}