import { BadRequestException } from '@nestjs/common';

export class FormHasResponsesException extends BadRequestException {
  constructor() {
    super('Form cannot be updated because it has existing responses.');
  }
}
