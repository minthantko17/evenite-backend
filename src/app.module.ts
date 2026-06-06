import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EventModule } from './event/event.module';
import { FormModule } from './form/form.module';
import { AuthModule } from './auth/auth.module';
import { UniversityModule } from './university/university.module';
import { UserModule } from './user/user.module';
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EventModule,
    FormModule,
    AuthModule,
    UniversityModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
