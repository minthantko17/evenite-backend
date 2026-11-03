import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { GetAnalyticsQueryDto } from './dto/get-analytics-query.dto';
import { ReturnAnalyticsDto } from './dto/return-analytics.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';

@Controller('events/:eventId/analytics')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getEventAnalytics(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: GetAnalyticsQueryDto,
    @Req() req: Request,
  ): Promise<ReturnAnalyticsDto> {
    const user = req.user as JwtAccessPayload;
    return this.analyticsService.getEventAnalytics(
      eventId,
      user.organizerProfileId!,
      query.range,
    );
  }
}
