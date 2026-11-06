import { NotFoundException } from '@nestjs/common';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';

export class AttendanceNotFoundException extends NotFoundException {
  constructor() {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: 'Check-in record not found for this event.',
      errorCode: AttendanceErrorCode.ATTENDANCE_NOT_FOUND,
    });
  }
}
