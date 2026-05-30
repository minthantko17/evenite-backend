import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UniversityService } from './university.service';

@Module({
  imports: [PrismaModule],
  providers: [UniversityService],
  exports: [UniversityService],
})
export class UniversityModule {}
