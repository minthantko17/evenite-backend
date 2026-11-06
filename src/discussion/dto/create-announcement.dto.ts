import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
