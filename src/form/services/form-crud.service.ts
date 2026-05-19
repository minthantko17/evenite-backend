import { Injectable, Logger } from '@nestjs/common';
import { FormType, FieldType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFormDto } from '../dto/create-form.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';
import { SaveFormException } from '../exceptions/save-form.exception';
import { ReturnFormWithFields } from '../dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from '../dto/return-form-submissions.dto';
import { ReturnFormSummary } from '../dto/return-form-summary.dto';

@Injectable()
export class FormCrudService {
  private readonly logger = new Logger(FormCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createForm(
    eventId: string,
    dto: CreateFormDto,
  ): Promise<ReturnFormWithFields> {
    try {
      return (await this.prisma.form.create({
        data: {
          eventId,
          type: dto.type,
          title: dto.title ?? '',
          description: dto.description ?? '',
          fields: {
            create: dto.fields.map((field, index) => ({
              type: field.type,
              label: field.label,
              isRequired: field.isRequired ?? false,
              order: index,
              options: field.options ?? [],
              autoFillKey: field.autoFillKey ?? null,
            })),
          },
        },
        include: {
          fields: { orderBy: { order: 'asc' } },
        },
      })) as ReturnFormWithFields;
    } catch (error) {
      this.logger.error('Failed to create form', error);
      throw new SaveFormException();
    }
  }

  async getFormsByEventId(eventId: string): Promise<ReturnFormWithFields[]> {
    return (await this.prisma.form.findMany({
      where: { eventId },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    })) as ReturnFormWithFields[];
  }

  async getFormByEventAndType(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormWithFields> {
    const form = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });
    if (!form) throw new FormNotFoundException();
    return form as ReturnFormWithFields;
  }

  async updateForm(
    eventId: string,
    type: FormType,
    dto: UpdateFormDto,
  ): Promise<ReturnFormWithFields> {
    const form = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
    });
    if (!form) throw new FormNotFoundException();

    try {
      return await this.prisma.$transaction(async (tx) => {
        // update form title, description
        await tx.form.update({
          where: { id: form.id },
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && {
              description: dto.description,
            }),
          },
        });

        // replace-all form fields only if fields are provided
        // UUID are changed (just warning, but still fine by flow logic heehee)
        if (dto.fields) {
          await tx.formField.deleteMany({
            where: { formId: form.id },
          });

          await tx.formField.createMany({
            data: dto.fields.map((field, index) => ({
              formId: form.id,
              type: field.type,
              label: field.label,
              isRequired: field.isRequired ?? false,
              order: index,
              options: field.options ?? [],
              autoFillKey: field.autoFillKey ?? null,
            })),
          });
        }

        // return updated form with sorted fields
        return (await tx.form.findUnique({
          where: { id: form.id },
          include: {
            fields: { orderBy: { order: 'asc' } },
          },
        })) as ReturnFormWithFields;
      });
    } catch (error) {
      this.logger.error('Failed to update form', error);
      throw new SaveFormException();
    }
  }

  async updateFormById(
    formId: string,
    dto: UpdateFormDto,
  ): Promise<ReturnFormWithFields> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.form.update({
          where: { id: formId },
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && {
              description: dto.description,
            }),
          },
        });

        if (dto.fields) {
          await tx.formField.deleteMany({ where: { formId } });
          await tx.formField.createMany({
            data: dto.fields.map((field, index) => ({
              formId,
              type: field.type,
              label: field.label,
              isRequired: field.isRequired ?? false,
              order: index,
              options: field.options ?? [],
              autoFillKey: field.autoFillKey ?? null,
            })),
          });
        }

        return (await tx.form.findUnique({
          where: { id: formId },
          include: { fields: { orderBy: { order: 'asc' } } },
        })) as ReturnFormWithFields;
      });
    } catch (error) {
      this.logger.error('Failed to update form by id', error);
      throw new SaveFormException();
    }
  }

  async getFormResponses(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormSubmissions> {
    const form = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
      select: { id: true },
    });
    if (!form) throw new FormNotFoundException();

    const responses = await this.prisma.formResponse.findMany({
      where: { formId: form.id },
      include: {
        fieldResponses: {
          include: {
            formField: {
              select: { label: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      formId: form.id,
      totalResponses: responses.length,
      responses: responses.map((response) => ({
        id: response.id,
        createdAt: response.createdAt,
        answers: response.fieldResponses.map((answer) => ({
          formFieldId: answer.formFieldId,
          label: answer.formField.label,
          valueText: answer.valueText ?? null,
          valueNumber:
            answer.valueNumber !== null ? answer.valueNumber.toNumber() : null,
          valueDate: answer.valueDate ?? null,
          valueArray: answer.valueArray,
        })),
      })),
    } as ReturnFormSubmissions;
  }

  async getFormResponsesSummary(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormSummary> {
    const form = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });
    if (!form) throw new FormNotFoundException();

    const responses = await this.prisma.formResponse.findMany({
      where: { formId: form.id },
      include: {
        fieldResponses: true,
      },
    });

    // TODO: need to add submittedBy to each answer object when Feature 5 after registrationId is added to FormResponse
    // (this is using NxM iteration, maybe gotta optimize later if not bored :D)
    const summary = form.fields.map((field) => {
      const answers = responses.map((response) => {
        const fieldResponse = response.fieldResponses.find(
          (fr) => fr.formFieldId === field.id,
        );
        return {
          responseId: response.id,
          createdAt: response.createdAt,
          value: !fieldResponse
            ? this.getDefaultValue(field.type)
            : (fieldResponse.valueText ??
              (fieldResponse.valueNumber !== null
                ? fieldResponse.valueNumber.toNumber()
                : null) ??
              (fieldResponse.valueDate !== null
                ? fieldResponse.valueDate
                : null) ??
              (fieldResponse.valueArray.length > 0
                ? fieldResponse.valueArray
                : null) ??
              this.getDefaultValue(field.type)),
        };
      });
      return {
        formFieldId: field.id,
        label: field.label,
        type: field.type,
        answers,
      };
    });

    return {
      formId: form.id,
      totalResponses: responses.length,
      summary,
    } as ReturnFormSummary;
  }

  private getDefaultValue(type: FieldType): string | number | string[] | null {
    switch (type) {
      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        return '';
      case FieldType.NUMBER:
      case FieldType.RATING:
        return null; // 0 is also possible but, i think that could be misleading
      case FieldType.DATE:
        return null;
      case FieldType.CHOICE:
      case FieldType.CHECKBOX:
        return [];
      default:
        return null;
    }
  }
}
