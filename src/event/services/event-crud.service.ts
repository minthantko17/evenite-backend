import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma, Event, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { PublishEventDto } from '../dto/publish-event.dto';
import { EventResponseDto } from '../dto/event-response.dto';
import type { BilingualField } from '../dto/bilingual-field.dto';
import type { AgendaItem } from '../dto/agenda-item.dto';

import { SaveEventException } from '../exceptions/save-event.exception';
import { PublishEventException } from '../exceptions/publish-event.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';
import { EventNotFoundException } from '../exceptions/event-not-found.exception';

@Injectable()
export class EventCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStorageService: EventStorageService,
    private readonly utils: EventDataUtils,
    private readonly eventValidationService: EventValidationService,
  ) {}

  async saveEventAsDraft(
    dto: SaveDraftDto,
    organizerProfileId: string,
    universityId: string,
    eventId?: string,
  ): Promise<Event> {
    const sanitizedEventData = this.sanitizeEventData(dto);
    const jsonEventData = {
      organizerId: organizerProfileId,
      universityId: universityId,
      title: this.toJson(sanitizedEventData.title),
      description: this.toJson(sanitizedEventData.description),
      category: sanitizedEventData.category,
      location: this.toJson(sanitizedEventData.location),
      mapLink: sanitizedEventData.mapLink,
      isOnline: sanitizedEventData.isOnline,
      startAt: sanitizedEventData.startAt,
      endAt: sanitizedEventData.endAt,
      seatLimit: sanitizedEventData.seatLimit,
      hasCatering: sanitizedEventData.hasCatering,
      isCateringFree: sanitizedEventData.isCateringFree,
      cateringDescription: this.toJson(sanitizedEventData.cateringDescription),
      agenda: this.toJson(sanitizedEventData.agenda),
      contactName: sanitizedEventData.contactName,
      contactEmail: sanitizedEventData.contactEmail,
      contactPhone: sanitizedEventData.contactPhone,
      contactLineId: sanitizedEventData.contactLineId,
      externalUrl: sanitizedEventData.externalUrl,
      remarks: this.toJson(sanitizedEventData.remarks),
      bannerUrl: sanitizedEventData.bannerUrl,
      status: EventStatus.DRAFT,
    };
    try {
      if (eventId) {
        await this.validateEventOwnership(eventId, organizerProfileId);
        await this.deleteOrphanBannerIfReplaced(eventId, jsonEventData.bannerUrl);
        return await this.prisma.event.update({
          where: { id: eventId },
          data: jsonEventData,
        });
      }
      return await this.prisma.event.create({
        data: jsonEventData,
      });
    } catch (error) {
      if (error instanceof EventNotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
      throw new SaveEventException();
    }
  }

  async publishEvent(
    dto: PublishEventDto,
    organizerProfileId: string,
    universityId: string,
    eventId?: string,
  ): Promise<Event> {
    this.eventValidationService.validatePublishDateRange(dto.startAt, dto.endAt);
    const sanitizedEventData = this.sanitizeEventData(dto);
    const now = new Date();

    const jsonEventData = {
      organizerId: organizerProfileId,
      universityId: universityId,
      title: this.toJson(sanitizedEventData.title),
      description: this.toJson(sanitizedEventData.description),
      category: sanitizedEventData.category,
      location: this.toJson(sanitizedEventData.location),
      mapLink: sanitizedEventData.mapLink,
      isOnline: sanitizedEventData.isOnline,
      startAt: sanitizedEventData.startAt,
      endAt: sanitizedEventData.endAt,
      seatLimit: sanitizedEventData.seatLimit,
      hasCatering: sanitizedEventData.hasCatering,
      isCateringFree: sanitizedEventData.isCateringFree,
      cateringDescription: this.toJson(sanitizedEventData.cateringDescription),
      agenda: this.toJson(sanitizedEventData.agenda),
      contactName: sanitizedEventData.contactName,
      contactEmail: sanitizedEventData.contactEmail,
      contactPhone: sanitizedEventData.contactPhone,
      contactLineId: sanitizedEventData.contactLineId,
      externalUrl: sanitizedEventData.externalUrl,
      remarks: this.toJson(sanitizedEventData.remarks),
      bannerUrl: sanitizedEventData.bannerUrl,
      status: EventStatus.PUBLISHED,
      publishedAt: now,
    };

    try {
      if (eventId) {
        await this.validateEventOwnership(eventId, organizerProfileId);
        await this.deleteOrphanBannerIfReplaced(eventId, jsonEventData.bannerUrl);
        return await this.prisma.event.update({
          where: { id: eventId },
          data: jsonEventData,
        });
      }
      return await this.prisma.event.create({
        data: jsonEventData,
      });
    } catch (error) {
      if (error instanceof InvalidDateRangeException) throw error;
      if (error instanceof EventNotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
      throw new PublishEventException();
    }
  }

  async getEvents(
    universityId: string,
    status?: EventStatus | EventStatus[],
  ): Promise<EventResponseDto[]> {
    console.log('Getting events with status:', status);
    const events = await this.prisma.event.findMany({
      where: {
        universityId,
        ...(status 
          ? Array.isArray(status)
            ? { status: { in: status } }
            : { status }
          : {}
        ),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        forms: {
          select:{ id: true, type: true }
        }
      }
    });

    return events.map((event) => this.mapToEventResponseDto(event));
  }

  async getEventById(id: string): Promise<EventResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        forms: {
          select:{ id: true, type: true }
        }
      }
    });

    if (!event) {
      throw new EventNotFoundException();
    }

    return this.mapToEventResponseDto(event);
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
      cateringDescription: this.utils.sanitizeBilingualField(dto.cateringDescription),
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

  private async deleteOrphanBannerIfReplaced(
    eventId: string,
    newBannerUrl: string,
  ): Promise<void> {
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { bannerUrl: true },
    });

    if (!existing) throw new EventNotFoundException();

    const oldBannerUrl = existing.bannerUrl;

    if (
      oldBannerUrl &&
      oldBannerUrl !== newBannerUrl &&
      oldBannerUrl !== DEFAULT_BANNER_URL
    ) {
      await this.eventStorageService.deleteBannerFromStorage(oldBannerUrl);
    }
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

  private async validateEventOwnership(
    eventId: string,
    organizerProfileId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new EventNotFoundException();
    }

    if (event.organizerId !== organizerProfileId) {
      throw new ForbiddenException(
        'You do not have permission to edit this event.',
      );
    }
  }
}
