import { ConflictException } from '@nestjs/common';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';

export class FeedbackAlreadySubmittedException extends ConflictException {
  constructor() {
    super({
      statusCode: 409,
      error: 'Conflict',
      message:
        'Cannot undo check-in because the participant has already submitted feedback.',
      errorCode: AttendanceErrorCode.FEEDBACK_ALREADY_SUBMITTED,
    });
  }
}
