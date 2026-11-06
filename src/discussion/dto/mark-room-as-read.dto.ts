import { IsOptional, IsString } from 'class-validator';

export class MarkRoomAsReadDto {
  @IsOptional()
  @IsString()
  lastReadMessageId?: string;
}
