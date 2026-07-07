import type { BilingualField } from './bilingual-field.dto';
import type { AgendaItem } from './agenda-item.dto';
import { EventStatus, FormType } from '@prisma/client';

export interface CreatedEventForm {
  id: string;
  type: FormType;
}

export interface EventResponseDto {
  id: string;
  organizerId: string;
  universityId: string;
  title: BilingualField;
  description: BilingualField;
  category: string[];
  location: BilingualField;
  mapLink: string;
  isOnline: boolean;
  startAt: Date | null;
  endAt: Date | null;
  seatLimit: number | null;
  seatsTaken: number;
  hasCatering: boolean;
  isCateringFree: boolean;
  cateringDescription: BilingualField;
  agenda: AgendaItem[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactLineId: string;
  externalUrl: string;
  remarks: BilingualField;
  bannerUrl: string;
  status: EventStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  forms: CreatedEventForm[];
}