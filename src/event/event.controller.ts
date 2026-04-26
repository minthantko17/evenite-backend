import { Controller, Post, Body, UploadedFile, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Event } from '@prisma/client';
import { EventService } from './event.service';
import { GenerateFromPromptDto } from './dto/generate-from-prompt.dto';
import type { GeneratedEventDto } from './dto/generated-event.dto';
import type { TranslateBilingualFieldsDto } from './dto/translate-bilingual-fields.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { PublishEventDto } from './dto/publish-event.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('generate/prompt')
  async generateFromPrompt(
    @Body() dto: GenerateFromPromptDto,
  ): Promise<GeneratedEventDto> {
    return this.eventService.generateEventFromPrompt(dto.prompt);
  }

  @Post('generate/image')
  @UseInterceptors(FileInterceptor('image'))
  async generateFromImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<GeneratedEventDto> {
    return this.eventService.generateEventFromImage(file);
  }

  @Post('banner')
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBannerToStorage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ bannerUrl: string }> {
    const bannerUrl = await this.eventService.uploadBannerToStorage(file);
    return { bannerUrl };
  }

  @Post('translate')
  async translateFields(
    @Body() dto: TranslateBilingualFieldsDto,
  ): Promise<TranslateBilingualFieldsDto> {
    return this.eventService.translateEventFields(dto);
  }

  @Post('save-draft')
  @HttpCode(HttpStatus.CREATED)
  async saveAsDraft(@Body() dto: SaveDraftDto): Promise<Event> {
    return this.eventService.saveEventAsDraft(dto);
  }

  @Post('publish')
  @HttpCode(HttpStatus.CREATED)
  async publish(@Body() dto: PublishEventDto): Promise<Event> {
    return this.eventService.publishEvent(dto);
  }
}