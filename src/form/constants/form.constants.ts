export const ALLOWED_AUTOFILL_KEYS = [
  'firstName',
  'lastName',
  'nickname',
  'studentId',
  'major',
  'contactEmail',
  'contactPhone',
  'contactLineId',
] as const;

export type AutoFillKey = (typeof ALLOWED_AUTOFILL_KEYS)[number];
