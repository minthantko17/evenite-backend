import {Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe, ParseEnumPipe} from '@nestjs/common';
import { FormType } from '@prisma/client';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { ReturnFormWithFields } from './dto/return-form-with-fields.dto';
import { ReturnFormSubmissions } from './dto/return-form-submissions.dto';
import { ReturnFormSummary } from './dto/return-form-summary.dto';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { ReturnFormSubmissionItem } from './dto/return-form-submissions.dto';

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
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
  ): Promise<ReturnFormWithFields> {
    return await this.formService.getFormByEventAndType(eventId, type);
  }

  @Patch(':type')
  async updateForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Body() dto: UpdateFormDto,
  ): Promise<ReturnFormWithFields> {
    return await this.formService.updateForm(eventId, type, dto);
  }

  // TEMP: dev convenience only
  // Review before production — needs proper authorization
  @Delete(':type')
  async deleteForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
  ): Promise<{ message: string }> {
    await this.formService.deleteForm(eventId, type);
    return { message: 'Form deleted successfully.' };
  }

  @Get(':type/responses')
  async getFormResponses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
  ): Promise<ReturnFormSubmissions> {
    return await this.formService.getFormResponses(eventId, type);
  }

  @Get(':type/responses/summary')
  async getFormResponsesSummary(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
  ): Promise<ReturnFormSummary> {
    return await this.formService.getFormResponsesSummary(eventId, type);
  }

  // TEMP: mock form submission for dev/testing
  // Replace in Feature #5 with proper registration flow
  @Post(':type/responses')
  async createFormResponse(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Body() dto: CreateFormResponseDto,
  ): Promise<ReturnFormSubmissionItem> {
    return await this.formService.createFormResponse(eventId, type, dto);
  }

  // TEMP: dev convenience only
  @Delete(':type/responses/:responseId')
  async deleteFormResponseById(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
    @Param('responseId', ParseUUIDPipe) responseId: string,
  ): Promise<{ message: string }> {
    await this.formService.deleteFormResponseById(eventId, type, responseId);
    return { message: 'Form response deleted successfully.' };
  }

  // TEMP: dev convenience only
  @Delete(':type/responses')
  async deleteAllFormResponses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('type', new ParseEnumPipe(FormType)) type: FormType,
  ): Promise<{ message: string; deletedCount: number }> {
    const result = await this.formService.deleteAllFormResponses(eventId, type);
    return {
      message: 'All form responses deleted successfully.',
      deletedCount: result.deletedCount,
    };
  }
}
