import { Injectable } from '@nestjs/common';
import { ParticipantProfile, OrganizerProfile, Role } from '@prisma/client';
import { UserCrudService } from './user-crud.service';
import { UserWithProfiles } from '../../auth/services/auth-crud.service';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';
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
import { InvalidImageException } from '../exceptions/invalid-image.exception';
import { InvalidUrlException } from '../exceptions/invalid-url.exception';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../constants/user-images.constant';

@Injectable()
export class UserValidationService {
  constructor(private readonly userCrudService: UserCrudService) {}

  async checkUserExists(userId: string): Promise<UserWithProfiles> {
    const user = await this.userCrudService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }

  async checkParticipantProfileNotExists(userId: string): Promise<void> {
    const profile = await this.userCrudService.getParticipantProfile(userId);
    if (profile) {
      throw new ProfileAlreadyExistsException(
        'Participant profile already exists.',
      );
    }
  }

  async checkParticipantProfileExists(
    userId: string,
  ): Promise<ParticipantProfile> {
    const profile = await this.userCrudService.getParticipantProfile(userId);
    if (!profile) {
      throw new ProfileNotFoundException('Participant profile not found.');
    }
    return profile;
  }

  async checkOrganizerProfileNotExists(userId: string): Promise<void> {
    const profile = await this.userCrudService.getOrganizerProfile(userId);
    if (profile) {
      throw new ProfileAlreadyExistsException(
        'Organizer profile already exists.',
      );
    }
  }

  async checkOrganizerProfileExists(userId: string): Promise<OrganizerProfile> {
    const profile = await this.userCrudService.getOrganizerProfile(userId);
    if (!profile) {
      throw new ProfileNotFoundException('Organizer profile not found.');
    }
    return profile;
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
    if ('firstName' in dto && dto.firstName !== undefined) {
      if (dto.firstName.trim().length === 0) {
        throw new NameEmptyException('First name cannot be empty.');
      }
    }

    if (dto.contactEmail !== undefined && dto.contactEmail !== '') {
      if (!dto.contactEmail.includes('@')) {
        throw new InvalidMailException('Invalid contact email format.');
      }
    }

    if (dto.imageUrl !== undefined && dto.imageUrl !== '') {
      if (!this.isValidUrl(dto.imageUrl)) {
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
    if ('name' in dto && dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new NameEmptyException('Organizer name cannot be empty.');
      }
    }

    if (dto.contactEmail !== undefined && dto.contactEmail !== '') {
      if (!dto.contactEmail.includes('@')) {
        throw new InvalidMailException('Invalid contact email format.');
      }
    }

    if (dto.imageUrl !== undefined && dto.imageUrl !== '') {
      if (!this.isValidUrl(dto.imageUrl)) {
        throw new InvalidUrlException('Invalid image URL format.');
      }
    }

    if (dto.externalUrl !== undefined && dto.externalUrl !== '') {
      if (!this.isValidUrl(dto.externalUrl)) {
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

  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new InvalidImageException('No input file provided');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new InvalidImageException('Unsupported image format');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new InvalidImageException('File size must not exceed 5MB.');
    }
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
