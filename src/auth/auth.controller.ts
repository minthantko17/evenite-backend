import { Controller, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { Request } from 'express';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(dto);
  }

  // Token comes from the link in the verification email
  @Post('verify-email')
  verifyEmail(@Query('token') token: string): Promise<{ 
    message: string;
    accessToken: string;
    refreshToken: string;
  }> {
    return this.authService.verifyEmail(token);
  }

  @Post('login')
  login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(dto);
  }

  // Requires: Authorization: Bearer <refreshToken>
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: Request): Promise<{ accessToken: string }> {
    const user = req.user as JwtRefreshPayload;
    const refreshToken = req.headers.authorization?.split(' ')[1] ?? '';
    return this.authService.refresh(user.sub, refreshToken);
  }

  // Requires: Authorization: Bearer <accessToken>
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  logout(@Req() req: Request): Promise<{ message: string }> {
    const user = req.user as JwtRefreshPayload;
    return this.authService.logout(user.sub);
  }

  @Post('resend-verification')
  resendVerification(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(email);
  }
}