import { ForbiddenException } from '@nestjs/common';

export class FeedbackRequiresAttendanceException extends ForbiddenException {
  constructor() {
    super('Only participants who checked in can submit feedback.');
  }
}
