import {Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe} from '@nestjs/common';
import { FormType } from '@prisma/client';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReturnFormWithFields } from './dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from './dto/return-form-submissions.dto';
import { ReturnFormSummary } from './dto/return-form-summary.dto';

@Controller('events/:eventId/forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  async createForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateFormDto,
  ): Promise<ReturnFormWithFields> {
    return await this.formService.createForm(eventId, dto);
  }

  @Get()
  async getFormsByEventId(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<ReturnFormWithFields[]> {
    return await this.formService.getFormsByEventId(eventId);
  }

  @Get(':type')
  async getFormByEventAndType(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type') type: FormType,
  ): Promise<ReturnFormWithFields> {
    return await this.formService.getFormByEventAndType(eventId, type);
  }

  @Patch(':type')
  async updateForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type') type: FormType,
    @Body() dto: UpdateFormDto,
  ): Promise<ReturnFormWithFields> {
    return await this.formService.updateForm(eventId, type, dto);
  }

  @Get(':type/responses')
  async getFormResponses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type') type: FormType,
  ): Promise<ReturnFormSubmissions> {
    return await this.formService.getFormResponses(eventId, type);
  }

  @Get(':type/responses/summary')
  async getFormResponsesSummary(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type') type: FormType,
  ): Promise<ReturnFormSummary> {
    return await this.formService.getFormResponsesSummary(eventId, type);
  }
}
