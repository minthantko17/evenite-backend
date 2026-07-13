import { TicketStatus, RegistrationStatus, EventStatus } from '@prisma/client';
import { BilingualField } from '../../event/dto/bilingual-field.dto';

export class ReturnParticipantTicketListEventDto {
  id!: string;
  title!: BilingualField;
  bannerUrl!: string;
  startAt!: Date | null;
  endAt!: Date | null;
  status!: EventStatus;
}

export class ReturnParticipantTicketListDto {
  id!: string;  // Ticket.id
  status!: TicketStatus;
  issuedAt!: Date;
  registrationStatus!: RegistrationStatus;
  event!: ReturnParticipantTicketListEventDto;
}