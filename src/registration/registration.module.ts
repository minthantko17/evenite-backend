import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RegistrationValidationService } from './services/registration-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [RegistrationValidationService],
  exports: [],
})
export class RegistrationModule {}
