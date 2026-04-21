import { IsNotEmpty, IsArray, 
    IsBoolean, IsOptional, IsDate, 
    IsInt, IsString, ValidateIf, Min } from "class-validator";
import type { BilingualField } from "./bilingual-field.dto";
import type { AgendaItem } from "./agenda-item.dto";
import { EventCategory } from "../constants/event-category.constant";
import { Type } from "class-transformer";

export class PublishEventDto {
  @IsNotEmpty()
  title!: BilingualField;

  @IsNotEmpty()
  description!: BilingualField;

  @IsNotEmpty()
  @IsArray()
  category!: EventCategory[];

  @ValidateIf(o => !o.isOnline)
  @IsNotEmpty()
  location?: BilingualField;

  @IsOptional()
  @IsString()
  mapLink?: string;

  @IsNotEmpty()
  @IsBoolean()
  isOnline!: boolean;

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

  @IsNotEmpty()
  @IsBoolean()
  hasCatering!: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isCateringFree!: boolean;

  @IsOptional()
  cateringDescription?: BilingualField;

  @IsOptional()
  @IsArray()
  agenda?: AgendaItem[];

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactLineId?: string;

  @IsOptional()
  @IsString()
  externalRegistrationUrl?: string;

  @IsOptional()
  remarks?: BilingualField;

  @IsOptional()
  @IsString()
  bannerUrl?: string;
}