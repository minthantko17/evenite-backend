import {
  Controller,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { Request } from 'express';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register
  // Body: { email, password, firstName, lastName? }
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(dto);
  }

  // POST /auth/verify-email?token=xxx
  // Token comes from the link in the verification email
  @Post('verify-email')
  verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  // POST /auth/login
  // Body: { email, password }
  // Returns: { accessToken, refreshToken }
  @Post('login')
  login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(dto);
  }

  // POST /auth/refresh
  // Requires: Authorization: Bearer <refreshToken>
  // Returns: { accessToken }
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: Request): Promise<{ accessToken: string }> {
    const user = req.user as JwtRefreshPayload;
    // refreshToken extracted from Authorization header
    const refreshToken = req.headers.authorization?.split(' ')[1] ?? '';
    return this.authService.refresh(user.sub, refreshToken);
  }

  // POST /auth/logout
  // Requires: Authorization: Bearer <accessToken>
  // Clears stored refresh token
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  logout(@Req() req: Request): Promise<{ message: string }> {
    const user = req.user as JwtRefreshPayload;
    return this.authService.logout(user.sub);
  }

  // POST /auth/resend-verification
  // Body: { email }
  @Post('resend-verification')
  resendVerification(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(email);
  }
}