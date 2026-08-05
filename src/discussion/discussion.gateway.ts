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
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { UsePipes, ValidationPipe } from '@nestjs/common';

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
    const user = this.requireUser(client);

    await this.discussionService.validateAccessOnly(
      data.roomId,
      user.currentRole!,
      user.currentRole === Role.PARTICIPANT ? user.participantProfileId! : null,
      user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
    );

    await client.join(data.roomId);
    client.emit('room:joined', { roomId: data.roomId });
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
    const user = this.requireUser(client);

    const message = await this.discussionService.sendMessage(
      data.roomId,
      data.dto,
      user.currentRole!,
      user.currentRole === Role.PARTICIPANT ? user.participantProfileId! : null,
      user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
    );

    this.server.to(data.roomId).emit('message:new', message);
  }

  // Force remove client on registration cancellation

  @OnEvent('registration.cancelled')
  async handleRegistrationCancelled(payload: {
    eventId: string;
    participantProfileId: string;
  }): Promise<void> {
    const room = await this.discussionService.findRoomByEventId(
      payload.eventId,
    );
    if (!room) return;

    await this.forceDisconnectParticipant(
      room.roomId,
      payload.participantProfileId,
    );
    this.logger.log(
      `Participant ${payload.participantProfileId} disconnected from room ${room.roomId} due to registration cancellation.`,
    );
  }

  private async forceDisconnectParticipant(
    roomId: string,
    participantProfileId: string,
  ): Promise<void> {
    const socketsInRoom = await this.server.in(roomId).fetchSockets();

    for (const remoteSocket of socketsInRoom) {
      if (
        remoteSocket.data.user?.participantProfileId === participantProfileId
      ) {
        remoteSocket.emit('room:kicked', { roomId });
        remoteSocket.leave(roomId);
      }
    }
  }
}
