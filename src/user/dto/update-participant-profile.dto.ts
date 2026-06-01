import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdatePreferencesDto } from './update-preferences.dto';

export class UpdateParticipantProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'First name cannot be empty.' })
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  studentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  major?: string;

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
  imageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferencesDto)
  preferences?: UpdatePreferencesDto;
}
