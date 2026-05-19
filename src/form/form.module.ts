import { Module } from '@nestjs/common';
import { FormService } from './form.service';
import { FormController } from './form.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FormValidationService } from './services/form-validation.service';
import { FormCrudService } from './services/form-crud.service';

@Module({
  imports: [PrismaModule],
  controllers: [FormController],
  providers: [
    FormService,
    FormValidationService,
    FormCrudService,
  ],
})
export class FormModule {}