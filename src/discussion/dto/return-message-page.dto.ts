import { ReturnMessageDto } from './return-message.dto';

export class ReturnMessagePageDto {
  messages!: ReturnMessageDto[];
  nextCursor!: string | null;
  hasMore!: boolean;
}