import { InternalServerErrorException } from '@nestjs/common';

export class BannerUploadException extends InternalServerErrorException {
  constructor() {
    super('Failed to upload banner image. Please try again.');
  }
}