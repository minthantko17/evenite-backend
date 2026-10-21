import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { CheckInByQrDto } from './dto/check-in-by-qr.dto';
import { CheckInManualDto } from './dto/check-in-manual.dto';
import { ReturnAttendanceDto } from './dto/return-attendance.dto';
import {
  ReturnAttendanceListDto,
  ReturnAttendanceListItemDto,
} from './dto/return-attendance-list.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

@Controller('events/:eventId/attendance')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('qr')
  async checkInByQr(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CheckInByQrDto,
    @Req() req: Request,
  ): Promise<ReturnAttendanceDto> {
    const user = req.user as JwtAccessPayload;
    return this.attendanceService.checkInByQrToken(
      eventId,
      dto.qrToken,
      user.organizerProfileId!,
    );
  }

  @Post('manual')
  async checkInManually(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CheckInManualDto,
    @Req() req: Request,
  ): Promise<ReturnAttendanceDto> {
    const user = req.user as JwtAccessPayload;
    return this.attendanceService.checkInManually(
      eventId,
      dto.registrationId,
      user.organizerProfileId!,
    );
  }

  @Get()
  async getAttendanceList(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: Request,
  ): Promise<ReturnAttendanceListDto> {
    const user = req.user as JwtAccessPayload;
    return this.attendanceService.getAttendanceList(
      eventId,
      user.organizerProfileId!,
    );
  }

  @Delete(':attendanceId')
  async undoCheckIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('attendanceId', ParseUUIDPipe) attendanceId: string,
    @Req() req: Request,
  ): Promise<ReturnAttendanceListItemDto> {
    const user = req.user as JwtAccessPayload;
    return this.attendanceService.undoCheckIn(
      eventId,
      attendanceId,
      user.organizerProfileId!,
    );
  }
}
