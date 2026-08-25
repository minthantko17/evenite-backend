import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { DiscussionService } from './discussion.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ChatListUpdateDto } from './dto/chat-list-update.dto';
import { ReturnMessageDto } from './dto/return-message.dto';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { RoomNotFoundException } from './exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from './exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from './exceptions/room-read-only.exception';
import { MessageContentInvalidException } from './exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from './exceptions/announcement-not-allowed.exception';
import { RegistrationNotFoundException } from '../registration/exceptions/registration-not-found.exception';
import { DiscussionErrorCode } from './constants/discussion-error-code.enum';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({
  namespace: 'discussion',
  cors: { origin: 'http://localhost:5173', credentials: true },
})
export class DiscussionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DiscussionGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly discussionService: DiscussionService,
    private readonly jwtService: JwtService,
  ) {}

  // Connections

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractTokenFromHandshake(client);
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET!,
        },
      );
      client.data.user = payload; // store payload in socket data

      // joins a personal channel (independent of any discussion room)
      // to update chat-list display even when user haven't joined a specific room's socket.io room
      const personalChannel = this.getPersonalChannel(
        payload.currentRole,
        payload.currentRole === Role.PARTICIPANT
          ? payload.participantProfileId
          : payload.organizerProfileId,
      );
      if (personalChannel) {
        await client.join(personalChannel);
      }

      this.logger.log(`Socket connected: ${client.id}, user: ${payload.sub}`);
    } catch {
      this.logger.warn(
        `Rejected unauthenticated socket connection: ${client.id}`,
      );
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  // per-user socket.io room name, independent of any discussion room —
  // socket.io fans this out to all of a user's connected devices/tabs for free
  private getPersonalChannel(
    role: Role | null,
    profileId: string | null,
  ): string | null {
    if (!role || !profileId) {
      return null;
    }
    return `user:${role}:${profileId}`;
  }

  private extractTokenFromHandshake(client: Socket): string {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    return token;
  }

  // check if the socket has user payload
  private requireUser(client: Socket): JwtAccessPayload {
    if (!client.data.user) {
      throw new UnauthorizedException('Socket not authenticated');
    }
    return client.data.user;
  }

  // Room join and leave

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    try {
      const user = this.requireUser(client);

      await this.discussionService.authorizeRoomJoinAccess(
        data.roomId,
        user.currentRole!,
        user.currentRole === Role.PARTICIPANT
          ? user.participantProfileId!
          : null,
        user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
      );

      await client.join(data.roomId);
      client.emit('room:joined', { roomId: data.roomId });
    } catch (error) {
      this.emitError(client, 'room:join', error);
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    await client.leave(data.roomId);
  }

  // send message

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; dto: CreateMessageDto },
  ): Promise<void> {
    try {
      const user = this.requireUser(client);
      const message = await this.discussionService.sendMessage(
        data.roomId,
        data.dto,
        user.currentRole!,
        user.currentRole === Role.PARTICIPANT
          ? user.participantProfileId!
          : null,
        user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
      );
      this.server.to(data.roomId).emit('message:new', message);
      await this.pushChatListUpdate(data.roomId, message);
    } catch (error) {
      this.emitError(client, 'message:send', error);
    }
  }

  // send announcement

  @SubscribeMessage('announcement:send')
  async handleSendAnnouncement(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; dto: CreateAnnouncementDto },
  ): Promise<void> {
    try {
      const user = this.requireUser(client);
      const announcement = await this.discussionService.sendAnnouncement(
        data.roomId,
        data.dto,
        user.currentRole!,
        user.currentRole === Role.PARTICIPANT
          ? user.participantProfileId!
          : null,
        user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
      );
      this.server.to(data.roomId).emit('message:new', announcement);
      this.server.to(data.roomId).emit('announcement:new', announcement);
      await this.pushChatListUpdate(data.roomId, announcement);
    } catch (error) {
      this.emitError(client, 'announcement:send', error);
    }
  }

  // pushes to every room member's personal channel for chat-list screen updates live
  private async pushChatListUpdate(
    roomId: string,
    message: ReturnMessageDto,
  ): Promise<void> {
    const { organizerProfileId, participantProfileIds } =
      await this.discussionService.getRoomMemberIds(roomId);

    const channels = [
      this.getPersonalChannel(Role.ORGANIZER, organizerProfileId),
      ...participantProfileIds.map((participantProfileId) =>
        this.getPersonalChannel(Role.PARTICIPANT, participantProfileId),
      ),
    ].filter((channel): channel is string => channel !== null);

    const payload: ChatListUpdateDto = {
      roomId,
      lastMessage: message,
      lastSerialNumber: message.serialNumber,
    };
    this.server.to(channels).emit('chatList:update', payload);
  }

  // Read status — pushed so other open tabs/devices for the same user clear
  // their unread badge without a REST refetch
  @OnEvent('room.read-updated')
  handleRoomReadUpdated(payload: {
    roomId: string;
    role: Role;
    participantProfileId: string | null;
    organizerProfileId: string | null;
    lastReadSerialNumber: number;
  }): void {
    const channel = this.getPersonalChannel(
      payload.role,
      payload.role === Role.PARTICIPANT
        ? payload.participantProfileId
        : payload.organizerProfileId,
    );
    if (!channel) {
      return;
    }
    this.server.to(channel).emit('chatList:read', {
      roomId: payload.roomId,
      lastReadSerialNumber: payload.lastReadSerialNumber,
    });
  }

  // Force remove client on registration cancellation

  @OnEvent('registration.cancelled')
  async handleRegistrationCancelled(payload: {
    eventId: string;
    participantProfileId: string;
  }): Promise<void> {
    try {
      const room = await this.discussionService.findRoomByEventId(
        payload.eventId,
      );
      if (!room){
        this.logger.warn(
          `No discussion room found for event ${payload.eventId}. Cannot disconnect participant ${payload.participantProfileId}.`,
        );
        return;
      }

      const disconnectResult = await this.forceDisconnectParticipant(
        room.roomId,
        payload.participantProfileId,
      );
      this.logger.log(
        disconnectResult.message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle registration cancellation for participant ${payload.participantProfileId} in event ${payload.eventId}: ${error}`,
      );
    }
  }

  private async forceDisconnectParticipant(
    roomId: string,
    participantProfileId: string,
  ): Promise<{message: string}> {
    const socketsInRoom = await this.server.in(roomId).fetchSockets();
    if(socketsInRoom.length === 0) {
      return { message: `No room sockets found.` };
    }

    for (const remoteSocket of socketsInRoom) {
      if (
        remoteSocket.data.user?.participantProfileId === participantProfileId
      ) {
        remoteSocket.emit('room:kicked', { roomId });
        remoteSocket.leave(roomId);
        return { message: `Participant ${participantProfileId} disconnected from room ${roomId}` };
      }
    }
    return { message: `No participant with profile ID ${participantProfileId} found in room ${roomId}` };
  }

  private resolveErrorCode(error: unknown): DiscussionErrorCode {
    if (error instanceof RoomNotFoundException)
      return DiscussionErrorCode.ROOM_NOT_FOUND;
    if (error instanceof RoomAccessDeniedException)
      return DiscussionErrorCode.ROOM_ACCESS_DENIED;
    if (error instanceof RegistrationNotFoundException)
      return DiscussionErrorCode.REGISTRATION_NOT_FOUND;
    if (error instanceof RoomReadOnlyException)
      return DiscussionErrorCode.ROOM_READ_ONLY;
    if (error instanceof MessageContentInvalidException)
      return DiscussionErrorCode.MESSAGE_CONTENT_INVALID;
    if (error instanceof AnnouncementNotAllowedException)
      return DiscussionErrorCode.ANNOUNCEMENT_NOT_ALLOWED;
    if (error instanceof UnauthorizedException)
      return DiscussionErrorCode.UNAUTHORIZED;
    return DiscussionErrorCode.UNKNOWN_ERROR;
  }

  private emitError(client: Socket, event: string, error: unknown): void {
    client.emit('error', {
      event,
      code: this.resolveErrorCode(error),
      message:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.',
    });
  }
}
