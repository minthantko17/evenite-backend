import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EventModule } from './event/event.module';
import { FormModule } from './form/form.module';

@Module({
  imports: [PrismaModule, EventModule, FormModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
