import { TicketStatus, RegistrationStatus, EventStatus } from '@prisma/client';
import { BilingualField } from '../../event/dto/bilingual-field.dto';
import { ParticipantSnapshotDto } from './return-registrant.dto';

export class ReturnTicketDetailOrganizerDto {
  name!: string;
  imageUrl!: string;
}

export class ReturnTicketDetailEventDto {
  id!: string; // Event.id
  title!: BilingualField;
  bannerUrl!: string;
  startAt!: Date | null;
  endAt!: Date | null;
  location!: BilingualField;
  mapLink!: string;
  status!: EventStatus;
  seatLimit!: number | null;
  seatsTaken!: number;
  organizer!: ReturnTicketDetailOrganizerDto;
}

export class ReturnTicketDetailRegistrationDto {
  id!: string; // EventRegistration.id
  status!: RegistrationStatus;
  createdAt!: Date;
}

export class ReturnTicketDetailDto {
  id!: string; // Ticket.id
  qrToken!: string;
  status!: TicketStatus;
  issuedAt!: Date;
  participantSnapshot!: ParticipantSnapshotDto;
  registration!: ReturnTicketDetailRegistrationDto;
  event!: ReturnTicketDetailEventDto;
}
