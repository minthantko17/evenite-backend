import { CheckInMethod, TicketStatus } from '@prisma/client';
import { ParticipantSnapshotDto } from '../../registration/dto/return-registrant.dto';

export class ReturnAttendanceTicketDto {
  id!: string; // Ticket.id
  status!: TicketStatus;
}

export class ReturnAttendanceDto {
  id!: string; // Attendance.id
  registrationId!: string; // EventRegistration.id
  method!: CheckInMethod;
  checkedInAt!: Date;
  ticket!: ReturnAttendanceTicketDto;
  participantSnapshot!: ParticipantSnapshotDto;
}
