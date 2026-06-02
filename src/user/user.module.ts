import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserCrudService } from './services/user-crud.service';
import { UserValidationService } from './services/user-validation.service';
import { UserStorageService } from './services/user-storage.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserCrudService,
    UserValidationService,
    UserStorageService,
  ],
  exports: [
    UserCrudService,
    UserValidationService,
  ],
})
export class UserModule {}
