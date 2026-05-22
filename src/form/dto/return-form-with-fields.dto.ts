import { FieldType, FormType } from '@prisma/client';

export interface ReturnFormField {
  id: string;
  formId: string;
  type: FieldType;
  label: string;
  isRequired: boolean;
  order: number;
  options: string[];
  autoFillKey: string | null;
}

export interface ReturnFormWithFields {
  id: string;
  eventId: string;
  type: FormType;
  title: string | null;
  description: string | null;
  fields: ReturnFormField[];
}