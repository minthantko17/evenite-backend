import { UnprocessableEntityException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';

const CODE_BY_STATUS: Partial<Record<TicketStatus, AttendanceErrorCode>> = {
  [TicketStatus.CANCELLED]: AttendanceErrorCode.TICKET_CANCELLED,
  [TicketStatus.EXPIRED]: AttendanceErrorCode.TICKET_EXPIRED,
};

const MESSAGE_BY_STATUS: Partial<Record<TicketStatus, string>> = {
  [TicketStatus.CANCELLED]: 'This ticket has been cancelled.',
  [TicketStatus.EXPIRED]: 'This ticket has expired.',
};

export class TicketNotActiveException extends UnprocessableEntityException {
  constructor(status: TicketStatus) {
    super({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: MESSAGE_BY_STATUS[status] ?? 'This ticket is not active.',
      errorCode:
        CODE_BY_STATUS[status] ?? AttendanceErrorCode.TICKET_NOT_ACTIVE,
    });
  }
}
