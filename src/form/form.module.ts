import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FormService } from './form.service';
import { FormController } from './form.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FormValidationService } from './services/form-validation.service';
import { FormCrudService } from './services/form-crud.service';
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventModule,
  ],
  controllers: [FormController],
  providers: [
    FormService,
    FormValidationService,
    FormCrudService,
  ],
})
export class FormModule {}