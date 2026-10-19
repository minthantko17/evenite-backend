import { Injectable } from '@nestjs/common';
import {
  Attendance,
  CheckInMethod,
  Prisma,
  RegistrationStatus,
  Ticket,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ParticipantSnapshotDto } from '../../registration/dto/return-registrant.dto';
import { ReturnAttendanceDto } from '../dto/return-attendance.dto';
import {
  ReturnAttendanceListDto,
  ReturnAttendanceListItemDto,
  ReturnAttendanceSummaryDto,
} from '../dto/return-attendance-list.dto';
import { AttendanceTicketNotFoundException } from '../exceptions/attendance-ticket-not-found.exception';
import { AttendanceNotFoundException } from '../exceptions/attendance-not-found.exception';

// participantId is needed to notify the participant's own socket channel
export type TicketWithRegistration = Ticket & {
  eventRegistration: { participantId: string };
};
export type TicketWithAttendance = TicketWithRegistration & {
  attendance: Attendance | null;
};
export type AttendanceWithTicket = Attendance & {
  ticket: TicketWithRegistration;
};

const REGISTRATION_PARTICIPANT = {
  eventRegistration: { select: { participantId: true } },
} as const;

@Injectable()
export class AttendanceCrudService {
  constructor(private readonly prisma: PrismaService) {}

  // returns tx if provided, falls back to prisma — allows methods to work inside or outside transaction
  private getClient(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  // ticket must belong to the event, otherwise it's reported as not found
  async findTicketByQrToken(
    eventId: string,
    qrToken: string,
  ): Promise<TicketWithAttendance> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { qrToken, eventRegistration: { eventId } },
      include: { attendance: true, ...REGISTRATION_PARTICIPANT },
    });
    if (!ticket) {
      throw new AttendanceTicketNotFoundException();
    }
    return ticket;
  }

  async findTicketByRegistrationId(
    eventId: string,
    registrationId: string,
  ): Promise<TicketWithAttendance> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        eventRegistrationId: registrationId,
        eventRegistration: { eventId },
      },
      include: { attendance: true, ...REGISTRATION_PARTICIPANT },
    });
    if (!ticket) {
      throw new AttendanceTicketNotFoundException();
    }
    return ticket;
  }

  async findTicketById(ticketId: string): Promise<TicketWithAttendance> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { attendance: true, ...REGISTRATION_PARTICIPANT },
    });
    if (!ticket) {
      throw new AttendanceTicketNotFoundException();
    }
    return ticket;
  }

  // CONFIRMED registrations only: cancelled ones can't be checked in
  async getAttendanceListByEvent(
    eventId: string,
  ): Promise<ReturnAttendanceListDto> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        eventRegistration: { eventId, status: RegistrationStatus.CONFIRMED },
      },
      include: { attendance: true, ...REGISTRATION_PARTICIPANT },
      orderBy: { eventRegistration: { createdAt: 'asc' } },
    });

    const items = tickets.map((ticket) => this.mapToListItemDto(ticket));
    return {
      summary: {
        registered: items.length,
        checkedIn: items.filter((item) => item.attendance !== null).length,
      },
      items,
    };
  }

  // live counts for dashboards and socket payloads
  async getAttendanceSummary(
    eventId: string,
  ): Promise<ReturnAttendanceSummaryDto> {
    const [registered, checkedIn] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          eventRegistration: { eventId, status: RegistrationStatus.CONFIRMED },
        },
      }),
      this.prisma.attendance.count({ where: { eventId } }),
    ]);
    return { registered, checkedIn };
  }

  // attendance must belong to the event, otherwise it's reported as not found
  async findAttendanceById(
    eventId: string,
    attendanceId: string,
  ): Promise<AttendanceWithTicket> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, eventId },
      include: { ticket: { include: REGISTRATION_PARTICIPANT } },
    });
    if (!attendance) {
      throw new AttendanceNotFoundException();
    }
    return attendance;
  }

  // NOTE: only flips ACTIVE -> USED, so of two concurrent check-ins on the
  // same ticket exactly one gets `true`. Call inside a transaction together
  // with createAttendance.
  async markTicketUsed(
    ticketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.getClient(tx).ticket.updateMany({
      where: { id: ticketId, status: TicketStatus.ACTIVE },
      data: { status: TicketStatus.USED },
    });
    return result.count === 1;
  }

  async createAttendance(
    ticketId: string,
    eventId: string,
    organizerProfileId: string,
    method: CheckInMethod,
    tx?: Prisma.TransactionClient,
  ): Promise<Attendance> {
    return this.getClient(tx).attendance.create({
      data: {
        ticketId,
        eventId,
        checkedInById: organizerProfileId,
        method,
      },
    });
  }

  async deleteAttendance(
    attendanceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).attendance.delete({ where: { id: attendanceId } });
  }

  // only flips USED -> ACTIVE (undo of markTicketUsed)
  async reactivateTicket(
    ticketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).ticket.updateMany({
      where: { id: ticketId, status: TicketStatus.USED },
      data: { status: TicketStatus.ACTIVE },
    });
  }

  mapToListItemDto(ticket: TicketWithAttendance): ReturnAttendanceListItemDto {
    return {
      registrationId: ticket.eventRegistrationId,
      ticket: { id: ticket.id, status: ticket.status },
      participantSnapshot:
        ticket.participantSnapshot as unknown as ParticipantSnapshotDto,
      attendance: ticket.attendance
        ? {
            id: ticket.attendance.id,
            method: ticket.attendance.method,
            checkedInAt: ticket.attendance.checkedInAt,
          }
        : null,
    };
  }

  mapToReturnAttendanceDto(
    attendance: Attendance,
    ticket: Ticket,
  ): ReturnAttendanceDto {
    return {
      id: attendance.id,
      registrationId: ticket.eventRegistrationId,
      method: attendance.method,
      checkedInAt: attendance.checkedInAt,
      ticket: { id: ticket.id, status: ticket.status },
      participantSnapshot:
        ticket.participantSnapshot as unknown as ParticipantSnapshotDto,
    };
  }
}
