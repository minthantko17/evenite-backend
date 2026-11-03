import { IsUUID } from 'class-validator';

export class CheckInManualDto {
  @IsUUID()
  registrationId!: string;
}
