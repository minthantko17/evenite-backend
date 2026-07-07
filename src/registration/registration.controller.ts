import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseEnumPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EventStatus, Role, TicketStatus } from '@prisma/client';
import type { Request } from 'express';
import { RegistrationService } from './registration.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ReturnTicketDetailDto } from './dto/return-ticket-detail.dto';
import { ReturnRegisteredEventDto } from './dto/return-registered-event.dto';
import { ReturnRegistrantDto } from './dto/return-registrant.dto';
import { ReturnParticipantTicketListDto } from './dto/return-participant-ticket-list.dto';
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

  @Get('users/me/registered-events')
  @Roles(Role.PARTICIPANT)
  async getRegisteredEvents(
    @Query('status', new ParseEnumPipe(EventStatus, { optional: true }))
    status: EventStatus | undefined,
    @Req() req: Request,
  ): Promise<ReturnRegisteredEventDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.getRegisteredEvents(
      user.participantProfileId!,
      status,
    );
  }

  @Get('users/me/tickets')
  @Roles(Role.PARTICIPANT)
  async getTickets(
    @Query('ticketStatus', new ParseEnumPipe(TicketStatus, { optional: true }))
    ticketStatus: TicketStatus | undefined,
    @Req() req: Request,
  ): Promise<ReturnParticipantTicketListDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.getTickets(
      user.participantProfileId!,
      ticketStatus,
    );
  }

  @Get('users/me/tickets/:ticketId')
  @Roles(Role.PARTICIPANT)
  async getTicketById(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Req() req: Request,
  ): Promise<ReturnTicketDetailDto> {
    const user = req.user as JwtAccessPayload;
    return this.registrationService.getTicketById(
      ticketId,
      user.participantProfileId!,
    );
  }
}
