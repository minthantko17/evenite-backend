import { Injectable } from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ParticipantProfile, OrganizerProfile } from '@prisma/client';
import { CreateParticipantProfileDto } from '../dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from '../dto/update-participant-profile.dto';
import { CreateOrganizerProfileDto } from '../dto/create-organizer-profile.dto';
import { UpdateOrganizerProfileDto } from '../dto/update-organizer-profile.dto';
import { UserWithProfiles } from '../types/user.types';
import {
  DEFAULT_PREFERENCES,
  UserPreferences,
} from '../constants/user-preferences.constant';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from '../constants/user-images.constant';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';
import { SaveProfileException } from '../exceptions/save-profile.exception';
import { ReturnUserDto } from '../dto/return-user.dto';
import { ReturnParticipantProfileDto } from '../dto/return-participant-profile.dto';
import { ReturnOrganizerProfileDto } from '../dto/return-organizer-profile.dto';

@Injectable()
export class UserCrudService {
  constructor(private readonly prisma: PrismaService) {}

  // User

  async getUserById(userId: string): Promise<ReturnUserDto> {
    const result = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        participantProfile: true,
        organizerProfile: true,
      },
    });
    if (!result) {
      throw new UserNotFoundException();
    }
    return this.mapToReturnUserDto(result);
  }

  async updateUserRole(userId: string, role: Role | null): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentRole: role },
      });
    } catch {
      throw new SaveProfileException(
        'Failed to update user role. Please try again.',
      );
    }
  }

  // --- Participant Profile ---

  async getParticipantProfile(
    userId: string,
  ): Promise<ReturnParticipantProfileDto> {
    const result = await this.prisma.participantProfile.findUnique({
      where: { userId },
    });
    if (!result) {
      throw new ProfileNotFoundException('Participant profile not found.');
    }
    return this.mapToReturnParticipantProfileDto(result);
  }

  async createParticipantProfile(
    userId: string,
    dto: CreateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto> {
    try {
      const result = await this.prisma.participantProfile.create({
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
      return this.mapToReturnParticipantProfileDto(result);
    } catch {
      throw new SaveProfileException(
        'Failed to create participant profile. Please try again.',
      );
    }
  }

  async updateParticipantProfile(
    userId: string,
    dto: UpdateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto> {
    try {
      const result = await this.prisma.participantProfile.update({
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
      return this.mapToReturnParticipantProfileDto(result);
    } catch {
      throw new SaveProfileException(
        'Failed to update participant profile. Please try again.',
      );
    }
  }

  // --- Organizer Profile ---

  async getOrganizerProfile(
    userId: string,
  ): Promise<ReturnOrganizerProfileDto> {
    const result = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });
    if (!result) {
      throw new ProfileNotFoundException('Organizer profile not found.');
    }
    return this.mapToReturnOrganizerProfileDto(result);
  }

  async createOrganizerProfile(
    userId: string,
    dto: CreateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto> {
    try {
      const result = await this.prisma.organizerProfile.create({
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
      return this.mapToReturnOrganizerProfileDto(result);
    } catch {
      throw new SaveProfileException(
        'Failed to create organizer profile. Please try again.',
      );
    }
  }

  async updateOrganizerProfile(
    userId: string,
    dto: UpdateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto> {
    try {
      const result = await this.prisma.organizerProfile.update({
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
          ...(dto.externalUrl !== undefined && {
            externalUrl: dto.externalUrl,
          }),
        },
      });
      return this.mapToReturnOrganizerProfileDto(result);
    } catch {
      throw new SaveProfileException(
        'Failed to update organizer profile. Please try again.',
      );
    }
  }

  // --- private mappers ---

  private mapToReturnUserDto(user: UserWithProfiles): ReturnUserDto {
    return {
      id: user.id,
      email: user.email,
      currentRole: user.currentRole,
      isVerified: user.isVerified,
      universityId: user.universityId,
      hasCreatedProfile:
        user.participantProfile !== null || user.organizerProfile !== null,
      participantProfile: user.participantProfile
        ? this.mapToReturnParticipantProfileDto(user.participantProfile)
        : null,
      organizerProfile: user.organizerProfile
        ? this.mapToReturnOrganizerProfileDto(user.organizerProfile)
        : null,
      createdAt: user.createdAt,
    };
  }

  private mapToReturnParticipantProfileDto(
    profile: ParticipantProfile,
  ): ReturnParticipantProfileDto {
    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName ?? '',
      nickname: profile.nickname ?? '',
      studentId: profile.studentId ?? '',
      major: profile.major ?? '',
      contactEmail: profile.contactEmail ?? '',
      contactPhone: profile.contactPhone ?? '',
      contactLineId: profile.contactLineId ?? '',
      imageUrl: profile.imageUrl ?? DEFAULT_PARTICIPANT_IMAGE_URL,
      preferences:
        (profile.preferences as unknown as UserPreferences) ??
        DEFAULT_PREFERENCES,
      createdAt: profile.createdAt,
    };
  }

  private mapToReturnOrganizerProfileDto(
    profile: OrganizerProfile,
  ): ReturnOrganizerProfileDto {
    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio ?? '',
      contactEmail: profile.contactEmail ?? '',
      contactPhone: profile.contactPhone ?? '',
      contactLineId: profile.contactLineId ?? '',
      imageUrl: profile.imageUrl ?? DEFAULT_ORGANIZER_IMAGE_URL,
      externalUrl: profile.externalUrl ?? '',
      createdAt: profile.createdAt,
    };
  }
}
