import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventValidationService } from './services/event-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventController],
  providers: [EventService, EventValidationService]
})
export class EventModule {}
