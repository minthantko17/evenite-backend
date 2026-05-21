import { FieldType } from '@prisma/client';

export interface ReturnFormFieldAnswer {
  formFieldId: string;
  label: string;
  type: FieldType;
  value : string | number | Date | string[] | null;
}

export interface ReturnFormSubmissionItem {
  id: string;
  createdAt: Date;
  answers: ReturnFormFieldAnswer[];
  // need to add submittedBy when registrationId added to FormResponse in feature 5
}

export interface ReturnFormSubmissions {
  formId: string;
  totalResponses: number;
  responses: ReturnFormSubmissionItem[];
}