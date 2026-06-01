import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role, EmailVerification, Prisma } from '@prisma/client';

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    participantProfile: true;
    organizerProfile: true;
  };
}>;

@Injectable()
export class AuthCrudService {
  constructor(private readonly prisma: PrismaService) {}

  // USER
  async findUserByEmail(email: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        participantProfile: true,
        organizerProfile: true,
      }
    });
  }

  async findUserById(id: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        participantProfile: true,
        organizerProfile: true,
      }
    });
  }

  async createUser(data: {
    universityId: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateUser(
    id: string,
    data: Partial<{
      isVerified: boolean;
      refreshToken: string | null;
      currentRole: Role | null;
      passwordHash: string;
    }>,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // EMAIL VERIFICATION
  async findVerificationByToken(
    token: string,
  ): Promise<EmailVerification | null> {
    return this.prisma.emailVerification.findUnique({
      where: { token },
    });
  }

  async createVerificationRecord(
    userId: string,
    token: string,
    expireAt: Date,
  ): Promise<void> {
    await this.prisma.emailVerification.create({
      data: { userId, token, expireAt },
    });
  }

  async deleteVerificationByToken(token: string): Promise<void> {
    await this.prisma.emailVerification.delete({
      where: { token },
    });
  }

  async deleteVerificationByUserId(userId: string): Promise<void> {
    await this.prisma.emailVerification.deleteMany({
      where: { userId },
    });
  }
}
