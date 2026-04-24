import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { memoryStorage } from 'multer';
import { EventController } from './event.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';
import { EventStorageService } from './services/event-storage.service';
import { MulterModule } from '@nestjs/platform-express';


@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [EventController],
  providers: [
    EventService,
    EventValidationService,
    EventAiService,
    EventStorageService,
  ],
})
export class EventModule {}
