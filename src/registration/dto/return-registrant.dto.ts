import { RegistrationStatus, TicketStatus } from '@prisma/client';

export class ParticipantSnapshotDto {
  firstName!: string;
  lastName!: string;
  nickname!: string;
  studentId!: string;
  major!: string;
}

export class ReturnRegistrantDto {
  id!: string;  // EventRegistration.id
  status!: RegistrationStatus;
  createdAt!: Date;
  ticketStatus!: TicketStatus | null;
  ticketIssuedAt!: Date | null;
  participantSnapshot!: ParticipantSnapshotDto;
}