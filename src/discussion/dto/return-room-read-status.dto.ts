export class ReturnRoomReadStatusDto {
  roomId!: string;
  lastReadAt!: Date;
  lastReadMessageId!: string | null;
}
