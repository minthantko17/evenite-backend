import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { University } from '@prisma/client';

@Injectable()
export class UniversityService {
  constructor(private readonly prisma: PrismaService) {}

  // Extracts domain from email and finds matching university
  async findByEmailDomain(email: string): Promise<University | null> {
    const domain = email.split('@')[1];
    return this.prisma.university.findFirst({
      where: {
        domain,
        isActive: true,
      },
    });
  }
}
