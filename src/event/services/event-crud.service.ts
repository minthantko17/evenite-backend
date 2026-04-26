import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Event } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { PublishEventDto } from '../dto/publish-event.dto';

import { NotFoundException } from '@nestjs/common';
import { SaveEventException } from '../exceptions/save-event.exception';
import { PublishEventException } from '../exceptions/publish-event.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';

@Injectable()
export class EventCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStorageService: EventStorageService,
  ) {}

  async saveEventAsDraft(dto: SaveDraftDto): Promise<Event> {
    const bannerUrl = this.eventStorageService.resolveBannerUrl(dto.bannerUrl);

    try {
      return await this.prisma.event.create({
        data: {
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
          status: 'DRAFT',
        },
      });
    } catch {
      throw new SaveEventException();
    }
  }

  async publishEvent(dto: PublishEventDto): Promise<Event> {
    this.validatePublishDateRange(dto.startAt, dto.endAt);
    const bannerUrl = this.eventStorageService.resolveBannerUrl(dto.bannerUrl);
    const now = new Date();

    try {
      return await this.prisma.event.create({
        data: {
          title: this.toJson(dto.title),
          description: this.toJson(dto.description),
          category: dto.category,
          location: this.toJson(dto.location),
          mapLink: dto.mapLink,
          isOnline: dto.isOnline,
          startAt: dto.startAt,
          endAt: dto.endAt,
          seatLimit: dto.seatLimit,
          hasCatering: dto.hasCatering,
          isCateringFree: dto.isCateringFree,
          cateringDescription: this.toJson(dto.cateringDescription),
          agenda: this.toJson(dto.agenda),
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          contactLineId: dto.contactLineId,
          externalUrl: dto.externalUrl,
          remarks: this.toJson(dto.remarks),
          bannerUrl,
          status: 'PUBLISHED',
          publishedAt: now,
        },
      });
    } catch (error) {
      if (error instanceof InvalidDateRangeException) throw error;
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
}
