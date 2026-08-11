import { Role } from '@prisma/client';

export class ReturnMessageSenderDto {
  id!: string;
  role!: Role;
  name!: string;
  imageUrl!: string;
}

export class ReturnMessageDto {
  id!: string;
  content!: string;
  isAnnouncement!: boolean;
  sender!: ReturnMessageSenderDto;
  createdAt!: Date;
}