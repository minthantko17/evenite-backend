import { Injectable } from '@nestjs/common';
import { FormType } from '@prisma/client';
import { FormValidationService } from './services/form-validation.service';
import { FormCrudService } from './services/form-crud.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReturnFormWithFields } from './dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from './dto/return-form-submissions.dto';
import { ReturnFormSummary } from './dto/return-form-summary.dto';

@Injectable()
export class FormService {
  constructor(
    private readonly formValidationService: FormValidationService,
    private readonly formCrudService: FormCrudService,
  ) {}

  async createForm(
    eventId: string,
    dto: CreateFormDto,
  ): Promise<ReturnFormWithFields> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateFormTypeNotDuplicated(
      eventId,
      dto.type,
    );
    this.formValidationService.validateFormFields(dto.fields);

    return await this.formCrudService.createForm(eventId, dto);
  }

  async getFormsByEventId(eventId: string): Promise<ReturnFormWithFields[]> {
    await this.formValidationService.validateEventExists(eventId);
    return await this.formCrudService.getFormsByEventId(eventId);
  }

  async getFormByEventAndType(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormWithFields> {
    await this.formValidationService.validateEventExists(eventId);
    return await this.formCrudService.getFormByEventAndType(eventId, type);
  }

  async updateForm(
    eventId: string,
    type: FormType,
    dto: UpdateFormDto,
  ): Promise<ReturnFormWithFields> {
    await this.formValidationService.validateEventExists(eventId);
    const form = await this.formCrudService.getFormByEventAndType(eventId,type);
    await this.formValidationService.validateFormNotLocked(form.id);
    await this.formValidationService.validateNoResponsesExist(form.id);
    if (dto.fields) {
      this.formValidationService.validateFormFields(dto.fields);
    }
    
    return await this.formCrudService.updateFormById(form.id, dto);
  }

  async getFormResponses(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormSubmissions> {
    await this.formValidationService.validateEventExists(eventId);
    return await this.formCrudService.getFormResponses(eventId, type);
  }

  async getFormResponsesSummary(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormSummary> {
    await this.formValidationService.validateEventExists(eventId);
    return await this.formCrudService.getFormResponsesSummary(eventId, type);
  }
}
