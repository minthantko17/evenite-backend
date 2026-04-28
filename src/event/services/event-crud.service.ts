import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Event, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
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
  ) {}

  async saveEventAsDraft(
    dto: SaveDraftDto, 
    eventId?: string
): Promise<Event> {
    const bannerUrl = this.eventStorageService.resolveBannerUrl(dto.bannerUrl);
    const eventData = {
      title: this.toJson(dto.title),
      description: this.toJson(dto.description),
      category: dto.category ?? [],
      location: this.toJson(dto.location),
      mapLink: dto.mapLink,
      isOnline: dto.isOnline ?? false,
      startAt: dto.startAt,
      endAt: dto.endAt,
      seatLimit: dto.seatLimit,
      hasCatering: dto.hasCatering ?? false,
      isCateringFree: dto.isCateringFree ?? false,
      cateringDescription: this.toJson(dto.cateringDescription),
      agenda: this.toJson(dto.agenda),
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      contactLineId: dto.contactLineId,
      externalUrl: dto.externalUrl,
      remarks: this.toJson(dto.remarks),
      bannerUrl,
      status: EventStatus.DRAFT,
    };
    try {
      if (eventId) {
        await this.handleBannerOrphanCleanup(eventId, bannerUrl);
        return await this.prisma.event.update({
          where: { id: eventId },
          data: eventData,
        });
      }
      return await this.prisma.event.create({
        data: eventData,
      });
    } catch(error) {
      if (error instanceof NotFoundException) throw error;
      throw new SaveEventException();
    }
  }

  async publishEvent(
    dto: PublishEventDto, 
    eventId?: string
  ): Promise<Event> {
    this.validatePublishDateRange(dto.startAt, dto.endAt);
    const bannerUrl = this.eventStorageService.resolveBannerUrl(dto.bannerUrl);
    const now = new Date();

    const eventData = {
      title: this.toJson(dto.title),
      description: this.toJson(dto.description),
      category: dto.category,
      location: this.toJson(dto.location),
      mapLink: dto.mapLink,
      isOnline: dto.isOnline ?? false,
      startAt: dto.startAt,
      endAt: dto.endAt,
      seatLimit: dto.seatLimit,
      hasCatering: dto.hasCatering ?? false,
      isCateringFree: dto.isCateringFree ?? false,
      cateringDescription: this.toJson(dto.cateringDescription),
      agenda: this.toJson(dto.agenda),
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      contactLineId: dto.contactLineId,
      externalUrl: dto.externalUrl,
      remarks: this.toJson(dto.remarks),
      bannerUrl,
      status: EventStatus.PUBLISHED,
      publishedAt: now,
    };

    try {
      if (eventId) {
        await this.handleBannerOrphanCleanup(eventId, bannerUrl);
        return await this.prisma.event.update({
          where: { id: eventId },
          data: eventData,
        });
      }
      return await this.prisma.event.create({ data: eventData });
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
  validatePublishDateRange(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new InvalidDateRangeException();
    }
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
