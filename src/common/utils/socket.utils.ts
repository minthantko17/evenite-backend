import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Socket } from 'socket.io';

// shared by every gateway so socket auth and per-user channels stay identical

// token comes from handshake auth first, then the Authorization header
export function extractTokenFromHandshake(client: Socket): string {
  const authToken = (client.handshake.auth as { token?: string } | undefined)
    ?.token;
  const token: string | undefined =
    authToken ||
    client.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedException('No token provided');
  }
  return token;
}

// per-user socket.io room; fans out to all of a user's connected devices/tabs
export function buildPersonalChannel(
  role: Role | null,
  profileId: string | null,
): string | null {
  if (!role || !profileId) {
    return null;
  }
  return `user:${role}:${profileId}`;
}

// CORS for socket.io gateways
export const socketCorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ): void => {
    const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')
      .map((allowed) => allowed.trim());
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
};
