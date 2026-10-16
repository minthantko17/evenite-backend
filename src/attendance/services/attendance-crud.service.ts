import { Injectable } from '@nestjs/common';
import {
  Attendance,
  CheckInMethod,
  Prisma,
  Ticket,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ParticipantSnapshotDto } from '../../registration/dto/return-registrant.dto';
import { ReturnAttendanceDto } from '../dto/return-attendance.dto';
import { AttendanceTicketNotFoundException } from '../exceptions/attendance-ticket-not-found.exception';

export type TicketWithAttendance = Ticket & { attendance: Attendance | null };

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
      include: { attendance: true },
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
      include: { attendance: true },
    });
    if (!ticket) {
      throw new AttendanceTicketNotFoundException();
    }
    return ticket;
  }

  async findTicketById(ticketId: string): Promise<TicketWithAttendance> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { attendance: true },
    });
    if (!ticket) {
      throw new AttendanceTicketNotFoundException();
    }
    return ticket;
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
