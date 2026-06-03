import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  ParseEnumPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FormType, Role } from '@prisma/client';
import type { Request } from 'express';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReturnFormWithFields } from './dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from './dto/return-form-submissions.dto';
import { ReturnFormSummary } from './dto/return-form-summary.dto';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { ReturnFormSubmissionItem } from './dto/return-form-submissions.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

@Controller('events/:eventId/forms')
@UseGuards(JwtAccessGuard, RolesGuard)
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  @Roles(Role.ORGANIZER)
  async createForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateFormDto,
    @Req() req: Request,
  ): Promise<ReturnFormWithFields> {
    const user = req.user as JwtAccessPayload;
    return this.formService.createForm(eventId, dto, user.organizerProfileId!);
  }

  @Get()
  async getFormsByEventId(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<ReturnFormWithFields[]> {
    return this.formService.getFormsByEventId(eventId);
  }

  @Get(':type/responses/summary')
  @Roles(Role.ORGANIZER)
  async getFormResponsesSummary(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Req() req: Request,
  ): Promise<ReturnFormSummary> {
    const user = req.user as JwtAccessPayload;
    return this.formService.getFormResponsesSummary(
      eventId,
      type,
      user.organizerProfileId!,
    );
  }

  @Get(':type/responses')
  @Roles(Role.ORGANIZER)
  async getFormResponses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Req() req: Request,
  ): Promise<ReturnFormSubmissions> {
    const user = req.user as JwtAccessPayload;
    return this.formService.getFormResponses(
      eventId,
      type,
      user.organizerProfileId!,
    );
  }

  // TEMP: mock form submission
  @Post(':type/responses')
  async createFormResponse(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Body() dto: CreateFormResponseDto,
    @Req() req: Request,
  ): Promise<ReturnFormSubmissionItem> {
    const user = req.user as JwtAccessPayload;
    return this.formService.createFormResponse(
      eventId,
      type,
      dto,
      user.participantProfileId,  // ← ADD
    );
  }

  // TEMP: dev convenience only
  @Delete(':type/responses/:responseId')
  @Roles(Role.ORGANIZER)
  async deleteFormResponseById(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Param('responseId', ParseUUIDPipe) responseId: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const user = req.user as JwtAccessPayload;
    await this.formService.deleteFormResponseById(
      eventId,
      type,
      responseId,
      user.organizerProfileId!,
    );
    return { message: 'Form response deleted successfully.' };
  }

  // TEMP: dev convenience only
  @Delete(':type/responses')
  @Roles(Role.ORGANIZER)
  async deleteAllFormResponses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Req() req: Request,
  ): Promise<{ message: string; deletedCount: number }> {
    const user = req.user as JwtAccessPayload;
    const result = await this.formService.deleteAllFormResponses(
      eventId,
      type,
      user.organizerProfileId!,
    );
    return {
      message: 'All form responses deleted successfully.',
      deletedCount: result.deletedCount,
    };
  }

  @Get(':type')
  async getFormByEventAndType(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
  ): Promise<ReturnFormWithFields> {
    return this.formService.getFormByEventAndType(eventId, type);
  }

  @Patch(':type')
  @Roles(Role.ORGANIZER)
  async updateForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Body() dto: UpdateFormDto,
    @Req() req: Request,
  ): Promise<ReturnFormWithFields> {
    const user = req.user as JwtAccessPayload;
    return this.formService.updateForm(
      eventId,
      type,
      dto,
      user.organizerProfileId!,
    );
  }

  // TEMP: dev convenience only
  @Delete(':type')
  @Roles(Role.ORGANIZER)
  async deleteForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const user = req.user as JwtAccessPayload;
    await this.formService.deleteForm(eventId, type, user.organizerProfileId!);
    return { message: 'Form deleted successfully.' };
  }
}
