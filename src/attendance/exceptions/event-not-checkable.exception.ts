import { UnprocessableEntityException } from '@nestjs/common';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';

export class EventNotCheckableException extends UnprocessableEntityException {
  constructor() {
    super({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Check-in is not available for concluded or cancelled events.',
      errorCode: AttendanceErrorCode.EVENT_NOT_CHECKABLE,
    });
  }
}
