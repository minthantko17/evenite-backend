import { CheckInMethod, TicketStatus } from '@prisma/client';
import { ParticipantSnapshotDto } from '../../registration/dto/return-registrant.dto';
import { ReturnAttendanceTicketDto } from './return-attendance.dto';

export class ReturnAttendanceRecordDto {
  id!: string; // Attendance.id
  method!: CheckInMethod;
  checkedInAt!: Date;
}

export class ReturnAttendanceListItemDto {
  registrationId!: string; // EventRegistration.id
  ticket!: ReturnAttendanceTicketDto;
  participantSnapshot!: ParticipantSnapshotDto;
  attendance!: ReturnAttendanceRecordDto | null; // null = not checked in
}

export class ReturnAttendanceSummaryDto {
  registered!: number;
  checkedIn!: number;
}

export class ReturnAttendanceListDto {
  summary!: ReturnAttendanceSummaryDto;
  items!: ReturnAttendanceListItemDto[];
}
