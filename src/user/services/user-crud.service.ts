import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  User,
  ParticipantProfile,
  OrganizerProfile,
  Role,
  Prisma,
} from '@prisma/client';
import { CreateParticipantProfileDto } from '../dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from '../dto/update-participant-profile.dto';
import { CreateOrganizerProfileDto } from '../dto/create-organizer-profile.dto';
import { UpdateOrganizerProfileDto } from '../dto/update-organizer-profile.dto';
import { UserWithProfiles } from '../../auth/services/auth-crud.service';
import { DEFAULT_PREFERENCES } from '../constants/user-preferences.constant';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from '../constants/user-images.constant';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';

@Injectable()
export class UserCrudService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getUserById(userId: string): Promise<UserWithProfiles> {
    const result = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        participantProfile: true,
        organizerProfile: true,
      },
    });
    if (!result){
      throw new UserNotFoundException();
    }
    return result;
  }

  async updateUserRole(userId: string, role: Role | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { currentRole: role },
    });
  }

  async getParticipantProfile(
    userId: string,
  ): Promise<ParticipantProfile> {
    const result = await this.prisma.participantProfile.findUnique({
      where: { userId },
    });
    if (!result) {
      throw new ProfileNotFoundException('Participant profile not found.');
    }
    return result;
  }

  async createParticipantProfile(
    userId: string,
    dto: CreateParticipantProfileDto,
  ): Promise<ParticipantProfile> {
    return this.prisma.participantProfile.create({
      data: {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName ?? '',
        nickname: dto.nickname ?? '',
        studentId: dto.studentId ?? '',
        major: dto.major ?? '',
        contactEmail: dto.contactEmail ?? '',
        contactPhone: dto.contactPhone ?? '',
        contactLineId: dto.contactLineId ?? '',
        imageUrl: dto.imageUrl ?? DEFAULT_PARTICIPANT_IMAGE_URL,
        preferences: dto.preferences
          ? (dto.preferences as unknown as Prisma.InputJsonValue)
          : (DEFAULT_PREFERENCES as unknown as Prisma.InputJsonValue),
      },
    });
  }

  async updateParticipantProfile(
    userId: string,
    dto: UpdateParticipantProfileDto,
  ): Promise<ParticipantProfile> {
    return this.prisma.participantProfile.update({
      where: { userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.studentId !== undefined && { studentId: dto.studentId }),
        ...(dto.major !== undefined && { major: dto.major }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone,
        }),
        ...(dto.contactLineId !== undefined && {
          contactLineId: dto.contactLineId,
        }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.preferences !== undefined && {
          preferences: dto.preferences as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async getOrganizerProfile(userId: string): Promise<OrganizerProfile> {
    const result = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });
    if (!result) {
      throw new ProfileNotFoundException('Organizer profile not found.');
    }
    return result;
  }

  async createOrganizerProfile(
    userId: string,
    dto: CreateOrganizerProfileDto,
  ): Promise<OrganizerProfile> {
    return this.prisma.organizerProfile.create({
      data: {
        userId,
        name: dto.name,
        bio: dto.bio ?? '',
        contactEmail: dto.contactEmail ?? '',
        contactPhone: dto.contactPhone ?? '',
        contactLineId: dto.contactLineId ?? '',
        imageUrl: dto.imageUrl ?? DEFAULT_ORGANIZER_IMAGE_URL,
        externalUrl: dto.externalUrl ?? '',
      },
    });
  }

  async updateOrganizerProfile(
    userId: string,
    dto: UpdateOrganizerProfileDto,
  ): Promise<OrganizerProfile> {
    return this.prisma.organizerProfile.update({
      where: { userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone,
        }),
        ...(dto.contactLineId !== undefined && {
          contactLineId: dto.contactLineId,
        }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.externalUrl !== undefined && { externalUrl: dto.externalUrl }),
      },
    });
  }
}
