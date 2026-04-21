import type { BilingualField } from './bilingual-field.dto';
import type { AgendaItem } from './agenda-item.dto';
import { EventCategory } from '../constants/event-category.constant';

export class SaveDraftDto {
  title?: BilingualField;
  description?: BilingualField;
  category?: EventCategory[];
  location?: BilingualField;
  mapLink?: string;
  isOnline?: boolean;
  startAt?: Date;
  endAt?: Date;
  seatLimit?: number;
  hasCatering?: boolean;
  isCateringFree?: boolean;
  cateringDescription?: BilingualField;
  agenda?: AgendaItem[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLineId?: string;
  externalRegistrationUrl?: string;
  remarks?: BilingualField;
  bannerUrl?: string;
}