import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFormFieldAnswerDto {
  @IsUUID()
  formFieldId!: string;

  @IsOptional()
  @IsString()
  valueText?: string | null;

  @IsOptional()
  @IsNumber()
  valueNumber?: number | null;

  @IsOptional()
  // @IsDateString()
  valueDate?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valueArray?: string[];
}

export class CreateFormResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldAnswerDto)
  answers!: CreateFormFieldAnswerDto[];
}
