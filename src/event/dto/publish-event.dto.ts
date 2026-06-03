import {
  IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsDate, IsInt, IsString, ValidateIf, Min,
  IsUUID, IsUrl, IsEmail, IsEnum,
} from 'class-validator';
import type { BilingualField } from './bilingual-field.dto';
import type { AgendaItem } from './agenda-item.dto';
import { EventCategory, ALLOWED_CATEGORIES } from '../constants/event-category.constant';
import { Type } from 'class-transformer';

export class PublishEventDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  title!: BilingualField;

  @IsNotEmpty()
  description!: BilingualField;

  @IsNotEmpty()
  @IsArray()
  @IsEnum(ALLOWED_CATEGORIES, { each: true })
  category!: EventCategory[];

  @ValidateIf((o) => !o.isOnline)
  @IsNotEmpty()
  location?: BilingualField;

  @IsOptional()
  @ValidateIf((o) => o.mapLink !== "")
  @IsUrl()
  mapLink?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  seatLimit?: number;

  @IsOptional()
  @IsBoolean()
  hasCatering?: boolean;

  @IsOptional()
  @IsBoolean()
  isCateringFree?: boolean;

  @IsOptional()
  cateringDescription?: BilingualField;

  @IsOptional()
  @IsArray()
  agenda?: AgendaItem[];

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @ValidateIf((o) => o.contactEmail !== "")
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactLineId?: string;

  @IsOptional()
  @ValidateIf((o) => o.externalUrl !== "")
  @IsUrl()
  externalUrl?: string;

  @IsOptional()
  remarks?: BilingualField;

  @IsOptional()
  @IsString()
  bannerUrl?: string;
}