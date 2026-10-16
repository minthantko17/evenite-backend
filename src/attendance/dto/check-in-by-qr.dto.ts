import { IsUUID } from 'class-validator';

export class CheckInByQrDto {
  @IsUUID()
  qrToken!: string;
}
