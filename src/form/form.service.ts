import { Injectable } from '@nestjs/common';
import { FormType } from '@prisma/client';
import { FormValidationService } from './services/form-validation.service';
import { FormCrudService } from './services/form-crud.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReturnFormWithFields } from './dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from './dto/return-form-submissions.dto';
import { ReturnFormSummary } from './dto/return-form-summary.dto';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { ReturnFormSubmissionItem } from './dto/return-form-submissions.dto';

@Injectable()
export class FormService {
  constructor(
    private readonly formValidationService: FormValidationService,
    private readonly formCrudService: FormCrudService,
  ) {}

  async createForm(
    eventId: string,
    type: FormType,
    dto: CreateFormDto,
    organizerProfileId: string,
  ): Promise<ReturnFormWithFields> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    await this.formValidationService.validateFormTypeNotDuplicated(
      eventId,
      type,
    );
    this.formValidationService.validateFormFields(dto.fields);
    return this.formCrudService.createForm(eventId, type, dto);
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
    organizerProfileId: string,
  ): Promise<ReturnFormWithFields> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const form = await this.formCrudService.getFormByEventAndType(eventId,type);
    await this.formValidationService.validateFormNotLocked(form.id);
    await this.formValidationService.validateNoResponsesExist(form.id);
    if (dto.fields) {
      this.formValidationService.validateFormFields(dto.fields);
    }
    return this.formCrudService.updateFormByFormId(form.id, dto);
  }

  async getFormResponses(
    eventId: string,
    type: FormType,
    organizerProfileId: string,
  ): Promise<ReturnFormSubmissions> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    return this.formCrudService.getFormResponses(eventId, type);
  }

  async getFormResponsesSummary(
    eventId: string,
    type: FormType,
    organizerProfileId: string,
  ): Promise<ReturnFormSummary> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    return this.formCrudService.getFormResponsesSummary(eventId, type);
  }

  // TEMP: mock form submission
  async createFormResponse(
    eventId: string,
    type: FormType,
    dto: CreateFormResponseDto,
    participantProfileId: string | null,
  ): Promise<ReturnFormSubmissionItem> {
    await this.formValidationService.validateEventExists(eventId);
    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      type,
    );
    this.formValidationService.validateFormFieldAnswers(
      form.fields,
      dto.answers,
    );

    let eventRegistrationId: string | null = null;
    if (participantProfileId) {
      if (type === FormType.REGISTRATION) {
        // TODO: need to validate registration exists for participantId and eventid..well later
        // create new EventRegistration
        const registration = await this.formCrudService.createEventRegistration(
          eventId,
          participantProfileId,
        );
        eventRegistrationId = registration.id;
      } else if (type === FormType.FEEDBACK) {
        // find existing EventRegistration to link feedback
        const registration = await this.formCrudService.findEventRegistration(
          eventId,
          participantProfileId,
        );
        eventRegistrationId = registration?.id ?? null;
      }
    }
    
    return this.formCrudService.createFormResponse(
      form.id,
      dto,
      eventRegistrationId,
    );
  }

  // Temp: dev convenience only
  async deleteForm(
    eventId: string,
    type: FormType,
    organizerProfileId: string,
  ): Promise<void> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      type,
    );
    await this.formValidationService.validateFormNotLocked(form.id);
    await this.formValidationService.validateNoResponsesExist(form.id);
    await this.formCrudService.deleteForm(form.id);
  }

  // Temp: dev convenience only
  async deleteFormResponseById(
    eventId: string,
    type: FormType,
    responseId: string,
    organizerProfileId: string,
  ): Promise<void> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      type,
    );
    await this.formCrudService.deleteFormResponseById(responseId, form.id);
  }

  // Temp: dev convenience only
  async deleteAllFormResponses(
    eventId: string,
    type: FormType,
    organizerProfileId: string,
  ): Promise<{ deletedCount: number }> {
    await this.formValidationService.validateEventExists(eventId);
    await this.formValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      type,
    );
    return this.formCrudService.deleteAllFormResponses(form.id);
  }
}
