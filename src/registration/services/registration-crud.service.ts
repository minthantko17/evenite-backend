import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EventStatus,
  FieldType,
  RegistrationStatus,
  TicketStatus,
  Prisma,
  FormResponse,
  EventRegistration,
  Ticket
} from '@prisma/client';
import { ALLOWED_AUTOFILL_KEYS } from '../../form/constants/form.constants';
import { ReturnFormField } from '../../form/dto/return-form-with-fields.dto';
import { ReturnFormWithFields } from '../../form/dto/return-form-with-fields.dto';
import { CreateFormFieldAnswerDto } from '../../form/dto/create-form-response.dto';
import { SaveRegistrationException } from '../exceptions/save-registration.exception';
import { RegistrationNotFoundException } from '../exceptions/registration-not-found.exception';
import { EventFullException } from '../exceptions/event-full.exception';
import {
  ParticipantSnapshotDto,
  ReturnRegistrantDto,
} from '../dto/return-registrant.dto';
import {
  ReturnRegisteredEventDto,
  ReturnRegisteredEventInfoDto,
  ReturnRegisteredEventOrganizerDto,
} from '../dto/return-registered-event.dto';
import {
  ReturnParticipantTicketListDto,
  ReturnParticipantTicketListEventDto,
} from '../dto/return-participant-ticket-list.dto';
import {
  ReturnTicketDetailDto,
  ReturnTicketDetailEventDto,
  ReturnTicketDetailOrganizerDto,
  ReturnTicketDetailRegistrationDto,
} from '../dto/return-ticket-detail.dto';
import { BilingualField } from '../../event/dto/bilingual-field.dto';
import { EventNotFoundException } from '../../event/exceptions/event-not-found.exception';

// snapshot keys — identity-relevant autoFillKey fields only
// contact fields (email, phone, lineId) intentionally excluded
const PARTICIPANT_SNAPSHOT_KEYS = [
  'firstName',
  'lastName',
  'nickname',
  'studentId',
  'major',
] as const satisfies readonly (typeof ALLOWED_AUTOFILL_KEYS)[number][];

type ParticipantSnapshotKey = (typeof PARTICIPANT_SNAPSHOT_KEYS)[number];

@Injectable()
export class RegistrationCrudService {
  private readonly logger = new Logger(RegistrationCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  // creates EventRegistration + FormResponse + Ticket with transaction
  async createRegistrationWithTicket(
    eventId: string,
    participantProfileId: string,
    form: ReturnFormWithFields,
    answers: CreateFormFieldAnswerDto[],
    seatLimit: number | null,
  ): Promise<ReturnTicketDetailDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // seat check and update first to prevent race condition
        await this.claimSeat(eventId, seatLimit, tx);

        // create EventRegistration
        const registration = await this.createRegistration(
          eventId,
          participantProfileId,
          tx,
        );

        // create FormResponse + FormFieldResponse
        await this.createFormResponse(
          form.id,
          registration.id,
          answers,
          form.fields,
          tx,
        );

        // build participant snapshot for ticket
        const snapshot = await this.extractIdentitySnapshot(
          form.fields,
          answers,
          participantProfileId,
        );

        // create Ticket module
        const ticket = await this.createTicket(registration.id, snapshot, tx);

        // fetch event and organizer data for ticket
        const event = await tx.event.findUnique({
          where: { id: eventId },
          include: {
            organizer: { select: { name: true, imageUrl: true } },
          },
        });
        if (!event) {
          throw new EventNotFoundException();
        }

        return this.mapToReturnTicketDetailDto(registration, ticket, event);
      });
    } catch (error) {
      if (error instanceof EventNotFoundException) throw error;
      if (error instanceof EventFullException) throw error;
      this.logger.error('Failed to create registration', error);
      throw new SaveRegistrationException();
    }
  }

  async cancelRegistration(
    registrationId: string,
    eventId: string,
  ): Promise<ReturnTicketDetailDto> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          organizer: { select: { name: true, imageUrl: true } },
        },
      });
      if (!event) {
        throw new EventNotFoundException();
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const registration = await this.updateRegistrationStatus(
          registrationId,
          RegistrationStatus.CANCELLED,
          tx,
        );
        const ticket = await this.updateTicketStatus(
          registrationId,
          TicketStatus.CANCELLED,
          tx,
        );
        await this.decrementSeatsTaken(eventId, tx);
        return { registration, ticket };
      });

      return this.mapToReturnTicketDetailDto(
        result.registration,
        result.ticket,
        event,
      );
    } catch (error) {
      if (error instanceof EventNotFoundException) throw error;
      this.logger.error('Failed to cancel registration', error);
      throw new SaveRegistrationException();
    }
  }

  // looks up registration by composite key — used by cancel flow + validation
  async findRegistrationByParticipantAndEvent(
    eventId: string,
    participantProfileId: string,
  ): Promise<{ id: string; status: RegistrationStatus } | null> {
    return this.prisma.eventRegistration.findUnique({
      where: {
        participantId_eventId: {
          participantId: participantProfileId,
          eventId,
        },
      },
      select: { id: true, status: true },
    });
  }

  // list all registrants for event (for organizer )
  async getRegistrationsByEvent(
    eventId: string,
  ): Promise<ReturnRegistrantDto[]> {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        ticket: {
          select: {
            status: true,
            issuedAt: true,
            participantSnapshot: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return registrations.map((reg) => this.mapToReturnRegistrantDto(reg));
  }

  // just brief info to use in My Events list
  async getRegistrationsByParticipant(
    participantProfileId: string,
    eventStatus?: EventStatus,
  ): Promise<ReturnRegisteredEventDto[]> {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        participantId: participantProfileId,
        ...(eventStatus && { event: { status: eventStatus } }),
      },
      include: {
        event: {
          include: {
            organizer: { select: { name: true, imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return registrations.map((reg) =>
      this.mapToReturnRegisteredEventListDto(reg),
    );
  }

  // brief info for ticket list
  async getTicketsByParticipant(
    participantProfileId: string,
    ticketStatus?: TicketStatus,
  ): Promise<ReturnParticipantTicketListDto[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        ...(ticketStatus && { status: ticketStatus }),
        eventRegistration: {
          participantId: participantProfileId,
        },
      },
      include: {
        eventRegistration: {
          select: {
            status: true,
            event: {
              select: {
                id: true,
                title: true,
                bannerUrl: true,
                startAt: true,
                endAt: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return tickets.map((ticket) =>
      this.mapToReturnParticipantTicketListDto(ticket),
    );
  }

  // ticket detail call from event page
  async getTicketByEventAndParticipant(
    eventId: string,
    participantProfileId: string,
  ): Promise<ReturnTicketDetailDto> {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        participantId_eventId: {
          participantId: participantProfileId,
          eventId,
        },
      },
      include: {
        ticket: true,
        event: {
          include: {
            organizer: { select: { name: true, imageUrl: true } },
          },
        },
      },
    });

    if (!registration || !registration.ticket) {
      throw new RegistrationNotFoundException();
    }

    return this.mapToReturnTicketDetailDto(
      registration,
      registration.ticket,
      registration.event,
    );
  }

  // ticket detail call from My Tickets list
  async getTicketById(
    ticketId: string,
    participantProfileId: string,
  ): Promise<ReturnTicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        eventRegistration: {
          include: {
            event: {
              include: {
                organizer: { select: { name: true, imageUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!ticket) throw new RegistrationNotFoundException();

    // intentionally vague — don't reveal ticket existence to wrong participant
    if (ticket.eventRegistration.participantId !== participantProfileId) {
      throw new RegistrationNotFoundException();
    }

    return this.mapToReturnTicketDetailDto(
      ticket.eventRegistration,
      ticket,
      ticket.eventRegistration.event,
    );
  }

  // ---------- Private Transaction Steps ----------

  // Claim seat for race condition — check and increment are one atomic operation, concurrent requests can't both succeed
  private async claimSeat(
    eventId: string,
    seatLimit: number | null,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; seatsTaken: number }> {
    if (seatLimit === null) {
      const result = await tx.$queryRaw<{ id: string; seatsTaken: number }[]>`
        UPDATE "Event"
        SET "seatsTaken" = "seatsTaken" + 1
        WHERE id = ${eventId}
        RETURNING id, "seatsTaken"
      `;
      return result[0];
    }

    const result = await tx.$queryRaw<{ id: string; seatsTaken: number }[]>`
      UPDATE "Event"
      SET "seatsTaken" = "seatsTaken" + 1
      WHERE id = ${eventId}
        AND "seatsTaken" < "seatLimit"
      RETURNING id, "seatsTaken"
    `;
    // seat is full when affected row result === 0
    if (result.length === 0) {
      throw new EventFullException();
    }

    return result[0];
  }

  private async createRegistration(
    eventId: string,
    participantProfileId: string,
    tx: Prisma.TransactionClient,
  ): Promise<EventRegistration> {
    return tx.eventRegistration.create({
      data: {
        eventId,
        participantId: participantProfileId,
        status: RegistrationStatus.CONFIRMED,
      },
    });
  }

  private async createFormResponse(
    formId: string,
    eventRegistrationId: string,
    answers: CreateFormFieldAnswerDto[],
    fields: ReturnFormField[],
    tx: Prisma.TransactionClient,
  ): Promise<FormResponse> {
    const fieldTypeMap = new Map(fields.map((f) => [f.id, f.type]));

    const result = await tx.formResponse.create({
      data: {
        formId,
        eventRegistrationId,
        fieldResponses: {
          create: answers.map((answer) => ({
            formFieldId: answer.formFieldId,
            formId,
            ...this.mapAnswerValueToColumns(
              answer.value,
              fieldTypeMap.get(answer.formFieldId)!,
            ),
          })),
        },
      },
    });
    return result;
  }

  private async createTicket(
    eventRegistrationId: string,
    snapshot: ParticipantSnapshotDto,
    tx: Prisma.TransactionClient,
  ): Promise<Ticket> {
    const qrToken = crypto.randomUUID();

    return tx.ticket.create({
      data: {
        eventRegistrationId,
        qrToken,
        status: TicketStatus.ACTIVE,
        participantSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async updateRegistrationStatus(
    registrationId: string,
    status: RegistrationStatus,
    tx: Prisma.TransactionClient,
  ): Promise<EventRegistration> {
    const result = await tx.eventRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
    return result;
  }

  private async updateTicketStatus(
    registrationId: string,
    status: TicketStatus,
    tx: Prisma.TransactionClient,
  ): Promise<Ticket> {
    const result = await tx.ticket.update({
      where: { eventRegistrationId: registrationId },
      data: { status },
    });
    return result;
  }

  private async decrementSeatsTaken(
    eventId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; seatsTaken: number }> {
    const result = await tx.$queryRaw<{ id: string; seatsTaken: number }[]>`
      UPDATE "Event"
      SET "seatsTaken" = GREATEST("seatsTaken" - 1, 0)
      WHERE id = ${eventId}
      RETURNING id, "seatsTaken"
    `;
    return result[0];
  }

  // ---------- Private Helpers ----------

  // to display participant snapshot on ticket
  private async extractIdentitySnapshot(
    fields: ReturnFormField[],
    answers: CreateFormFieldAnswerDto[],
    participantProfileId: string,
  ): Promise<ParticipantSnapshotDto> {
    // retrieve participant snapshot from form answers
    const fieldByAutoFillKey = new Map(
      fields
        .filter(
          (f) =>
            f.autoFillKey &&
            PARTICIPANT_SNAPSHOT_KEYS.includes(
              f.autoFillKey as ParticipantSnapshotKey,
            ),
        )
        .map((f) => [f.autoFillKey as ParticipantSnapshotKey, f.id]),
    );
    const snapshotFromForm: Record<ParticipantSnapshotKey, string | null> = {
      firstName: null,
      lastName: null,
      nickname: null,
      studentId: null,
      major: null,
    };
    for (const key of PARTICIPANT_SNAPSHOT_KEYS) {
      const fieldId = fieldByAutoFillKey.get(key);
      const answer = fieldId
        ? answers.find((a) => a.formFieldId === fieldId)
        : undefined;
      snapshotFromForm[key] =
        typeof answer?.value === 'string' && answer.value.trim() !== ''
          ? answer.value
          : null;
    }

    // fallback for empty names. only fetch profile if a name field is missing
    const nameKeys: ParticipantSnapshotKey[] = [
      'firstName',
      'lastName',
      'nickname',
    ];
    const needsProfileFallback = nameKeys.some(
      (key) => snapshotFromForm[key] === null,
    );
    let participantNameFromProfile: {
      firstName: string;
      lastName: string | null;
      nickname: string | null;
    } | null = null;
    if (needsProfileFallback) {
      participantNameFromProfile =
        await this.prisma.participantProfile.findUnique({
          where: { id: participantProfileId },
          select: { firstName: true, lastName: true, nickname: true },
        });
    }

    return {
      firstName:
        snapshotFromForm.firstName ??
        participantNameFromProfile?.firstName ??
        null,
      lastName:
        snapshotFromForm.lastName ??
        participantNameFromProfile?.lastName ??
        null,
      nickname:
        snapshotFromForm.nickname ??
        participantNameFromProfile?.nickname ??
        null,
      studentId: snapshotFromForm.studentId,
      major: snapshotFromForm.major,
    };
  }

  // maps single answer value to the correct Prisma columns
  private mapAnswerValueToColumns(
    value: string | number | string[] | null | undefined,
    fieldType: FieldType,
  ) {
    if (value === undefined || value === null) {
      return {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      };
    }

    switch (fieldType) {
      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        return {
          valueText: value as string,
          valueNumber: null,
          valueDate: null,
          valueArray: [],
        };
      case FieldType.NUMBER:
      case FieldType.RATING:
        return {
          valueText: null,
          valueNumber: value as number,
          valueDate: null,
          valueArray: [],
        };
      case FieldType.DATE:
        return {
          valueText: null,
          valueNumber: null,
          valueDate: new Date(value as string),
          valueArray: [],
        };
      case FieldType.CHOICE:
      case FieldType.CHECKBOX:
        return {
          valueText: null,
          valueNumber: null,
          valueDate: null,
          valueArray: value as string[],
        };
      default:
        return {
          valueText: null,
          valueNumber: null,
          valueDate: null,
          valueArray: [],
        };
    }
  }

  // ---------- Private Mappers ----------

  private mapToReturnRegistrantDto(reg: any): ReturnRegistrantDto {
    const participantSnapshot = (reg.ticket
      ?.participantSnapshot as ParticipantSnapshotDto) ?? {
      firstName: null,
      lastName: null,
      nickname: null,
      studentId: null,
      major: null,
    };

    return {
      id: reg.id,
      status: reg.status,
      createdAt: reg.createdAt,
      ticketStatus: reg.ticket?.status ?? null,
      ticketIssuedAt: reg.ticket?.issuedAt ?? null,
      participantSnapshot: participantSnapshot,
    };
  }

  private mapToReturnRegisteredEventListDto(
    reg: any,
  ): ReturnRegisteredEventDto {
    const organizer: ReturnRegisteredEventOrganizerDto = {
      name: reg.event.organizer?.name ?? '',
      imageUrl: reg.event.organizer?.imageUrl ?? '',
    };

    const eventInfo: ReturnRegisteredEventInfoDto = {
      id: reg.event.id,
      title: reg.event.title as BilingualField,
      bannerUrl: reg.event.bannerUrl ?? '',
      startAt: reg.event.startAt ?? null,
      endAt: reg.event.endAt ?? null,
      location: reg.event.location as BilingualField,
      status: reg.event.status,
      organizer,
    };

    return {
      id: reg.id,
      status: reg.status,
      createdAt: reg.createdAt,
      event: eventInfo,
    };
  }

  private mapToReturnParticipantTicketListDto(
    ticket: any,
  ): ReturnParticipantTicketListDto {
    const event: ReturnParticipantTicketListEventDto = {
      id: ticket.eventRegistration.event.id,
      title: ticket.eventRegistration.event.title as BilingualField,
      bannerUrl: ticket.eventRegistration.event.bannerUrl ?? '',
      startAt: ticket.eventRegistration.event.startAt ?? null,
      endAt: ticket.eventRegistration.event.endAt ?? null,
      status: ticket.eventRegistration.event.status,
    };

    return {
      id: ticket.id,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      registrationStatus: ticket.eventRegistration.status,
      event,
    };
  }

  private mapToReturnTicketDetailDto(
    registration: any,
    ticket: any,
    event: any,
  ): ReturnTicketDetailDto {
    const participantSnapshot =
      ticket.participantSnapshot as ParticipantSnapshotDto;

    const organizer: ReturnTicketDetailOrganizerDto = {
      name: event.organizer?.name ?? '',
      imageUrl: event.organizer?.imageUrl ?? '',
    };

    const eventDetail: ReturnTicketDetailEventDto = {
      id: event.id,
      title: event.title as BilingualField,
      bannerUrl: event.bannerUrl ?? '',
      startAt: event.startAt ?? null,
      endAt: event.endAt ?? null,
      location: event.location as BilingualField,
      mapLink: event.mapLink ?? '',
      status: event.status,
      seatLimit: event.seatLimit ?? null,
      seatsTaken: event.seatsTaken ?? 0,
      organizer,
    };

    const registrationDetail: ReturnTicketDetailRegistrationDto = {
      id: registration.id,
      status: registration.status,
      createdAt: registration.createdAt,
    };

    return {
      id: ticket.id,
      qrToken: ticket.qrToken,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      participantSnapshot: participantSnapshot,
      registration: registrationDetail,
      event: eventDetail,
    };
  }
}
