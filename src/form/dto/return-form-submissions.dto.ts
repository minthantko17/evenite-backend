export interface ReturnFormFieldAnswer {
  formFieldId: string;
  label: string;
  valueText: string | null;
  valueNumber: number | null;
  valueDate: Date | null;
  valueArray: string[];
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