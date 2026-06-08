import { Injectable } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { UserCrudService } from './services/user-crud.service';
import { UserValidationService } from './services/user-validation.service';
import { UserStorageService } from './services/user-storage.service';
import { AuthTokenService } from '../auth/services/auth-token.service';
import { AuthCrudService } from '../auth/services/auth-crud.service';
import { CreateParticipantProfileDto } from './dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from './dto/update-participant-profile.dto';
import { CreateOrganizerProfileDto } from './dto/create-organizer-profile.dto';
import { UpdateOrganizerProfileDto } from './dto/update-organizer-profile.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { ReturnUserDto } from './dto/return-user.dto';
import { ReturnParticipantProfileDto } from './dto/return-participant-profile.dto';
import { ReturnOrganizerProfileDto } from './dto/return-organizer-profile.dto';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { Event, EventRegistration } from '@prisma/client';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from './constants/user-images.constant';
import { DEFAULT_PREFERENCES } from './constants/user-preferences.constant';
import type { ReturnSwitchProfileDto } from './dto/return-switch-profile.dto';
import { EventRegistrationWithEvent } from './services/user-crud.service';
import { UserNotFoundException } from './exceptions/user-not-found.exception';

@Injectable()
export class UserService {
  constructor(
    private readonly userCrudService: UserCrudService,
    private readonly userValidationService: UserValidationService,
    private readonly userStorageService: UserStorageService,
    private readonly authTokenService: AuthTokenService,
    private readonly authCrudService: AuthCrudService,
  ) {}

  async getUserProfile(userId: string): Promise<ReturnUserDto> {
    const user = await this.userCrudService.getUserById(userId);
    return this.mapToReturnUserDto(user);
  }

  // Participant

  async getParticipantProfile(
    userId: string,
  ): Promise<ReturnParticipantProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    const participantProfile =
      await this.userCrudService.getParticipantProfile(userId);
    return this.mapToReturnParticipantProfileDto(participantProfile);
  }

  async createParticipantProfile(
    userId: string,
    dto: CreateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto & { accessToken: string }> {
    await this.userValidationService.validateUserExists(userId);
    await this.userValidationService.validateParticipantProfileNotExists(userId);
    this.userValidationService.validateParticipantProfileData(dto);

    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_PARTICIPANT_IMAGE_URL,
    );

    const participantProfile = await this.userCrudService.createParticipantProfile(
      userId,
      dto,
    );
    await this.userCrudService.updateUserRole(userId, 'PARTICIPANT');
    const accessToken = await this.issueNewAccessToken(userId);

    return {
      ...this.mapToReturnParticipantProfileDto(participantProfile),
      accessToken,
    };
  }

  async updateParticipantProfile(
    userId: string,
    dto: UpdateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    await this.userCrudService.getParticipantProfile(userId); // test call to validate profile exists
    this.userValidationService.validateParticipantProfileData(dto);

    const hasImageUrlField = dto.imageUrl !== undefined;
    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_PARTICIPANT_IMAGE_URL,
    );
    if (hasImageUrlField) {
      await this.userStorageService.deleteOrphanParticipantImageIfReplaced(
        userId,
        dto.imageUrl,
      );
    }

    const participantProfile = await this.userCrudService.updateParticipantProfile(
      userId,
      dto,
    );

    return this.mapToReturnParticipantProfileDto(participantProfile);
  }

  async uploadParticipantImage(
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    this.userValidationService.validateImageFile(file);
    const imageUrl = await this.userStorageService.uploadImageToStorage(
      file,
      'participant',
    );

    return { imageUrl };
  }

  // Organizer

  async getOrganizerProfile(
    userId: string,
  ): Promise<ReturnOrganizerProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    const organizerProfile =
      await this.userCrudService.getOrganizerProfile(userId);
    return this.mapToReturnOrganizerProfileDto(organizerProfile);
  }

  async createOrganizerProfile(
    userId: string,
    dto: CreateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto & { accessToken: string }> {
    await this.userValidationService.validateUserExists(userId);
    await this.userValidationService.validateOrganizerProfileNotExists(userId);
    this.userValidationService.validateOrganizerProfileData(dto);

    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_ORGANIZER_IMAGE_URL,
    );
    
    const organizerProfile = await this.userCrudService.createOrganizerProfile(
      userId,
      dto,
    );
    await this.userCrudService.updateUserRole(userId, 'ORGANIZER');
    const accessToken = await this.issueNewAccessToken(userId);

    return {
      ...this.mapToReturnOrganizerProfileDto(organizerProfile),
      accessToken,
    };
  }

  async updateOrganizerProfile(
    userId: string,
    dto: UpdateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    await this.userCrudService.getOrganizerProfile(userId); // test call to validate profile exists
    this.userValidationService.validateOrganizerProfileData(dto);
    
    const hasImageUrlField = dto.imageUrl !== undefined;
    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_ORGANIZER_IMAGE_URL,
    );
    if (hasImageUrlField) {
      await this.userStorageService.deleteOrphanOrganizerImageIfReplaced(
        userId,
        dto.imageUrl,
      );
    }

    const organizerProfile = await this.userCrudService.updateOrganizerProfile(
      userId,
      dto,
    );

    return this.mapToReturnOrganizerProfileDto(organizerProfile);
  }

  async uploadOrganizerImage(
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    this.userValidationService.validateImageFile(file);
    const imageUrl = await this.userStorageService.uploadImageToStorage(
      file,
      'organizer',
    );

    return { imageUrl };
  }



  async switchProfile(
    userId: string,
    dto: SwitchRoleDto,
  ): Promise<ReturnSwitchProfileDto> {
    const user = await this.userCrudService.getUserById(userId);

    // check role switching is possible (can't switch to same role)
    this.userValidationService.checkRoleTransition(
      user.currentRole,
      dto.targetRole,
    );

    let returnProfile: ReturnParticipantProfileDto | ReturnOrganizerProfileDto;

    if (dto.targetRole === 'PARTICIPANT') {
      const participantProfile = await this.userCrudService.getParticipantProfile(userId);
      returnProfile = this.mapToReturnParticipantProfileDto(participantProfile);
    } else {
      const organizerProfile = await this.userCrudService.getOrganizerProfile(userId);
      returnProfile = this.mapToReturnOrganizerProfileDto(organizerProfile);
    }

    await this.userCrudService.updateUserRole(userId, dto.targetRole);
    const accessToken = await this.issueNewAccessToken(userId);

    return {
      message: `Switched to ${dto.targetRole.toLowerCase()} mode successfully.`,
      accessToken,
      profile: returnProfile,
    };
  }

  async getCreatedEvents(
    userId: string,
    status?: EventStatus,
  ): Promise<Event[]> {
    const user = await this.userCrudService.getUserById(userId);
    const organizerProfile =
      await this.userCrudService.getOrganizerProfile(userId);

    return this.userCrudService.getCreatedEvents(
      organizerProfile.id,
      user.universityId,
      status,
    );
  }

  // need to review again in feature #5
  async getRegisteredEvents(
    userId: string,
    status?: EventStatus,
  ): Promise<EventRegistrationWithEvent[]> {
    const user = await this.userCrudService.getUserById(userId);
    const participantProfile =
      await this.userCrudService.getParticipantProfile(userId);
    
    return this.userCrudService.getRegisteredEvents(
      participantProfile.id,
      user.universityId,
      status
    );
  }


  // --- helper methods ---

  private async issueNewAccessToken(userId: string): Promise<string> {
    const user = await this.authCrudService.findUserById(userId);
    if (!user) throw new UserNotFoundException();

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      currentRole: user.currentRole,
      isVerified: user.isVerified,
      universityId: user.universityId,
      participantProfileId: user.participantProfile?.id ?? null,
      organizerProfileId: user.organizerProfile?.id ?? null,
      hasCreatedProfile:
        user.participantProfile !== null || user.organizerProfile !== null,
    };

    return this.authTokenService.generateAccessToken(accessPayload);
  }

  private mapToReturnUserDto(user: any): ReturnUserDto {
    return {
      id: user.id,
      email: user.email,
      currentRole: user.currentRole,
      isVerified: user.isVerified,
      universityId: user.universityId,
      hasCreatedProfile:
        user.participantProfile !== null || user.organizerProfile !== null,
      createdAt: user.createdAt,
    };
  }

  private mapToReturnParticipantProfileDto(
    profile: any,
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
      preferences: profile.preferences ?? DEFAULT_PREFERENCES,
      createdAt: profile.createdAt,
    };
  }

  private mapToReturnOrganizerProfileDto(
    profile: any,
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
