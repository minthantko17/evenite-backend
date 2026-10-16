import { InternalServerErrorException } from '@nestjs/common';

export class SaveAttendanceException extends InternalServerErrorException {
  constructor() {
    super(
      'An error occurred while saving the check-in. Please try again later.',
    );
  }
}
