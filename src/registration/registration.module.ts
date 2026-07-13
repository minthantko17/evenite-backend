import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { FormModule } from '../form/form.module';
import { RegistrationValidationService } from './services/registration-validation.service';
import { RegistrationCrudService } from './services/registration-crud.service';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';

@Module({
  imports: [PrismaModule, EventModule, FormModule],
  controllers: [RegistrationController],
  providers: [
    RegistrationValidationService,
    RegistrationCrudService,
    RegistrationService,
  ],
  exports: [
    RegistrationService,
    RegistrationValidationService,
    RegistrationCrudService,
  ],
})
export class RegistrationModule {}
