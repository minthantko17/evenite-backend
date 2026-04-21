import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventController],
  providers: [EventService, EventValidationService, EventAiService]
})
export class EventModule {}
