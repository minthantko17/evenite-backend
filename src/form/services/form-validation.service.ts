import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FormType } from '@prisma/client';
import { FieldType, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FormFieldInputDto } from '../dto/create-form.dto';
import { FormFieldInvalidException } from '../exceptions/form-field-invalid.exception';
import { FormLockedException } from '../exceptions/form-locked.exception';
import { FormAlreadyExistsException } from '../exceptions/form-already-exists.exception';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';

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
    if (form.event.status === EventStatus.PUBLISHED) {
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
}