import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FormType } from '@prisma/client';
import { FieldType, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FormFieldInputDto } from '../dto/create-form.dto';
import { FormFieldInvalidException } from '../exceptions/form-field-invalid.exception';
import { FormLockedException } from '../exceptions/form-locked.exception';
import { FormAlreadyExistsException } from '../exceptions/form-already-exists.exception';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';
import { FormHasResponsesException } from '../exceptions/form-has-responses.exception';
import { CreateFormFieldAnswerDto } from '../dto/create-form-response.dto';

@Injectable()
export class FormValidationService {
  private readonly logger = new Logger(FormValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateEventExists(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found.');
    }
  }

  async validateFormTypeNotDuplicated(
    eventId: string,
    type: FormType,
  ): Promise<void> {
    const existing = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
    });
    if (existing) throw new FormAlreadyExistsException();
  }

  async validateFormNotLocked(formId: string): Promise<void> {
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
  }

  async validateNoResponsesExist(formId: string): Promise<void> {
    const count = await this.prisma.formResponse.count({
      where: { formId },
    });
    if (count > 0) {
      throw new FormLockedException();
    }
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
    });
  }

  // (me to my future self) following is related to method for dev purposes only
  async validateFormHasNoResponses(formId: string): Promise<void> {
    const count = await this.prisma.formResponse.count({
      where: { formId },
    });
    if (count > 0) {
      throw new FormHasResponsesException();
    }
  }

  validateFormFieldAnswers(
    fields: { id: string; type: FieldType; isRequired: boolean ; label: string }[],
    answers: CreateFormFieldAnswerDto[],
  ): void {
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    answers.forEach((answer, index) => {
      // check formFieldId belongs to this form
      const field = fieldMap.get(answer.formFieldId);
      if (!field) {
        throw new FormFieldInvalidException(
          `Answer at index ${index}: formFieldId does not belong to this form.`,
        );
      }

      // check data format
      if (answer.valueDate !== undefined && answer.valueDate !== null) {
        const date = new Date(answer.valueDate);
        if (isNaN(date.getTime())) {
          throw new FormFieldInvalidException(
            `Answer at index ${index}: invalid date format for "${field.label}".`,
          );
        }
      }

      // check value only if field is required
      if (field.isRequired) {
        const hasValue =
          (answer.valueText !== undefined 
            && answer.valueText !== null && 
            answer.valueText.trim().length > 0) ||
          answer.valueNumber !== undefined ||
          answer.valueDate !== undefined ||
          (answer.valueArray !== undefined && answer.valueArray.length > 0);

        if (!hasValue) {
          throw new FormFieldInvalidException(
            `Answer at index ${index}: "${field.label}" is required.`,
          );
        }
      }
    });
  }
}