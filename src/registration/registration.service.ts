import { Injectable } from '@nestjs/common';
import { EventStatus, FormType, TicketStatus } from '@prisma/client';
import { RegistrationCrudService } from './services/registration-crud.service';
import { RegistrationValidationService } from './services/registration-validation.service';
import { EventValidationService } from '../event/services/event-validation.service';
import { FormCrudService } from '../form/services/form-crud.service';
import { FormValidationService } from '../form/services/form-validation.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ReturnTicketDetailDto } from './dto/return-ticket-detail.dto';
import { ReturnRegisteredEventDto } from './dto/return-registered-event.dto';
import { ReturnRegistrantDto } from './dto/return-registrant.dto';
import { ReturnParticipantTicketListDto } from './dto/return-participant-ticket-list.dto';
import { EventFullException } from './exceptions/event-full.exception';
import { RegistrationNotFoundException } from './exceptions/registration-not-found.exception';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly registrationCrudService: RegistrationCrudService,
    private readonly registrationValidationService: RegistrationValidationService,
    private readonly eventValidationService: EventValidationService,
    private readonly formCrudService: FormCrudService,
    private readonly formValidationService: FormValidationService,
  ) {}

  async registerAndGetTicket(
    eventId: string,
    participantProfileId: string,
    dto: CreateRegistrationDto,
  ): Promise<ReturnTicketDetailDto> {
    const event =
      await this.eventValidationService.validateEventExists(eventId);

    this.registrationValidationService.validateEventRegisterable(event.status);

    await this.registrationValidationService.validateNotAlreadyRegistered(
      eventId,
      participantProfileId,
    );

    const form = await this.formCrudService.getFormByEventAndType(
      eventId,
      FormType.REGISTRATION,
    );
    this.formValidationService.validateFormFieldAnswers(
      form.fields,
      dto.answers,
    );

    if (event.seatLimit !== null) {
      const confirmedRegistrationCount =
        await this.registrationCrudService.countConfirmedRegistrations(eventId);
      if (confirmedRegistrationCount >= event.seatLimit)
        throw new EventFullException();
    }

    // register and get ticket
    return this.registrationCrudService.createRegistrationWithTicket(
      eventId,
      participantProfileId,
      form,
      dto.answers,
      event.seatLimit,
    );
  }

  async cancelRegistration(
    eventId: string,
    participantProfileId: string,
  ): Promise<ReturnTicketDetailDto> {
    const event =
      await this.eventValidationService.validateEventExists(eventId);

    // find existing registration
    const registration =
      await this.registrationCrudService.findRegistrationByParticipantAndEvent(
        eventId,
        participantProfileId,
      );
    if (!registration) throw new RegistrationNotFoundException();

    // checks: registration status, event status, event startAt
    this.registrationValidationService.validateCancellable(registration, event);

    return this.registrationCrudService.cancelRegistration(
      registration.id,
      eventId,
    );
  }

  // organizer — list all registrants for event
  async getRegistrantsByEvent(
    eventId: string,
    organizerProfileId: string,
  ): Promise<ReturnRegistrantDto[]> {
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    return this.registrationCrudService.getRegistrationsByEvent(eventId);
  }

  async getRegisteredEvents(
    participantProfileId: string,
    eventStatus?: EventStatus,
  ): Promise<ReturnRegisteredEventDto[]> {
    return this.registrationCrudService.getRegisteredEvents(
      participantProfileId,
      eventStatus,
    );
  }

  async getTickets(
    participantProfileId: string,
    ticketStatus?: TicketStatus,
  ): Promise<ReturnParticipantTicketListDto[]> {
    return this.registrationCrudService.getTicketsByParticipant(
      participantProfileId,
      ticketStatus,
    );
  }

  // ticket detail call from event detail page
  async getTicketByEventIdAndParticipantId(
    eventId: string,
    participantProfileId: string,
  ): Promise<ReturnTicketDetailDto> {
    await this.eventValidationService.validateEventExists(eventId);
    return this.registrationCrudService.getTicketByEventIdAndParticipantId(
      eventId,
      participantProfileId,
    );
  }

  // ticket detail call from My Tickets list
  async getTicketById(
    ticketId: string,
    participantProfileId: string,
  ): Promise<ReturnTicketDetailDto> {
    await this.registrationValidationService.validateTicketOwnership(
      ticketId,
      participantProfileId,
    );
    return this.registrationCrudService.getTicketById(ticketId);
  }
}
