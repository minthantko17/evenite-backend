import { Role } from '@prisma/client';

export interface ReturnUserDto {
  id: string;
  email: string;
  currentRole: Role | null;
  isVerified: boolean;
  universityId: string;
  hasCreatedProfile: boolean;
  createdAt: Date;
}
