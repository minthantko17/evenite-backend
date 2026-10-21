// machine-readable codes returned in the `errorCode` field of check-in error
// responses, so clients don't have to parse message text
export enum AttendanceErrorCode {
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  TICKET_CANCELLED = 'TICKET_CANCELLED',
  TICKET_EXPIRED = 'TICKET_EXPIRED',
  TICKET_NOT_ACTIVE = 'TICKET_NOT_ACTIVE',
  EVENT_NOT_CHECKABLE = 'EVENT_NOT_CHECKABLE',
  ATTENDANCE_NOT_FOUND = 'ATTENDANCE_NOT_FOUND',
  FEEDBACK_ALREADY_SUBMITTED = 'FEEDBACK_ALREADY_SUBMITTED',
}
