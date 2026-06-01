import { ReturnOrganizerProfileDto } from './return-organizer-profile.dto';
import { ReturnParticipantProfileDto } from './return-participant-profile.dto';
import { SwitchRoleDto } from './switch-role.dto';

export interface ReturnSwitchProfileDto{
    message: string;
    accessToken: string;
    profile: ReturnParticipantProfileDto | ReturnOrganizerProfileDto;
}