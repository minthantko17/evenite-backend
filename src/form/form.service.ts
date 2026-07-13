import { Injectable, ForbiddenException } from '@nestjs/common';
import { FormType, EventStatus } from '@prisma/client';
import { FormValidationService } from './services/form-validation.service';
import { FormCrudService } from './services/form-crud.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReturnFormWithFields } from './dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from './dto/return-form-submissions.dto';
import { ReturnFormSummary } from './dto/return-form-summary.dto';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { ReturnFormSubmissionItem } from './dto/return-form-submissions.dto';
import { EventValidationService } from '../event/services/event-validation.service';

@Injectable()
export class FormService {
  constructor(
    private readonly formValidationService: FormValidationService,
    private readonly formCrudService: FormCrudService,
    private readonly eventValidationService: EventValidationService,
  ) {}

  async createForm(
    eventId: string,
    type: FormType,
    dto: CreateFormDto,
    organizerProfileId: string,
  ): Promise<ReturnFormWithFields> {
    await this.eventValidationService.validateEventOwnership(
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
    await this.eventValidationService.validateEventExists(eventId);
    return this.formCrudService.getFormsByEventId(eventId);
  }

  async getFormByEventAndType(
    eventId: string,
    type: FormType,
  ): Promise<ReturnFormWithFields> {
    await this.eventValidationService.validateEventExists(eventId);
    return this.formCrudService.getFormByEventAndType(eventId, type);
  }

  async updateForm(
    eventId: string,
    type: FormType,
    dto: UpdateFormDto,
    organizerProfileId: string,
  ): Promise<ReturnFormWithFields> {
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      type,
    );
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
    await this.eventValidationService.validateEventOwnership(
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
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    return this.formCrudService.getFormResponsesSummary(eventId, type);
  }

  async createFeedbackFormResponse(
    eventId: string,
    dto: CreateFormResponseDto,
    participantProfileId: string,
  ): Promise<ReturnFormSubmissionItem> {
    const event =
      await this.eventValidationService.validateEventExists(eventId);

    // feedback only allowed for ONGOING or CONCLUDED events
    const allowedStatuses: EventStatus[] = [
      EventStatus.ONGOING,
      EventStatus.CONCLUDED,
    ];
    if (!allowedStatuses.includes(event.status)) {
      throw new ForbiddenException(
        'Feedback can only be submitted for ongoing or concluded events.',
      );
    }

    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      FormType.FEEDBACK,
    );
    this.formValidationService.validateFormFieldAnswers(
      form.fields,
      dto.answers,
    );

    const registration =
      await this.formValidationService.validateParticipantIsRegistered(
        eventId,
        participantProfileId,
      );

    return this.formCrudService.createFormResponse(
      form.id,
      dto,
      registration.registrationId,
    );
  }

  // Temp: dev convenience only
  async deleteForm(
    eventId: string,
    type: FormType,
    organizerProfileId: string,
  ): Promise<void> {
    await this.eventValidationService.validateEventOwnership(
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
    await this.eventValidationService.validateEventOwnership(
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
    await this.eventValidationService.validateEventOwnership(
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
