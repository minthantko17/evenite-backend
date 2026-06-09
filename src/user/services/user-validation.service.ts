import { Injectable } from '@nestjs/common';
import { ParticipantProfile, OrganizerProfile, Role } from '@prisma/client';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileAlreadyExistsException } from '../exceptions/profile-already-exists.exception';
import { InvalidRoleTransitionException } from '../exceptions/invalid-role-transition.exception';
import {
  ALLOWED_PERSONAL_PREFERENCES,
  ALLOWED_EVENT_PREFERENCES,
  ALLOWED_LANGUAGES,
} from '../constants/user-preferences.constant';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { CreateParticipantProfileDto } from '../dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from '../dto/update-participant-profile.dto';
import { CreateOrganizerProfileDto } from '../dto/create-organizer-profile.dto';
import { UpdateOrganizerProfileDto } from '../dto/update-organizer-profile.dto';
import { InvalidPreferencesException } from '../exceptions/invalid-preferences.exception';
import { NameEmptyException } from '../exceptions/name-empty.exception';
import { InvalidMailException } from '../exceptions/invalid-mail.exception';
import { InvalidUrlException } from '../exceptions/invalid-url.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { isValidUrl } from '../../common/utils/url.utils';

@Injectable()
export class UserValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new UserNotFoundException();
    }
  }

  async validateParticipantProfileNotExists(userId: string): Promise<void> {
    const participantProfile = await this.prisma.participantProfile.findUnique({
      where: { userId },
    });
    if (participantProfile) {
      throw new ProfileAlreadyExistsException(
        'Participant profile already exists.',
      );
    }
  }

  async validateOrganizerProfileNotExists(userId: string): Promise<void> {
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });
    if (organizerProfile) {
      throw new ProfileAlreadyExistsException(
        'Organizer profile already exists.',
      );
    }
  }

  // to prevent switching to same role
  checkRoleTransition(currentRole: Role | null, newRole: Role): void {
    if (currentRole === newRole) {
      throw new InvalidRoleTransitionException();
    }
  }

  validateParticipantProfileData(
    dto: CreateParticipantProfileDto | UpdateParticipantProfileDto,
  ): void {
    if (dto.firstName === undefined || dto.firstName === null || dto.firstName.trim().length === 0) {
      throw new NameEmptyException('First name cannot be empty.');
    }

    if (dto.contactEmail !== undefined && dto.contactEmail !== '') {
      if (!dto.contactEmail.includes('@')) {
        throw new InvalidMailException('Invalid contact email format.');
      }
    }

    if (dto.imageUrl !== undefined && dto.imageUrl !== '') {
      if (!isValidUrl(dto.imageUrl)) {
        throw new InvalidUrlException('Invalid image URL format.');
      }
    }

    if (dto.preferences !== undefined) {
      this.validatePreferences(dto.preferences);
    }
  }

  validateOrganizerProfileData(
    dto: CreateOrganizerProfileDto | UpdateOrganizerProfileDto,
  ): void {
    if (dto.name === undefined || dto.name === null || dto.name.trim().length === 0) {
      throw new NameEmptyException('Organizer name cannot be empty.');
    }

    if (dto.contactEmail !== undefined && dto.contactEmail !== '') {
      if (!dto.contactEmail.includes('@')) {
        throw new InvalidMailException('Invalid contact email format.');
      }
    }

    if (dto.imageUrl !== undefined && dto.imageUrl !== '') {
      if (!isValidUrl(dto.imageUrl)) {
        throw new InvalidUrlException('Invalid image URL format.');
      }
    }

    if (dto.externalUrl !== undefined && dto.externalUrl !== '') {
      if (!isValidUrl(dto.externalUrl)) {
        throw new InvalidUrlException('Invalid external URL format.');
      }
    }
  }

  validatePreferences(preferences: UpdatePreferencesDto): void {
    if (preferences.personal !== undefined) {
      const invalidPersonal = preferences.personal.filter(
        (p) => !ALLOWED_PERSONAL_PREFERENCES.includes(p as any),
      );
      if (invalidPersonal.length > 0) {
        throw new InvalidPreferencesException(
          `Invalid personal preferences: ${invalidPersonal.join(', ')}`,
        );
      }
    }

    if (
      preferences.personalOther !== undefined &&
      preferences.personalOther.trim().length > 100
    ) {
      throw new InvalidPreferencesException(
        'Personal other field must not exceed 100 characters.',
      );
    }

    if (preferences.event !== undefined) {
      const invalidEvent = preferences.event.filter(
        (e) => !([...ALLOWED_EVENT_PREFERENCES] as string[]).includes(e),
      );
      if (invalidEvent.length > 0) {
        throw new InvalidPreferencesException(
          `Invalid event preferences: ${invalidEvent.join(', ')}`,
        );
      }
    }

    if (preferences.language !== undefined) {
      const invalidLanguage = preferences.language.filter(
        (l) => !ALLOWED_LANGUAGES.includes(l as any),
      );
      if (invalidLanguage.length > 0) {
        throw new InvalidPreferencesException(
          `Invalid language preferences: ${invalidLanguage.join(', ')}`,
        );
      }
    }
  }
}
