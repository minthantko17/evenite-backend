import { ReturnMessageDto } from './return-message.dto';

// Payload for the 'chatList:update' gateway push, sent to a room's
// participants so the chat-list screen can update without a REST refetch.
// Deliberately excludes unreadCount: each client derives it locally from
// lastSerialNumber against its own cached lastReadSerialNumber, so the
// server never needs to compute per-recipient counts on every message send.
export class ChatListUpdateDto {
  roomId!: string;
  lastMessage!: ReturnMessageDto;
  lastSerialNumber!: number;
}
