import { RegistrationStatus, TicketStatus } from '@prisma/client';

export class ParticipantSnapshotDto {
  firstName!: string | null;
  lastName!: string | null;
  nickname!: string | null;
  studentId!: string | null;
  major!: string | null;
}

export class ReturnRegistrantDto {
  id!: string;  // EventRegistration.id
  status!: RegistrationStatus;
  createdAt!: Date;
  ticketStatus!: TicketStatus | null;
  ticketIssuedAt!: Date | null;
  participantSnapshot!: ParticipantSnapshotDto;
}