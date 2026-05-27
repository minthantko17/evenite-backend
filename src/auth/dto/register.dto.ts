import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters.' })
  password!: string;

  @IsString()
  @MinLength(1, { message: 'First name is required.' })
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
