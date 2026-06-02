import { InternalServerErrorException } from '@nestjs/common';

export class ImageUploadException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message ? message : 'Failed to upload image. Please try again.');
  }
}
