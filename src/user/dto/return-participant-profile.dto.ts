import { UserPreferences } from '../constants/user-preferences.constant';

export interface ReturnParticipantProfileDto {
  id: string;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  studentId: string | null;
  major: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLineId: string | null;
  imageUrl: string | null;
  preferences: UserPreferences | null;
  createdAt: Date;
}
