import { NotFoundException } from '@nestjs/common';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';

// intentionally the same error whether the ticket doesn't exist or belongs to
// another event, to avoid leaking ticket existence
export class AttendanceTicketNotFoundException extends NotFoundException {
  constructor() {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: 'Ticket not found for this event.',
      errorCode: AttendanceErrorCode.TICKET_NOT_FOUND,
    });
  }
}
