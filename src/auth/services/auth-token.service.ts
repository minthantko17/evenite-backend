import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthCrudService } from './auth-crud.service';
import { JwtAccessPayload } from '../strategies/jwt-access.strategy';
import { JwtRefreshPayload } from '../strategies/jwt-refresh.strategy';
import { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authCrudService: AuthCrudService,
  ) {}

  generateAccessToken(payload: JwtAccessPayload): string {
    const options: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: '15m',
    };
    return this.jwtService.sign(payload, options);
  }

  generateRefreshToken(payload: JwtRefreshPayload): string {
    const options: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '7d',
    };
    return this.jwtService.sign(payload, options);
  }

  async hashAndStoreRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, 12);
    await this.authCrudService.updateUser(userId, { refreshToken: hashed });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.authCrudService.updateUser(userId, { refreshToken: null });
  }
}
