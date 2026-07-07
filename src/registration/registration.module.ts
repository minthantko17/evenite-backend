import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { FormModule } from '../form/form.module';
import { UserModule } from '../user/user.module';
import { RegistrationValidationService } from './services/registration-validation.service';
import { RegistrationCrudService } from './services/registration-crud.service';
import { RegistrationService } from './registration.service';

@Module({
  imports: [PrismaModule, EventModule, FormModule, UserModule],
  controllers: [],
  providers: [
    RegistrationValidationService,
    RegistrationCrudService,
    RegistrationService,
  ],
  exports: [RegistrationService],
})
export class RegistrationModule {}
