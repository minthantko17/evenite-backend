import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateFromPromptDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}