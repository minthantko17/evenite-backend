import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsBoolean()
  isAnnouncement?: boolean;
}
