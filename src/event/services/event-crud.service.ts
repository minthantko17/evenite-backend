import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  Event,
  EventStatus,
  RegistrationStatus,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { PublishEventDto } from '../dto/publish-event.dto';
import { EventResponseDto } from '../dto/event-response.dto';
import type { BilingualField } from '../dto/bilingual-field.dto';
import type { AgendaItem } from '../dto/agenda-item.dto';

import { SaveEventException } from '../exceptions/save-event.exception';
import { EventNotFoundException } from '../exceptions/event-not-found.exception';
import { EventStatusChangeException } from '../exceptions/event-status-change.exception';

@Injectable()
export class EventCrudService {
  private readonly logger = new Logger(EventCrudService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStorageService: EventStorageService,
    private readonly utils: EventDataUtils,
  ) {}

  async saveEvent(
    dto: SaveDraftDto | PublishEventDto,
    organizerProfileId: string,
    universityId: string,
    status: EventStatus,
    eventId?: string,
  ): Promise<Event> {
    const sanitized = this.sanitizeEventData(dto);
    const publishedAt =
      status === EventStatus.PUBLISHED ? new Date() : undefined;

    const data = {
      organizerId: organizerProfileId,
      universityId,
      title: this.toJson(sanitized.title),
      description: this.toJson(sanitized.description),
      category: sanitized.category,
      location: this.toJson(sanitized.location),
      mapLink: sanitized.mapLink,
      isOnline: sanitized.isOnline,
      startAt: sanitized.startAt,
      endAt: sanitized.endAt,
      seatLimit: sanitized.seatLimit,
      hasCatering: sanitized.hasCatering,
      isCateringFree: sanitized.isCateringFree,
      cateringDescription: this.toJson(sanitized.cateringDescription),
      agenda: this.toJson(sanitized.agenda),
      contactName: sanitized.contactName,
      contactEmail: sanitized.contactEmail,
      contactPhone: sanitized.contactPhone,
      contactLineId: sanitized.contactLineId,
      externalUrl: sanitized.externalUrl,
      remarks: this.toJson(sanitized.remarks),
      bannerUrl: sanitized.bannerUrl,
      status,
      ...(publishedAt && { publishedAt }),
    };

    try {
      if (eventId) {
        return await this.prisma.event.update({
          where: { id: eventId },
          data,
        });
      }
      return await this.prisma.event.create({
        data: {
          ...data,
          discussionRoom: { create: {} },
        },
      });
    } catch {
      throw new SaveEventException();
    }
  }

  async getEvents(
    universityId: string,
    status?: EventStatus | EventStatus[],
  ): Promise<EventResponseDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        universityId,
        ...(status
          ? Array.isArray(status)
            ? { status: { in: status } }
            : { status }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        forms: { select: { id: true, type: true } },
      },
    });

    return events.map((event) => this.mapToEventResponseDto(event));
  }

  async getEventById(id: string): Promise<EventResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        forms: { select: { id: true, type: true } },
      },
    });

    if (!event) {
      throw new EventNotFoundException();
    }

    return this.mapToEventResponseDto(event);
  }

  async getEventsByOrganizerId(
    organizerProfileId: string,
    universityId: string,
    status?: EventStatus,
  ): Promise<EventResponseDto[]> {
    const events = await this.prisma.event.findMany({
      where: {
        organizerId: organizerProfileId,
        universityId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        forms: { select: { id: true, type: true } },
      },
    });
    return events.map((event) => this.mapToEventResponseDto(event));
  }

  async updateEventStatus(
    eventId: string,
    newStatus: EventStatus,
  ): Promise<EventResponseDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // if Cancelled, cancel all registrations and tickets
        if (newStatus === EventStatus.CANCELLED) {
          const registrationResult = await tx.eventRegistration.updateMany({
            where: {
              eventId,
              status: RegistrationStatus.CONFIRMED,
            },
            data: { status: RegistrationStatus.CANCELLED },
          });

          const ticketResult = await tx.ticket.updateMany({
            where: {
              status: TicketStatus.ACTIVE,
              eventRegistration: { eventId },
            },
            data: { status: TicketStatus.CANCELLED },
          });

          this.logger.log(
            `Cancelled ${registrationResult.count} registrations and ${ticketResult.count} tickets for event ${eventId}`,
          );
        }

        // update event status
        const updated = await tx.event.update({
          where: { id: eventId },
          data: { status: newStatus },
          include: {
            forms: { select: { id: true, type: true } },
          },
        });

        return this.mapToEventResponseDto(updated);
      });
    } catch (error) {
      this.logger.error('Failed to update event status', error);
      throw new EventStatusChangeException();
    }
  }

  async getBannerUrl(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { bannerUrl: true },
    });
    if (!event) throw new EventNotFoundException();
    return event.bannerUrl;
  }

  // --- helper methods ---

  sanitizeEventData(dto: SaveDraftDto | PublishEventDto) {
    return {
      title: this.utils.sanitizeBilingualField(dto.title),
      description: this.utils.sanitizeBilingualField(dto.description),
      category: dto.category ?? [],
      location: this.utils.sanitizeBilingualField(dto.location),
      mapLink: dto.mapLink ?? '',
      isOnline: dto.isOnline ?? false,
      startAt: dto.startAt,
      endAt: dto.endAt,
      seatLimit: dto.seatLimit,
      hasCatering: dto.hasCatering ?? false,
      isCateringFree: dto.isCateringFree ?? false,
      cateringDescription: this.utils.sanitizeBilingualField(
        dto.cateringDescription,
      ),
      agenda: this.utils.sanitizeAgendaItems(dto.agenda),
      contactName: dto.contactName ?? '',
      contactEmail: dto.contactEmail ?? '',
      contactPhone: dto.contactPhone ?? '',
      contactLineId: dto.contactLineId ?? '',
      externalUrl: dto.externalUrl ?? '',
      remarks: this.utils.sanitizeBilingualField(dto.remarks),
      bannerUrl: this.eventStorageService.resolveBannerUrl(dto.bannerUrl),
    };
  }

  private toJson(value: any): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return value as Prisma.InputJsonValue;
  }

  private mapToEventResponseDto(event: any): EventResponseDto {
    return {
      id: event.id,
      organizerId: event.organizerId,
      universityId: event.universityId,
      title: event.title as BilingualField,
      description: event.description as BilingualField,
      category: event.category ?? [],
      location: event.location as BilingualField,
      mapLink: event.mapLink ?? '',
      isOnline: event.isOnline ?? false,
      startAt: event.startAt ?? null,
      endAt: event.endAt ?? null,
      seatLimit: event.seatLimit ?? null,
      seatsTaken: event.seatsTaken ?? 0,
      hasCatering: event.hasCatering ?? false,
      isCateringFree: event.isCateringFree ?? false,
      cateringDescription: event.cateringDescription as BilingualField,
      agenda: (event.agenda as AgendaItem[]) ?? [],
      contactName: event.contactName ?? '',
      contactEmail: event.contactEmail ?? '',
      contactPhone: event.contactPhone ?? '',
      contactLineId: event.contactLineId ?? '',
      externalUrl: event.externalUrl ?? '',
      remarks: event.remarks as BilingualField,
      bannerUrl: event.bannerUrl ?? '',
      status: event.status,
      publishedAt: event.publishedAt ?? null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      forms:
        event.forms?.map((form: any) => ({
          id: form.id,
          type: form.type,
        })) ?? [],
    };
  }
}
