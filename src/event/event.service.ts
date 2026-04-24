import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';
import { GeneratedEventDto } from './dto/generated-event.dto';
import { EventStorageService } from './services/event-storage.service';

@Injectable()
export class EventService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventValidationService: EventValidationService,
    private readonly eventAiService: EventAiService,
    private readonly eventStorageService: EventStorageService,
  ) {}

  async generateEventFromPrompt(prompt: string): Promise<GeneratedEventDto> {
    this.eventValidationService.validatePromptText(prompt);
    return this.eventAiService.generateEventFromPrompt(prompt);
  }

  async uploadBannerToStorage(file: Express.Multer.File): Promise<string> {
    return this.eventStorageService.uploadBannerToStorage(file);
  }
}