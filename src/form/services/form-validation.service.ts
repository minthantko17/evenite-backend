import { Injectable } from '@nestjs/common';
import { FormType, FieldType, EventStatus, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FormFieldInputDto } from '../dto/create-form.dto';
import { FormFieldInvalidException } from '../exceptions/form-field-invalid.exception';
import { FormLockedException } from '../exceptions/form-locked.exception';
import { FormAlreadyExistsException } from '../exceptions/form-already-exists.exception';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';
import { FormAlreadyHasResponsesException } from '../exceptions/form-already-has-responses.exception';
import { CreateFormFieldAnswerDto } from '../dto/create-form-response.dto';
import { ReturnFormField } from '../dto/return-form-with-fields.dto';
import { ALLOWED_AUTOFILL_KEYS } from '../constants/form.constants';
import { RegistrationNotFoundException } from '../../registration/exceptions/registration-not-found.exception';

@Injectable()
export class FormValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateFormTypeNotDuplicated(
    eventId: string,
    type: FormType,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
    });
    if (existing) throw new FormAlreadyExistsException();
    return { message: 'Form type is not duplicated.' };
  }

  // form is locked for updating if event is not in DRAFT status
  async validateFormNotLocked(formId: string): Promise<{ message: string }> {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: { event: { select: { status: true } } },
    });
    if (!form) {
      throw new FormNotFoundException();
    }
    if (form.event.status !== EventStatus.DRAFT) {
      throw new FormLockedException();
    }
    return { message: 'Form is not locked for updating.' };
  }

  async validateNoResponsesExist(formId: string): Promise<{ message: string }> {
    const count = await this.prisma.formResponse.count({
      where: { formId },
    });
    if (count > 0) {
      throw new FormAlreadyHasResponsesException();
    }
    return { message: 'No response exists for this form.' };
  }

  validateFormFields(fields: FormFieldInputDto[]): void {
    fields.forEach((field, index) => {
      if (!field.label || field.label.trim().length === 0) {
        throw new FormFieldInvalidException(
          `Field at index ${index}: label is required.`,
        );
      }
      if (
        (field.type === FieldType.CHOICE ||
          field.type === FieldType.CHECKBOX) &&
        (!field.options || field.options.length < 2)
      ) {
        throw new FormFieldInvalidException(
          `Field at index ${index}: at least two options are required for ${field.type} type.`,
        );
      }
      if (
        field.autoFillKey !== null &&
        field.autoFillKey !== undefined &&
        field.autoFillKey.trim() !== '' &&
        !ALLOWED_AUTOFILL_KEYS.includes(field.autoFillKey as any)
      ) {
        throw new FormFieldInvalidException(
          `Field at index ${index}: invalid autoFillKey "${field.autoFillKey}".`,
        );
      }
    });
  }

  async validateParticipantIsRegistered(
    eventId: string,
    participantProfileId: string,
  ): Promise<{ registrationId: string; status: RegistrationStatus }> {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        participantId_eventId: {
          participantId: participantProfileId,
          eventId,
        },
      },
      select: { id: true, status: true },
    });

    if (!registration || registration.status !== RegistrationStatus.CONFIRMED) {
      throw new RegistrationNotFoundException();
    }

    return {
      registrationId: registration.id,
      status: registration.status,
    };
  }

  // (me to my future self) following are related to method for dev purposes only
  validateFormFieldAnswers(
    fields: ReturnFormField[],
    answers: CreateFormFieldAnswerDto[],
  ): void {
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    this.validateAllRequiredFieldsIncluded(fields, answers);

    answers.forEach((answer, index) => {
      // check formFieldId belongs to this form
      const field = fieldMap.get(answer.formFieldId);
      if (!field) {
        throw new FormFieldInvalidException(
          `Answer at index ${index}: formFieldId does not belong to this form.`,
        );
      }

      // validate if only correct value column exists per field type
      this.validateAnswerValueType(answer, field, index);

      // validate date format if provided
      this.validateAnswerDateFormat(answer, field, index);

      // validate options if it's choice or checkbox type
      this.validateAnswerOptions(answer, field, index);

      // validate isRequired field is answered
      this.validateRequiredFieldHasAnswer(answer, field, index);
    });
  }

  private validateAllRequiredFieldsIncluded(
    fields: ReturnFormField[],
    answers: CreateFormFieldAnswerDto[],
  ): void {
    const answeredFieldIds = new Set(answers.map((a) => a.formFieldId));
    const missingRequired = fields.filter(
      (f) => f.isRequired && !answeredFieldIds.has(f.id),
    );
    if (missingRequired.length > 0) {
      const labels = missingRequired.map((f) => `"${f.label}"`).join(', ');
      throw new FormFieldInvalidException(
        `Missing required fields: ${labels}.`,
      );
    }
  }

  private validateAnswerValueType(
    answer: CreateFormFieldAnswerDto,
    field: ReturnFormField,
    index: number,
  ): void {
    if (answer.value === undefined || answer.value === null) return;

    switch (field.type) {
      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        if (typeof answer.value !== 'string') {
          throw new FormFieldInvalidException(
            `Answer at index ${index}: "${field.label}" expects text value only.`,
          );
        }
        break;
      case FieldType.NUMBER:
      case FieldType.RATING:
        if (typeof answer.value !== 'number') {
          throw new FormFieldInvalidException(
            `Answer at index ${index}: "${field.label}" expects number value only.`,
          );
        }
        break;
      case FieldType.DATE:
        if (typeof answer.value !== 'string') {
          throw new FormFieldInvalidException(
            `Answer at index ${index}: "${field.label}" expects date string value only.`,
          );
        }
        break;
      case FieldType.CHOICE:
      case FieldType.CHECKBOX:
        if (!Array.isArray(answer.value)) {
          throw new FormFieldInvalidException(
            `Answer at index ${index}: "${field.label}" expects array value only.`,
          );
        }
        break;
    }
  }

  private validateAnswerDateFormat(
    answer: CreateFormFieldAnswerDto,
    field: ReturnFormField,
    index: number,
  ): void {
    if (field.type !== FieldType.DATE) return;
    if (answer.value === undefined || answer.value === null) return;

    const date = new Date(answer.value as string);
    if (isNaN(date.getTime())) {
      throw new FormFieldInvalidException(
        `Answer at index ${index}: invalid date format for "${field.label}".`,
      );
    }
  }

  private validateAnswerOptions(
    answer: CreateFormFieldAnswerDto,
    field: ReturnFormField,
    index: number,
  ): void {
    if (field.type !== FieldType.CHOICE && field.type !== FieldType.CHECKBOX)
      return;

    if (!Array.isArray(answer.value) || answer.value.length === 0) return;

    const invalidOptions = (answer.value as string[]).filter(
      (v) => !field.options.includes(v),
    );
    if (invalidOptions.length > 0) {
      throw new FormFieldInvalidException(
        `Answer at index ${index}: "${field.label}" contains invalid options: ${invalidOptions.map((o) => `"${o}"`).join(', ')}.`,
      );
    }
  }

  private validateRequiredFieldHasAnswer(
    answer: CreateFormFieldAnswerDto,
    field: ReturnFormField,
    index: number,
  ): void {
    if (!field.isRequired) return;

    const hasValue =
      (typeof answer.value === 'string' && answer.value.trim().length > 0) ||
      typeof answer.value === 'number' ||
      (Array.isArray(answer.value) && answer.value.length > 0);

    if (!hasValue) {
      throw new FormFieldInvalidException(
        `Answer at index ${index}: "${field.label}" is required.`,
      );
    }
  }
}