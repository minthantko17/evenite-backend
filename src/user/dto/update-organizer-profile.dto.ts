import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateOrganizerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Organizer name cannot be empty.' })
  @MaxLength(100)
  name?: string;

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
