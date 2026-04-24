import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventService } from './event.service';
import { GenerateFromPromptDto } from './dto/generate-from-prompt.dto';
import type { GeneratedEventDto } from './dto/generated-event.dto';
import type { TranslateBilingualFieldsDto } from './dto/translate-bilingual-fields.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('generate/prompt')
  async generateFromPrompt(
    @Body() dto: GenerateFromPromptDto,
  ): Promise<GeneratedEventDto> {
    return this.eventService.generateEventFromPrompt(dto.prompt);
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
}