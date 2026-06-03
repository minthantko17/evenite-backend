import {
  IsOptional, IsBoolean, IsString, IsInt,
  IsArray, Min, IsUUID, IsUrl, IsEmail, IsEnum,
  ValidateIf,
  IsDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { BilingualField } from './bilingual-field.dto';
import type { AgendaItem } from './agenda-item.dto';
import { EventCategory, ALLOWED_CATEGORIES } from '../constants/event-category.constant';

export class SaveDraftDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  title?: BilingualField;

  @IsOptional()
  description?: BilingualField;

  @IsOptional()
  @IsArray()
  @IsEnum(ALLOWED_CATEGORIES, { each: true })
  category?: EventCategory[];

  @IsOptional()
  location?: BilingualField;

  @IsOptional()
  @ValidateIf((o) => o.mapLink !== "")
  @IsUrl()
  mapLink?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  })
  @IsOptional()
  @IsDate()
  startAt?: Date;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  })
  @IsOptional()
  @IsDate()
  endAt?: Date;

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