import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Role, TicketStatus } from '@prisma/client';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import {
  buildPersonalChannel,
  extractTokenFromHandshake,
  socketCorsOptions,
} from '../common/utils/socket.utils';
import type {
  AttendanceCheckedInPayload,
  AttendanceUndonePayload,
} from '../attendance/events/attendance.events';
import type {
  RegistrationCancelledPayload,
  RegistrationCreatedPayload,
} from '../registration/events/registration.events';
import type { FeedbackSubmittedPayload } from '../form/events/form.events';

// why an analytics dashboard should refetch (a hint only: the client always refetches the whole payload)
type AnalyticsChangeReason = 'attendance' | 'registration' | 'feedback';

// General per-user push channel (attendance and analytics now; notifications later). Clients only connect; they receive messages on their
// personal channel, so no room-join protocol is needed.
@WebSocketGateway({ namespace: 'realtime', cors: socketCorsOptions })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = extractTokenFromHandshake(client);
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(
        token,
        { secret: process.env.JWT_ACCESS_SECRET! },
      );
      (client.data as { user?: JwtAccessPayload }).user = payload;

      const personalChannel = buildPersonalChannel(
        payload.currentRole,
        payload.currentRole === Role.PARTICIPANT
          ? payload.participantProfileId
          : payload.organizerProfileId,
      );
      if (personalChannel) {
        await client.join(personalChannel);
      }

      this.logger.log(
        `Realtime socket connected: ${client.id}, user: ${payload.sub}`,
      );
    } catch {
      this.logger.warn(
        `Rejected unauthenticated realtime socket connection: ${client.id}`,
      );
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Realtime socket disconnected: ${client.id}`);
  }

  // Attendance

  @OnEvent('attendance.checked-in')
  handleAttendanceCheckedIn(payload: AttendanceCheckedInPayload): void {
    const { attendance } = payload;

    // organizer dashboards (every device): list row + live counts
    this.emitToUser(
      Role.ORGANIZER,
      payload.organizerProfileId,
      'attendance:checkedIn',
      {
        eventId: payload.eventId,
        attendanceId: attendance.id,
        registrationId: attendance.registrationId,
        method: attendance.method,
        checkedInAt: attendance.checkedInAt,
        participantSnapshot: attendance.participantSnapshot,
        counts: payload.counts,
      },
    );

    this.nudgeAnalytics(
      payload.organizerProfileId,
      payload.eventId,
      'attendance',
    );

    // participant's ticket flips to USED
    this.emitToUser(
      Role.PARTICIPANT,
      payload.participantProfileId,
      'ticket:statusChanged',
      {
        eventId: payload.eventId,
        registrationId: attendance.registrationId,
        ticketId: attendance.ticket.id,
        status: TicketStatus.USED,
        checkedInAt: attendance.checkedInAt,
      },
    );
  }

  @OnEvent('attendance.undone')
  handleAttendanceUndone(payload: AttendanceUndonePayload): void {
    this.nudgeAnalytics(
      payload.organizerProfileId,
      payload.eventId,
      'attendance',
    );

    this.emitToUser(
      Role.ORGANIZER,
      payload.organizerProfileId,
      'attendance:undone',
      {
        eventId: payload.eventId,
        registrationId: payload.registrationId,
        counts: payload.counts,
      },
    );

    this.emitToUser(
      Role.PARTICIPANT,
      payload.participantProfileId,
      'ticket:statusChanged',
      {
        eventId: payload.eventId,
        registrationId: payload.registrationId,
        ticketId: payload.ticketId,
        status: TicketStatus.ACTIVE,
        checkedInAt: null,
      },
    );
  }

  // Analytics nudges
  // A nudge carries no data: it tells an open analytics dashboard "something changed
  // for this event", and the client refetches GET /events/:eventId/analytics (debounced
  // client-side). Attendance nudges are sent by the attendance handlers above.

  @OnEvent('registration.created')
  handleRegistrationCreated(payload: RegistrationCreatedPayload): void {
    this.nudgeAnalytics(
      payload.organizerProfileId,
      payload.eventId,
      'registration',
    );
  }

  @OnEvent('registration.cancelled')
  handleRegistrationCancelled(payload: RegistrationCancelledPayload): void {
    this.nudgeAnalytics(
      payload.organizerProfileId,
      payload.eventId,
      'registration',
    );
  }

  @OnEvent('feedback.submitted')
  handleFeedbackSubmitted(payload: FeedbackSubmittedPayload): void {
    this.nudgeAnalytics(
      payload.organizerProfileId,
      payload.eventId,
      'feedback',
    );
  }

  private nudgeAnalytics(
    organizerProfileId: string,
    eventId: string,
    reason: AnalyticsChangeReason,
  ): void {
    this.emitToUser(Role.ORGANIZER, organizerProfileId, 'analytics:changed', {
      eventId,
      reason,
    });
  }

  private emitToUser(
    role: Role,
    profileId: string,
    message: string,
    data: unknown,
  ): void {
    const channel = buildPersonalChannel(role, profileId);
    if (!channel) return;
    this.server.to(channel).emit(message, data);
  }
}
