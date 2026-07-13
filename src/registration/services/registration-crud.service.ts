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
  Ticket,
  Event,
  OrganizerProfile,
} from '@prisma/client';
import { ALLOWED_AUTOFILL_KEYS } from '../../form/constants/form.constants';
import { ReturnFormField } from '../../form/dto/return-form-with-fields.dto';
import { CreateFormFieldAnswerDto } from '../../form/dto/create-form-response.dto';
import { RegistrationNotFoundException } from '../exceptions/registration-not-found.exception';
import { EventFullException } from '../exceptions/event-full.exception';
import {
  ParticipantSnapshotDto,
  ReturnRegistrantDto,
} from '../dto/return-registrant.dto';
import {
  ReturnRegisteredEventDto,
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
import { TicketNotFoundException } from '../exceptions/ticket-not-found.exception';

const PARTICIPANT_SNAPSHOT_KEYS = [
  'firstName',
  'lastName',
  'nickname',
  'studentId',
  'major',
] as const satisfies readonly (typeof ALLOWED_AUTOFILL_KEYS)[number][];

type ParticipantSnapshotKey = (typeof PARTICIPANT_SNAPSHOT_KEYS)[number];

type EventWithOrganizer = Event & {
  organizer: Pick<OrganizerProfile, 'name' | 'imageUrl'>;
};

@Injectable()
export class RegistrationCrudService {
  private readonly logger = new Logger(RegistrationCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  // returns tx if provided, falls back to prisma — allows methods to work inside or outside transaction
  private getClient(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

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

  async getRegisteredEvents(
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

    return registrations.map((reg) => this.mapToReturnRegisteredEventDto(reg));
  }

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

  async getTicketByEventIdAndParticipantId(
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

    if (!registration) {
      throw new RegistrationNotFoundException();
    }
    if (!registration.ticket) {
      throw new TicketNotFoundException();
    }

    return this.mapToReturnTicketDetailDto(
      registration,
      registration.ticket,
      registration.event,
    );
  }

  async getTicketById(ticketId: string): Promise<ReturnTicketDetailDto> {
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

    if (!ticket) throw new TicketNotFoundException();

    return this.mapToReturnTicketDetailDto(
      ticket.eventRegistration,
      ticket,
      ticket.eventRegistration.event,
    );
  }

  async countConfirmedRegistrations(eventId: string): Promise<number> {
    return this.prisma.eventRegistration.count({
      where: { eventId, status: RegistrationStatus.CONFIRMED },
    });
  }

  // fetches event with organizer for post-transaction response building
  async getEventWithOrganizer(
    eventId: string,
  ): Promise<EventWithOrganizer | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: { select: { name: true, imageUrl: true } },
      },
    }) as Promise<EventWithOrganizer | null>;
  }

  // NOTE: claimSeat is for race-safe seat claiming. Without tx call, race condition is possible.
  async claimSeat(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; seatsTaken: number }> {
    const client = this.getClient(tx);
    const result = await client.$queryRaw<{ id: string; seatsTaken: number }[]>`
      UPDATE "Event"
      SET "seatsTaken" = "seatsTaken" + 1
      WHERE id = ${eventId}
        AND ("seatLimit" IS NULL OR "seatsTaken" < "seatLimit")
      RETURNING id, "seatsTaken"
    `;

    if (result.length === 0) {
      const event = await client.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });
      if (!event) throw new EventNotFoundException();
      throw new EventFullException();
    }

    return result[0];
  }

  async findCancelledRegistration(
    eventId: string,
    participantProfileId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string } | null> {
    const registration = await this.getClient(tx).eventRegistration.findUnique({
      where: {
        participantId_eventId: {
          participantId: participantProfileId,
          eventId,
        },
      },
      select: { id: true, status: true },
    });

    if (registration?.status !== RegistrationStatus.CANCELLED) {
      return null;
    }
    return { id: registration.id };
  }

  async deleteExistingCancelledRegistration(
    registrationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ deletedRegistrationId: string }> {
    const client = this.getClient(tx);

    await client.formResponse.deleteMany({
      where: { eventRegistrationId: registrationId },
    });

    await client.ticket.deleteMany({
      where: { eventRegistrationId: registrationId },
    });

    await client.eventRegistration.delete({
      where: { id: registrationId },
    });

    return { deletedRegistrationId: registrationId };
  }

  async createRegistration(
    eventId: string,
    participantProfileId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<EventRegistration> {
    return this.getClient(tx).eventRegistration.create({
      data: {
        eventId,
        participantId: participantProfileId,
        status: RegistrationStatus.CONFIRMED,
      },
    });
  }

  async createFormResponse(
    formId: string,
    eventRegistrationId: string,
    answers: CreateFormFieldAnswerDto[],
    fields: ReturnFormField[],
    tx?: Prisma.TransactionClient,
  ): Promise<FormResponse> {
    const fieldTypeMap = new Map(fields.map((f) => [f.id, f.type]));

    const result = await this.getClient(tx).formResponse.create({
      data: {
        formId,
        eventRegistrationId,
        fieldResponses: {
          create: answers.map((answer) => ({
            formFieldId: answer.formFieldId,
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

  async createTicket(
    eventRegistrationId: string,
    snapshot: ParticipantSnapshotDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Ticket> {
    const qrToken = crypto.randomUUID();

    return this.getClient(tx).ticket.create({
      data: {
        eventRegistrationId,
        qrToken,
        status: TicketStatus.ACTIVE,
        participantSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updateRegistrationStatus(
    registrationId: string,
    status: RegistrationStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<EventRegistration> {
    const result = await this.getClient(tx).eventRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
    return result;
  }

  async updateTicketStatus(
    registrationId: string,
    status: TicketStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Ticket> {
    const client = this.getClient(tx);
    const ticket = await client.ticket.findUnique({
      where: { eventRegistrationId: registrationId },
    });

    if (!ticket) {
      throw new TicketNotFoundException();
    }

    const result = await client.ticket.update({
      where: { eventRegistrationId: registrationId },
      data: { status },
    });
    return result;
  }

  async decrementSeatsTaken(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; seatsTaken: number }> {
    const client = this.getClient(tx);
    const result = await client.$queryRaw<{ id: string; seatsTaken: number }[]>`
      UPDATE "Event"
      SET "seatsTaken" = GREATEST("seatsTaken" - 1, 0)
      WHERE id = ${eventId}
      RETURNING id, "seatsTaken"
    `;
    return result[0];
  }

  async extractIdentitySnapshot(
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

  private mapToReturnRegisteredEventDto(reg: any): ReturnRegisteredEventDto {
    const organizer: ReturnRegisteredEventOrganizerDto = {
      name: reg.event.organizer?.name ?? '',
      imageUrl: reg.event.organizer?.imageUrl ?? '',
    };

    return {
      id: reg.event.id,
      title: reg.event.title as BilingualField,
      bannerUrl: reg.event.bannerUrl ?? '',
      startAt: reg.event.startAt ?? null,
      endAt: reg.event.endAt ?? null,
      location: reg.event.location as BilingualField,
      status: reg.event.status,
      organizer,
      registration: {
        id: reg.id,
        status: reg.status,
        createdAt: reg.createdAt,
      },
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

  mapToReturnTicketDetailDto(
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
