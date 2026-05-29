import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';

// Defines what data is stored inside the access token
export interface JwtAccessPayload {
  sub: string; // user id
  email: string;
  role: Role;
  isVerified: boolean;
  universityId: string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor() {
    super({
      // Extract token from Bearer header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }

  // Called automatically after token is verified
  // Whatever we return here gets attached to request.user
  validate(payload: JwtAccessPayload): JwtAccessPayload {
    return payload;
  }
}
