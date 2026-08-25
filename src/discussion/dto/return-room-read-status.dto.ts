export class ReturnRoomReadStatusDto {
  roomId!: string;
  lastReadMessageId!: string | null;
  lastReadSerialNumber!: number;
}
