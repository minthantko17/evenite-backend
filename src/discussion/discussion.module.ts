import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { RegistrationModule } from '../registration/registration.module';
import { AuthModule } from '../auth/auth.module';
import { DiscussionController } from './discussion.controller';
import { DiscussionService } from './discussion.service';
import { DiscussionValidationService } from './services/discussion-validation.service';
import { DiscussionCrudService } from './services/discussion-crud.service';
import { DiscussionGateway } from './discussion.gateway';

@Module({
  imports: [PrismaModule, EventModule, RegistrationModule, AuthModule],
  controllers: [DiscussionController],
  providers: [
    DiscussionService,
    DiscussionValidationService,
    DiscussionCrudService,
    DiscussionGateway,
  ],
  exports: [DiscussionService],
})
export class DiscussionModule {}
