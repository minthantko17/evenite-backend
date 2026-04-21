import { BilingualField } from "./bilingual-field.dto";
import { AgendaItem } from "./agenda-item.dto";
import { EventCategory } from "../constants/event-category.constant";

export interface GeneratedEventDto {
  title: BilingualField;
  description: BilingualField;
  category: EventCategory[];
  location: BilingualField;
  mapLink: string;
  isOnline: boolean;
  startAt: Date | undefined;
  endAt: Date | undefined;
  seatLimit: number | undefined;
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
}