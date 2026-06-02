import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { UniversityModule } from '../university/university.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthCrudService } from './services/auth-crud.service';
import { AuthValidationService } from './services/auth-validation.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthEmailService } from './services/auth-email.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    UniversityModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCrudService,
    AuthValidationService,
    AuthTokenService,
    AuthEmailService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    RolesGuard,
  ],
  exports: [
    AuthCrudService,
    AuthTokenService,
    JwtAccessStrategy,
    RolesGuard,
  ],
})
export class AuthModule {}
