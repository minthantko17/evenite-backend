import {
  Controller,
  Get, Post, Body,
  Param, UploadedFile, UseInterceptors,
  ParseUUIDPipe, HttpCode, HttpStatus,
  Query, ParseEnumPipe,
  UseGuards, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Event, EventStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { EventService } from './event.service';
import { GenerateFromPromptDto } from './dto/generate-from-prompt.dto';
import type { GeneratedEventDto } from './dto/generated-event.dto';
import type { TranslateBilingualFieldsDto } from './dto/translate-bilingual-fields.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { PublishEventDto } from './dto/publish-event.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

@Controller('events')
@UseGuards(JwtAccessGuard, RolesGuard) // all endpoints require auth
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('generate/prompt')
  @Roles(Role.ORGANIZER)
  async generateFromPrompt(
    @Body() dto: GenerateFromPromptDto,
  ): Promise<GeneratedEventDto> {
    return this.eventService.generateEventFromPrompt(dto.prompt);
  }

  @Post('generate/image')
  @Roles(Role.ORGANIZER)
  @UseInterceptors(FileInterceptor('image'))
  async generateFromImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<GeneratedEventDto> {
    return this.eventService.generateEventFromImage(file);
  }

  @Post('banner')
  @Roles(Role.ORGANIZER)
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBannerToStorage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ bannerUrl: string }> {
    const bannerUrl = await this.eventService.uploadBannerToStorage(file);
    return { bannerUrl };
  }

  @Post('translate')
  @Roles(Role.ORGANIZER)
  async translateFields(
    @Body() dto: TranslateBilingualFieldsDto,
  ): Promise<TranslateBilingualFieldsDto> {
    return this.eventService.translateEventFields(dto);
  }

  @Post('save-draft')
  @Roles(Role.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  async saveAsDraft(
    @Body() dto: SaveDraftDto,
    @Req() req: Request,
  ): Promise<Event> {
    const user = req.user as JwtAccessPayload;
    return this.eventService.saveEventAsDraft(
      dto,
      user.organizerProfileId!,
      user.universityId,
    );
  }

  @Post('publish')
  @Roles(Role.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  async publish(
    @Body() dto: PublishEventDto,
    @Req() req: Request,
  ): Promise<Event> {
    const user = req.user as JwtAccessPayload;
    return this.eventService.publishEvent(
      dto,
      user.organizerProfileId!,
      user.universityId,
    );
  }

  // to retrieve events for homepage (no DRAFT included)
  @Get()
  async getPublicEvents(
    @Req() req: Request,
    @Query('status', new ParseEnumPipe(EventStatus, { optional: true }))
    status?: EventStatus,
  ): Promise<EventResponseDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.eventService.getPublicEvents(
      user.universityId,
      status,
    );
  }

  @Get(':id')
  async getEventById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<EventResponseDto> {
    const user = req.user as JwtAccessPayload;
    const organizerProfileId =
      user.currentRole === Role.ORGANIZER ? user.organizerProfileId : null;
    return this.eventService.getEventById(id, organizerProfileId);
  }
}