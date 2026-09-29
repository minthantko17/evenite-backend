import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role, EmailVerification } from '@prisma/client';
import { UserWithProfiles } from '../../user/types/user.types';

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

  async findUserVerificationStatusByEmail(
    email: string,
  ): Promise<{ id: string; isVerified: boolean } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isVerified: true },
    });
  }

  // Deletes a user only if still unverified. Guards against a race where
  // the user verifies in the moment between the caller's check and this
  // delete. Returns true if a row was actually deleted.
  async deleteUnverifiedUser(id: string): Promise<boolean> {
    const result = await this.prisma.user.deleteMany({
      where: { id, isVerified: false },
    });
    return result.count > 0;
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
