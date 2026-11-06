import { InternalServerErrorException } from '@nestjs/common';

export class SaveFormResponseException extends InternalServerErrorException {
  constructor() {
    super(
      'An error occurred while saving the form response. Please try again later.',
    );
  }
}
