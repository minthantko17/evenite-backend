import { ConflictException } from '@nestjs/common';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';
import { ReturnAttendanceDto } from '../dto/return-attendance.dto';

// carries the original attendance so a retried/duplicate scan can show
// "already checked in at ..." instead of a plain error
export class AlreadyCheckedInException extends ConflictException {
  constructor(attendance: ReturnAttendanceDto) {
    super({
      statusCode: 409,
      error: 'Conflict',
      message: 'This participant is already checked in.',
      errorCode: AttendanceErrorCode.ALREADY_CHECKED_IN,
      attendance,
    });
  }
}
