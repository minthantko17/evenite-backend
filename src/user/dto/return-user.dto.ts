import { Role } from '@prisma/client';
import { ReturnParticipantProfileDto } from './return-participant-profile.dto';
import { ReturnOrganizerProfileDto } from './return-organizer-profile.dto';

export interface ReturnUserDto {
  id: string;
  email: string;
  currentRole: Role | null;
  isVerified: boolean;
  universityId: string;
  hasCreatedProfile: boolean;
  participantProfile: ReturnParticipantProfileDto | null;
  organizerProfile: ReturnOrganizerProfileDto | null;
  createdAt: Date;
}
