export const ALLOWED_CATEGORIES = [
  'SEMINAR',
  'WORKSHOP',
  'LECTURE',
  'CONFERENCE',
  'HACKATHON',
  'COMPETITION',
  'CLUB_ACTIVITY',
  'ORIENTATION',
  'VOLUNTEER',
  'TRIP',
  'SPORT',
  'CULTURAL',
  'FESTIVAL',
  'NETWORKING',
  'CAREER_FAIR',
  'PARTY',
  'INTERNSHIP',
  'OTHER'
] as const;

export type EventCategory = typeof ALLOWED_CATEGORIES[number];

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const DEFAULT_BANNER_URL = 'https://placehold.co/600x400?text=No+Image';
export const DEFAULT_SEAT_LIMIT = 30;