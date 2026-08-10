import { EventStatus } from '@prisma/client';
import type { BilingualField } from '../../event/dto/bilingual-field.dto';
import { ReturnMessageDto } from './return-message.dto';

export class ReturnDiscussionRoomListEventDto {
  id!: string;
  title!: BilingualField;
  bannerUrl!: string;
  status!: EventStatus;
}

export class ReturnDiscussionRoomListDto {
  roomId!: string;
  event!: ReturnDiscussionRoomListEventDto;
  lastMessage!: ReturnMessageDto | null;
  unreadCount!: number;
  isReadOnly!: boolean;
}
