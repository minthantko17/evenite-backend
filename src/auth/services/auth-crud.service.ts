import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, EmailVerification } from '@prisma/client';

@Injectable()
export class AuthCrudService {
  constructor(private readonly prisma: PrismaService) {}

  // USER
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: {
    universityId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName?: string | null;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateUser(
    id: string,
    data: Partial<{
      isVerified: boolean;
      refreshToken: string | null;
      firstName: string;
      lastName: string | null;
      nickname: string | null;
      studentId: string | null;
      phone: string | null;
      imageUrl: string | null;
      preferences: any;
      role: any;
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
