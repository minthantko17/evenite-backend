import type { BilingualField } from "./bilingual-field.dto"
import type { AgendaItem } from "./agenda-item.dto"

export interface TranslateBilingualFieldsDto {
  title: BilingualField
  description: BilingualField
  location: BilingualField
  cateringDescription: BilingualField
  agenda: AgendaItem[]
  remarks: BilingualField
}