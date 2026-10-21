import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { AnalyticsCrudService } from './services/analytics-crud.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule, EventModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsCrudService, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
