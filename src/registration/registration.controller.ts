import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { RegistrationService } from './registration.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ReturnTicketDetailDto } from './dto/return-ticket-detail.dto';
import { ReturnRegistrantDto } from './dto/return-registrant.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

@Controller()
@UseGuards(JwtAccessGuard, RolesGuard)
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('events/:eventId/registrations/me')
  @Roles(Role.PARTICIPANT)
  async registerAndGetTicket(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateRegistrationDto,
    @Req() req: Request,
  ): Promise<ReturnTicketDetailDto> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.registerAndGetTicket(
      eventId,
      user.participantProfileId!,
      dto,
    );
  }

  @Delete('events/:eventId/registrations/me')
  @Roles(Role.PARTICIPANT)
  async cancelRegistration(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: Request,
  ): Promise<ReturnTicketDetailDto> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.cancelRegistration(
      eventId,
      user.participantProfileId!,
    );
  }

  @Get('events/:eventId/registrations')
  @Roles(Role.ORGANIZER)
  async getRegistrantsByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: Request,
  ): Promise<ReturnRegistrantDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.getRegistrantsByEvent(
      eventId,
      user.organizerProfileId!,
    );
  }

  @Get('events/:eventId/registrations/me/ticket')
  @Roles(Role.PARTICIPANT)
  async getTicketByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: Request,
  ): Promise<ReturnTicketDetailDto> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.getTicketByEventIdAndParticipantId(
      eventId,
      user.participantProfileId!,
    );
  }
}
