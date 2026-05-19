import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { FormType, FieldType } from '@prisma/client';

export class FormFieldInputDto {
  @IsEnum(FieldType)
  type!: FieldType;

  @IsString()
  label!: string;

  @IsOptional()
  isRequired?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  autoFillKey?: string | null;
}

export class CreateFormDto {
  @IsEnum(FormType)
  type!: FormType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormFieldInputDto)
  fields!: FormFieldInputDto[];
}