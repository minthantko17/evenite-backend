import {
  IsArray,
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
  value?: string | number | string[] | null;
}

export class CreateFormResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldAnswerDto)
  answers!: CreateFormFieldAnswerDto[];
}
