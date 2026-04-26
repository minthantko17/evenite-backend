import { Injectable } from '@nestjs/common';
import { Event } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';
import { EventStorageService } from './services/event-storage.service';
import { EventCrudService } from './services/event-crud.service';

import { GeneratedEventDto } from './dto/generated-event.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { PublishEventDto } from './dto/publish-event.dto';
import type { TranslateBilingualFieldsDto } from './dto/translate-bilingual-fields.dto';

@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
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
    return this.eventStorageService.uploadBannerToStorage(file);
  }

  async translateEventFields(
    dto: TranslateBilingualFieldsDto,
  ): Promise<TranslateBilingualFieldsDto> {
    return this.eventAiService.translateEventFields(dto);
  }

  async saveEventAsDraft(dto: SaveDraftDto): Promise<Event> {
    return this.eventCrudService.saveEventAsDraft(dto);
  }

  async publishEvent(dto: PublishEventDto): Promise<Event> {
    return this.eventCrudService.publishEvent(dto);
  }

  async getEventById(id: string): Promise<Event> {
    return this.eventCrudService.getEventById(id);
  }
}