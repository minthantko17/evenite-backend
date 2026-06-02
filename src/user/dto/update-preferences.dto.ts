import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ALLOWED_PERSONAL_PREFERENCES,
  ALLOWED_LANGUAGES,
  ALLOWED_EVENT_PREFERENCES,
  PersonalPreference,
  Language,
  EventPreference,
} from '../constants/user-preferences.constant';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @IsIn([...ALLOWED_PERSONAL_PREFERENCES], { each: true })
  personal?: PersonalPreference[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  personalOther?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...ALLOWED_EVENT_PREFERENCES], { each: true })
  event?: EventPreference[];

  @IsOptional()
  @IsArray()
  @IsIn([...ALLOWED_LANGUAGES], { each: true })
  language?: Language[];
}