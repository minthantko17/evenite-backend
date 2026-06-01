import { ALLOWED_CATEGORIES } from '../../event/constants/event-category.constant';

export const ALLOWED_PERSONAL_PREFERENCES = [
  'MUSIC',
  'GAMING',
  'ART',
  'SPORTS',
  'PHOTOGRAPHY',
  'COOKING',
  'READING',
  'TECHNOLOGY',
  'FASHION',
  'TRAVEL',
  'FILM',
  'DANCE',
  'OTHER',
] as const;
export type PersonalPreference = (typeof ALLOWED_PERSONAL_PREFERENCES)[number];

export const ALLOWED_LANGUAGES = ['en', 'th'] as const;
export type Language = (typeof ALLOWED_LANGUAGES)[number];

export { ALLOWED_CATEGORIES as ALLOWED_EVENT_PREFERENCES };
export type EventPreference = (typeof ALLOWED_CATEGORIES)[number];

export interface UserPreferences {
  personal: PersonalPreference[];
  personalOther?: string;
  event: EventPreference[];
  language: Language[];
}
