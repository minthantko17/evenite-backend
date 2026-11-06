import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateFormFieldAnswerDto } from '../../form/dto/create-form-response.dto';

export class CreateRegistrationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldAnswerDto)
  answers!: CreateFormFieldAnswerDto[];
}
