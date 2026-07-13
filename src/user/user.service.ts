import { Injectable, Logger } from '@nestjs/common';
import { EventStatus, TicketStatus } from '@prisma/client';
import { UserCrudService } from './services/user-crud.service';
import { UserValidationService } from './services/user-validation.service';
import { UserStorageService } from './services/user-storage.service';
import { AuthService } from '../auth/auth.service';
import { CreateParticipantProfileDto } from './dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from './dto/update-participant-profile.dto';
import { CreateOrganizerProfileDto } from './dto/create-organizer-profile.dto';
import { UpdateOrganizerProfileDto } from './dto/update-organizer-profile.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { ReturnUserDto } from './dto/return-user.dto';
import { ReturnParticipantProfileDto } from './dto/return-participant-profile.dto';
import { ReturnOrganizerProfileDto } from './dto/return-organizer-profile.dto';
import type { ReturnSwitchProfileDto } from './dto/return-switch-profile.dto';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from './constants/user-images.constant';
import { validateImageFile } from '../common/utils/file.utils';
import { EventService } from '../event/event.service';
import { EventResponseDto } from '../event/dto/event-response.dto';
import { RegistrationService } from '../registration/registration.service';
import { ReturnRegisteredEventDto } from '../registration/dto/return-registered-event.dto';
import { ReturnParticipantTicketListDto } from '../registration/dto/return-participant-ticket-list.dto';
import { ReturnTicketDetailDto } from '../registration/dto/return-ticket-detail.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userCrudService: UserCrudService,
    private readonly userValidationService: UserValidationService,
    private readonly userStorageService: UserStorageService,
    private readonly authService: AuthService,
    private readonly eventService: EventService,
    private readonly registrationService: RegistrationService,
  ) {}

  // --- User ---

  async getUserProfile(userId: string): Promise<ReturnUserDto> {
    return this.userCrudService.getUserById(userId);
  }

  // --- Participant ---

  async getParticipantProfile(
    userId: string,
  ): Promise<ReturnParticipantProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    return this.userCrudService.getParticipantProfile(userId);
  }

  async createParticipantProfile(
    userId: string,
    dto: CreateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto & { accessToken: string }> {
    await this.userValidationService.validateUserExists(userId);
    await this.userValidationService.validateParticipantProfileNotExists(
      userId,
    );
    this.userValidationService.validateParticipantProfileData(dto);

    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_PARTICIPANT_IMAGE_URL,
    );

    const participantProfile =
      await this.userCrudService.createParticipantProfile(userId, dto);
    await this.userCrudService.updateUserRole(userId, 'PARTICIPANT');
    const accessToken = await this.authService.issueAccessTokenForUser(userId);

    return { ...participantProfile, accessToken };
  }

  async updateParticipantProfile(
    userId: string,
    dto: UpdateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    const participantProfile =
      await this.userCrudService.getParticipantProfile(userId);
    this.userValidationService.validateParticipantProfileData(dto);

    const hasImageUrlField = dto.imageUrl !== undefined;
    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_PARTICIPANT_IMAGE_URL,
    );

    if (hasImageUrlField) {
      const deletionResult =
        await this.userStorageService.deleteOrphanImageIfReplaced(
          participantProfile.imageUrl,
          dto.imageUrl,
          DEFAULT_PARTICIPANT_IMAGE_URL,
        );
      this.logger.log(deletionResult.message);
    }

    return this.userCrudService.updateParticipantProfile(userId, dto);
  }

  async uploadParticipantImage(
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    validateImageFile(file);
    const imageUrl = await this.userStorageService.uploadImageToStorage(
      file,
      'participant',
    );
    return { imageUrl };
  }

  // --- Organizer ---

  async getOrganizerProfile(
    userId: string,
  ): Promise<ReturnOrganizerProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    return this.userCrudService.getOrganizerProfile(userId);
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
    const accessToken = await this.authService.issueAccessTokenForUser(userId);

    return { ...organizerProfile, accessToken };
  }

  async updateOrganizerProfile(
    userId: string,
    dto: UpdateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto> {
    await this.userValidationService.validateUserExists(userId);
    const organizerProfile =
      await this.userCrudService.getOrganizerProfile(userId);
    this.userValidationService.validateOrganizerProfileData(dto);

    const hasImageUrlField = dto.imageUrl !== undefined;
    dto.imageUrl = this.userStorageService.resolveImageUrl(
      dto.imageUrl,
      DEFAULT_ORGANIZER_IMAGE_URL,
    );

    if (hasImageUrlField) {
      const deletionResult =
        await this.userStorageService.deleteOrphanImageIfReplaced(
          organizerProfile.imageUrl,
          dto.imageUrl,
          DEFAULT_ORGANIZER_IMAGE_URL,
        );
      this.logger.log(deletionResult.message);
    }

    return this.userCrudService.updateOrganizerProfile(userId, dto);
  }

  async uploadOrganizerImage(
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    validateImageFile(file);
    const imageUrl = await this.userStorageService.uploadImageToStorage(
      file,
      'organizer',
    );
    return { imageUrl };
  }

  // --- Switch Profile ---

  async switchProfile(
    userId: string,
    dto: SwitchRoleDto,
  ): Promise<ReturnSwitchProfileDto> {
    const user = await this.userCrudService.getUserById(userId);

    // same role switching not allowed
    this.userValidationService.checkRoleTransition(
      user.currentRole,
      dto.targetRole,
    );

    let returnProfile: ReturnParticipantProfileDto | ReturnOrganizerProfileDto;

    if (dto.targetRole === 'PARTICIPANT') {
      returnProfile = await this.userCrudService.getParticipantProfile(userId);
    } else {
      returnProfile = await this.userCrudService.getOrganizerProfile(userId);
    }

    await this.userCrudService.updateUserRole(userId, dto.targetRole);
    const accessToken = await this.authService.issueAccessTokenForUser(userId);

    return {
      message: `Switched to ${dto.targetRole.toLowerCase()} mode successfully.`,
      accessToken,
      profile: returnProfile,
    };
  }

  // --- Events ---

  async getCreatedEvents(
    userId: string,
    status?: EventStatus,
  ): Promise<EventResponseDto[]> {
    const user = await this.userCrudService.getUserById(userId);
    const organizerProfile =
      await this.userCrudService.getOrganizerProfile(userId);
    return this.eventService.getCreatedEvents(
      organizerProfile.id,
      user.universityId,
      status,
    );
  }

  async getRegisteredEvents(
    userId: string,
    status?: EventStatus,
  ): Promise<ReturnRegisteredEventDto[]> {
    const participantProfile =
      await this.userCrudService.getParticipantProfile(userId);
    return this.registrationService.getRegisteredEvents(
      participantProfile.id,
      status,
    );
  }

  async getTickets(
    userId: string,
    ticketStatus?: TicketStatus,
  ): Promise<ReturnParticipantTicketListDto[]> {
    const participantProfile =
      await this.userCrudService.getParticipantProfile(userId);
    return this.registrationService.getTickets(
      participantProfile.id,
      ticketStatus,
    );
  }

  async getTicketById(
    userId: string,
    ticketId: string,
  ): Promise<ReturnTicketDetailDto> {
    const participantProfile =
      await this.userCrudService.getParticipantProfile(userId);
    return this.registrationService.getTicketById(
      ticketId,
      participantProfile.id,
    );
  }
}
