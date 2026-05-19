import { FieldType } from '@prisma/client';

export interface ReturnSummaryAnswer {
  responseId: string;
  createdAt: Date;
  value: string | number | string[] | null;
  // need to add submittedBy when registrationId added to FormResponse in feature 5
}

export interface ReturnFormFieldSummary {
  formFieldId: string;
  label: string;
  type: FieldType;
  answers: ReturnSummaryAnswer[];
}

export interface ReturnFormSummary {
  formId: string;
  totalResponses: number;
  summary: ReturnFormFieldSummary[];
}