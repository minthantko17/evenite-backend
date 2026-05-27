import { BadRequestException } from '@nestjs/common';

export class UniversityDomainNotFoundException extends BadRequestException {
  constructor() {
    super(
      'Your email domain is not associated with any registered university.',
    );
  }
}