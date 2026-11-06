import { RegistrationStatus, EventStatus } from '@prisma/client';
import { BilingualField } from '../../event/dto/bilingual-field.dto';

export class ReturnRegisteredEventOrganizerDto {
  name!: string;
  imageUrl!: string;
}

export class ReturnRegisteredEventRegistrationDto {
  id!: string; // EventRegistration.id
  status!: RegistrationStatus;
  createdAt!: Date;
}

export class ReturnRegisteredEventDto {
  id!: string; // Event.id
  title!: BilingualField;
  bannerUrl!: string;
  startAt!: Date | null;
  endAt!: Date | null;
  location!: BilingualField;
  status!: EventStatus;

  organizer!: ReturnRegisteredEventOrganizerDto;
  registration!: ReturnRegisteredEventRegistrationDto;
}
