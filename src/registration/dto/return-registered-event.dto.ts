import { RegistrationStatus, EventStatus } from '@prisma/client';
import { BilingualField } from '../../event/dto/bilingual-field.dto';

export class ReturnRegisteredEventOrganizerDto {
  name!: string;
  imageUrl!: string;
}

export class ReturnRegisteredEventInfoDto {
  id!: string;
  title!: BilingualField;
  bannerUrl!: string;
  startAt!: Date | null;
  endAt!: Date | null;
  location!: BilingualField;
  status!: EventStatus;
  organizer!: ReturnRegisteredEventOrganizerDto;
}

export class ReturnRegisteredEventDto {
  id!: string; // EventRegistration.id
  status!: RegistrationStatus;
  createdAt!: Date;
  event!: ReturnRegisteredEventInfoDto;
}
