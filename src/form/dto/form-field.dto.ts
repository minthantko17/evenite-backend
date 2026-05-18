import { FieldType } from '@prisma/client';

export interface FormFieldDto {
  type: FieldType;
  label: string;
  isRequired: boolean;
  options?: string[] | null;
  autoFillKey?: string | null;
}
