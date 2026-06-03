import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
  ValidateIf,
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
  @ValidateIf((o) => o.contactEmail !== "")
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
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @ValidateIf((o) => o.externalUrl !== "")
  @IsUrl()
  externalUrl?: string;
}
