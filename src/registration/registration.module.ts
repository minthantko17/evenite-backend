import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RegistrationValidationService } from './services/registration-validation.service';
import { RegistrationCrudService } from './services/registration-crud.service';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [RegistrationValidationService, RegistrationCrudService],
  exports: [],
})
export class RegistrationModule {}
