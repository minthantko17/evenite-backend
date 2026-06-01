import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateOrganizerProfileDto {
  @IsString()
  @MinLength(1, { message: 'Organizer name is required.' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactLineId?: string;

  @IsOptional()
  @IsUrl()
  externalUrl?: string;
}
