import { Injectable, Logger } from '@nestjs/common';
import {
  EventStatus,
  FormType,
  EventRegistration,
  RegistrationStatus,
  Ticket,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
import { SaveRegistrationException } from './exceptions/save-registration.exception';
import { EventNotFoundException } from '../event/exceptions/event-not-found.exception';
import { TicketNotFoundException } from './exceptions/ticket-not-found.exception';
import { SaveFormResponseException } from '../form/exceptions/save-form-response.exception';
import { SaveTicketException } from './exceptions/save-ticket.exception';
import { DeleteRegistrationException } from './exceptions/delete-registration.exception';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registrationCrudService: RegistrationCrudService,
    private readonly registrationValidationService: RegistrationValidationService,
    private readonly eventValidationService: EventValidationService,
    private readonly formCrudService: FormCrudService,
    private readonly formValidationService: FormValidationService,
    private readonly eventEmitter: EventEmitter2,
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

    // get participant snapshot for ticket creation
    const participantSnapshot =
      await this.registrationCrudService.extractIdentitySnapshot(
        form.fields,
        dto.answers,
        participantProfileId,
      );

    let registration: EventRegistration;
    let ticket: Ticket;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // check and delete CANCELLED reg if exists (to allow re-reg)
        const cancelledReg =
          await this.registrationCrudService.findCancelledRegistration(
            eventId,
            participantProfileId,
            tx,
          );
        if (cancelledReg) {
          await this.registrationCrudService.deleteExistingCancelledRegistration(
            cancelledReg.id,
            tx,
          );
        }

        // seat check and update (in transaction) to prevent race condition
        await this.registrationCrudService.claimSeat(eventId, tx);

        const reg = await this.registrationCrudService.createRegistration(
          eventId,
          participantProfileId,
          tx,
        );

        // create FormResponse + FormFieldResponse
        await this.registrationCrudService.createFormResponse(
          form.id,
          reg.id,
          dto.answers,
          form.fields,
          tx,
        );

        const tkt = await this.registrationCrudService.createTicket(
          reg.id,
          participantSnapshot,
          tx,
        );

        return { registration: reg, ticket: tkt };
      });

      registration = result.registration;
      ticket = result.ticket;
    } catch (error) {
      if (error instanceof EventFullException) throw error;
      if (error instanceof EventNotFoundException) throw error;
      if (error instanceof SaveRegistrationException) throw error;
      if (error instanceof SaveFormResponseException) throw error;
      if (error instanceof SaveTicketException) throw error;
      if (error instanceof DeleteRegistrationException) throw error;
      this.logger.error('Failed to create registration', error);
      throw new SaveRegistrationException();
    }

    const eventDetail =
      await this.registrationCrudService.getEventWithOrganizer(eventId);

    return this.registrationCrudService.mapToReturnTicketDetailDto(
      registration,
      ticket,
      eventDetail,
    );
  }

  async cancelRegistration(
    eventId: string,
    participantProfileId: string,
  ): Promise<ReturnTicketDetailDto> {
    const event =
      await this.eventValidationService.validateEventExists(eventId);

    const registration =
      await this.registrationCrudService.findRegistrationByParticipantAndEvent(
        eventId,
        participantProfileId,
      );

    // checks: registration status, event status, event startAt
    this.registrationValidationService.validateCancellable(registration, event);

    let updatedRegistration: EventRegistration;
    let updatedTicket: Ticket;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const reg = await this.registrationCrudService.updateRegistrationStatus(
          registration.id,
          RegistrationStatus.CANCELLED,
          tx,
        );
        const tkt = await this.registrationCrudService.updateTicketStatus(
          registration.id,
          TicketStatus.CANCELLED,
          tx,
        );
        await this.registrationCrudService.decrementSeatsTaken(eventId, tx);
        return { registration: reg, ticket: tkt };
      });

      updatedRegistration = result.registration;
      updatedTicket = result.ticket;
    } catch (error) {
      if (error instanceof TicketNotFoundException) throw error;
      if (error instanceof SaveRegistrationException) throw error;
      if (error instanceof SaveTicketException) throw error;
      this.logger.error('Failed to cancel registration', error);
      throw new SaveRegistrationException();
    }

    // emit event for registration cancellation
    this.eventEmitter.emit('registration.cancelled', {
      eventId,
      participantProfileId,
    });

    const eventDetail =
      await this.registrationCrudService.getEventWithOrganizer(eventId);

    return this.registrationCrudService.mapToReturnTicketDetailDto(
      updatedRegistration,
      updatedTicket,
      eventDetail,
    );
  }

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
