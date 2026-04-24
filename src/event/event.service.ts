import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';
import { GeneratedEventDto } from './dto/generated-event.dto';

@Injectable()
export class EventService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventValidationService: EventValidationService,
    private readonly eventAiService: EventAiService,
  ) {}

  async generateEventFromPrompt(prompt: string): Promise<GeneratedEventDto> {
    this.eventValidationService.validatePromptText(prompt);
    return this.eventAiService.generateEventFromPrompt(prompt);
  }
}