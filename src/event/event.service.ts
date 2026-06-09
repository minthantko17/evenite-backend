import { Injectable, ForbiddenException } from '@nestjs/common';
import { Event, EventStatus } from '@prisma/client';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';
import { EventStorageService } from './services/event-storage.service';
import { EventCrudService } from './services/event-crud.service';
import { GeneratedEventDto } from './dto/generated-event.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { PublishEventDto } from './dto/publish-event.dto';
import type { TranslateBilingualFieldsDto } from './dto/translate-bilingual-fields.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { EventNotFoundException } from './exceptions/event-not-found.exception';

@Injectable()
export class EventService {
  constructor(
    private readonly eventValidationService: EventValidationService,
    private readonly eventAiService: EventAiService,
    private readonly eventStorageService: EventStorageService,
    private readonly eventCrudService: EventCrudService,
  ) {}

  async generateEventFromPrompt(prompt: string): Promise<GeneratedEventDto> {
    this.eventValidationService.validatePromptText(prompt);
    return this.eventAiService.generateEventFromPrompt(prompt);
  }

  async generateEventFromImage(
    file: Express.Multer.File,
  ): Promise<GeneratedEventDto> {
    this.eventValidationService.validateImageFile(file);
    return this.eventAiService.generateEventFromImage(file);
  }

  async uploadBannerToStorage(file: Express.Multer.File): Promise<string> {
    this.eventValidationService.validateImageFile(file);
    return this.eventStorageService.uploadBannerToStorage(file);
  }

  async translateEventFields(
    dto: TranslateBilingualFieldsDto,
  ): Promise<TranslateBilingualFieldsDto> {
    return this.eventAiService.translateEventFields(dto);
  }

  async saveEventAsDraft(
    dto: SaveDraftDto,
    organizerProfileId: string,
    universityId: string,
  ): Promise<Event> {
    let oldBannerUrl: string | null = null;

    if (dto.id) {
      await this.eventValidationService.validateEventOwnership(
        dto.id,
        organizerProfileId,
      );
      oldBannerUrl = await this.eventCrudService.getBannerUrl(dto.id);
    }

    const savedEvent = await this.eventCrudService.saveEvent(
      dto,
      organizerProfileId,
      universityId,
      EventStatus.DRAFT,
      dto.id,
    );
    await this.eventStorageService.deleteOrphanBannerIfReplaced(
      oldBannerUrl,
      dto.bannerUrl,
    );

    return savedEvent;
  }

  async publishEvent(
    dto: PublishEventDto,
    organizerProfileId: string,
    universityId: string,
  ): Promise<Event> {
    this.eventValidationService.validatePublishDateRange(
      dto.startAt,
      dto.endAt,
    );
    let oldBannerUrl: string | null = null;

    if (dto.id) {
      await this.eventValidationService.validateEventOwnership(
        dto.id,
        organizerProfileId,
      );
      oldBannerUrl = await this.eventCrudService.getBannerUrl(dto.id);
    }

    const publishedEvent = await this.eventCrudService.saveEvent(
      dto,
      organizerProfileId,
      universityId,
      EventStatus.PUBLISHED,
      dto.id,
    );

    await this.eventStorageService.deleteOrphanBannerIfReplaced(
      oldBannerUrl,
      dto.bannerUrl,
    );

    return publishedEvent;
  }

  async updateEventStatus(
    eventId: string,
    newStatus: EventStatus,
    organizerProfileId: string,
  ): Promise<EventResponseDto> {
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const event = await this.eventCrudService.getEventById(eventId);

    this.eventValidationService.validateStatusTransition(
      event.status,
      newStatus,
    );

    return this.eventCrudService.updateEventStatus(eventId, newStatus);
  }

  async getPublicEvents(
    universityId: string,
    status?: EventStatus,
  ): Promise<EventResponseDto[]> {
    const visibleStatuses = [
      EventStatus.PUBLISHED,
      EventStatus.ONGOING,
      EventStatus.CONCLUDED,
    ] as EventStatus[];

    // to prevent participant from filtering by DRAFT etc.
    if (status && !visibleStatuses.includes(status)) {
      throw new ForbiddenException(
        'You are not allowed to filter by this status',
      );
    }

    return this.eventCrudService.getEvents(
      universityId,
      status ?? visibleStatuses,
    );
  }

  async getEventById(
    id: string,
    organizerProfileId: string | null,
  ): Promise<EventResponseDto> {
    const event = await this.eventCrudService.getEventById(id);

    // participants can't see DRAFT
    const visibleStatuses = [
      EventStatus.PUBLISHED,
      EventStatus.ONGOING,
      EventStatus.CONCLUDED,
    ] as EventStatus[];

    const isOwner = event.organizerId === organizerProfileId;
    const isVisible = visibleStatuses.includes(event.status);

    if (!isOwner && !isVisible) {
      throw new EventNotFoundException();
    }

    return event;
  }
}
