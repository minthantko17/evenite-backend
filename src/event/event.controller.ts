import { Controller, Post, Body } from '@nestjs/common';
import { EventService } from './event.service';
import { GenerateFromPromptDto } from './dto/generate-from-prompt.dto';
import type { GeneratedEventDto } from './dto/generated-event.dto';

@Controller('events')
export class EventController {
  constructor(
    private readonly eventService: EventService
) {}

  @Post('generate/prompt')
  async generateFromPrompt(
    @Body() dto: GenerateFromPromptDto,
  ): Promise<GeneratedEventDto> {
    return this.eventService.generateEventFromPrompt(dto.prompt);
  }
}