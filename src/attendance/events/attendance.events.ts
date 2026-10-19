import { ReturnAttendanceDto } from '../dto/return-attendance.dto';
import { ReturnAttendanceSummaryDto } from '../dto/return-attendance-list.dto';

// payloads of the internal EventEmitter2 events 'attendance.checked-in' and
// 'attendance.undone', emitted after the DB transaction commits.
// The live gateway turns them into socket messages.

export interface AttendanceCheckedInPayload {
  eventId: string;
  organizerProfileId: string;
  participantProfileId: string;
  attendance: ReturnAttendanceDto;
  counts: ReturnAttendanceSummaryDto;
}

export interface AttendanceUndonePayload {
  eventId: string;
  organizerProfileId: string;
  participantProfileId: string;
  registrationId: string;
  ticketId: string;
  counts: ReturnAttendanceSummaryDto;
}
