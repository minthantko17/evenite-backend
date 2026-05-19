import { Injectable, Logger } from '@nestjs/common';
import { Prisma, FormType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFormDto } from '../dto/create-form.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';
import { SaveFormException } from '../exceptions/save-form.exception';

@Injectable()
export class FormCrudService {
  private readonly logger = new Logger(FormCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createForm(eventId: string, dto: CreateFormDto) {
    try {
      return await this.prisma.form.create({
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
              options: field.options ?? Prisma.JsonNull,
              autoFillKey: field.autoFillKey ?? null,
            })),
          },
        },
        include: {
          fields: { orderBy: { order: 'asc' } },
        },
      });
    } catch (error) {
      this.logger.error('Failed to create form', error);
      throw new SaveFormException();
    }
  }

  async getFormsByEventId(eventId: string) {
    return await this.prisma.form.findMany({
      where: { eventId },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });
  }

  async getFormByEventAndType(eventId: string, type: FormType) {
    const form = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });
    if (!form) throw new FormNotFoundException();
    return form;
  }

  async updateForm(eventId: string, type: FormType, dto: UpdateFormDto) {
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
            title: dto.title ?? '',
            description: dto.description ?? '',
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
              options: field.options ?? Prisma.JsonNull,
              autoFillKey: field.autoFillKey ?? null,
            })),
          });
        }

        // return updated form with sorted fields
        return await tx.form.findUnique({
          where: { id: form.id },
          include: {
            fields: { orderBy: { order: 'asc' } },
          },
        });
      });
    } catch (error) {
      this.logger.error('Failed to update form', error);
      throw new SaveFormException();
    }
  }

  async getFormResponses(eventId: string, type: FormType) {
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
          valueNumber: answer.valueNumber ?? null,
          valueDate: answer.valueDate ?? null,
          valueJson: answer.valueJson ?? null,
        })),
      })),
    };
  }
}
