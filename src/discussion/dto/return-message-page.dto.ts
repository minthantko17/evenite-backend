import { ReturnMessageDto } from './return-message.dto';

export class ReturnMessagePageDto {
  messages!: ReturnMessageDto[];
  hasMoreOlder!: boolean;
  hasMoreNewer!: boolean;
  oldestCursor!: string | null; // id of oldest message in current page
  newestCursor!: string | null; // id of newest message in current page
}