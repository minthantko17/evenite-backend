import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../event/event.module';
import { AttendanceValidationService } from './services/attendance-validation.service';
import { AttendanceCrudService } from './services/attendance-crud.service';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [PrismaModule, EventModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceValidationService,
    AttendanceCrudService,
    AttendanceService,
  ],
  exports: [AttendanceService, AttendanceCrudService],
})
export class AttendanceModule {}
