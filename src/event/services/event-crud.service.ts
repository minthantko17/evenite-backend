import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Event, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { PublishEventDto } from '../dto/publish-event.dto';

import { SaveEventException } from '../exceptions/save-event.exception';
import { PublishEventException } from '../exceptions/publish-event.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';

@Injectable()
export class EventCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStorageService: EventStorageService,
    private readonly utils: EventDataUtils,
    private readonly eventValidationService: EventValidationService,
  ) {}

  async saveEventAsDraft(dto: SaveDraftDto, eventId?: string): Promise<Event> {
    const normalizedEventData = this.normalizeEventData(dto);
    const jsonEventData = {
      title: this.toJson(normalizedEventData.title),
      description: this.toJson(normalizedEventData.description),
      category: normalizedEventData.category,
      location: this.toJson(normalizedEventData.location),
      mapLink: normalizedEventData.mapLink,
      isOnline: normalizedEventData.isOnline,
      startAt: normalizedEventData.startAt,
      endAt: normalizedEventData.endAt,
      seatLimit: normalizedEventData.seatLimit,
      hasCatering: normalizedEventData.hasCatering,
      isCateringFree: normalizedEventData.isCateringFree,
      cateringDescription: this.toJson(normalizedEventData.cateringDescription),
      agenda: this.toJson(normalizedEventData.agenda),
      contactName: normalizedEventData.contactName,
      contactEmail: normalizedEventData.contactEmail,
      contactPhone: normalizedEventData.contactPhone,
      contactLineId: normalizedEventData.contactLineId,
      externalUrl: normalizedEventData.externalUrl,
      remarks: this.toJson(normalizedEventData.remarks),
      bannerUrl: normalizedEventData.bannerUrl,
      status: EventStatus.DRAFT,
    };
    try {
      if (eventId) {
        await this.handleBannerOrphanCleanup(eventId, jsonEventData.bannerUrl);
        return await this.prisma.event.update({
          where: { id: eventId },
          data: jsonEventData,
        });
      }
      return await this.prisma.event.create({
        data: jsonEventData,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new SaveEventException();
    }
  }

  async publishEvent(dto: PublishEventDto, eventId?: string): Promise<Event> {
    this.eventValidationService.validatePublishDateRange(dto.startAt, dto.endAt);
    const normalizedEventData = this.normalizeEventData(dto);
    const now = new Date();

    const jsonEventData = {
      title: this.toJson(normalizedEventData.title),
      description: this.toJson(normalizedEventData.description),
      category: normalizedEventData.category,
      location: this.toJson(normalizedEventData.location),
      mapLink: normalizedEventData.mapLink,
      isOnline: normalizedEventData.isOnline,
      startAt: normalizedEventData.startAt,
      endAt: normalizedEventData.endAt,
      seatLimit: normalizedEventData.seatLimit,
      hasCatering: normalizedEventData.hasCatering,
      isCateringFree: normalizedEventData.isCateringFree,
      cateringDescription: this.toJson(normalizedEventData.cateringDescription),
      agenda: this.toJson(normalizedEventData.agenda),
      contactName: normalizedEventData.contactName,
      contactEmail: normalizedEventData.contactEmail,
      contactPhone: normalizedEventData.contactPhone,
      contactLineId: normalizedEventData.contactLineId,
      externalUrl: normalizedEventData.externalUrl,
      remarks: this.toJson(normalizedEventData.remarks),
      bannerUrl: normalizedEventData.bannerUrl,
      status: EventStatus.PUBLISHED,
      publishedAt: now,
    };

    try {
      if (eventId) {
        await this.handleBannerOrphanCleanup(eventId, jsonEventData.bannerUrl);
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
      if (error instanceof NotFoundException) throw error;
      throw new PublishEventException();
    }
  }

  async getAllEvents(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEventById(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event not found.`);
    }

    return event;
  }

  // --- helper methods ---
  normalizeEventData(dto: SaveDraftDto | PublishEventDto) {
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

  private async handleBannerOrphanCleanup(
    eventId: string,
    newBannerUrl: string,
  ): Promise<void> {
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { bannerUrl: true },
    });

    if (!existing) throw new NotFoundException('Event not found.');

    const oldBannerUrl = existing.bannerUrl;

    if (
      oldBannerUrl &&
      oldBannerUrl !== newBannerUrl &&
      oldBannerUrl !== DEFAULT_BANNER_URL
    ) {
      await this.eventStorageService.deleteBannerFromStorage(oldBannerUrl);
    }
  }
}
