import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Attendance,
  CheckInMethod,
  Prisma,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventValidationService } from '../event/services/event-validation.service';
import {
  AttendanceCrudService,
  TicketWithAttendance,
} from './services/attendance-crud.service';
import { AttendanceValidationService } from './services/attendance-validation.service';
import { ReturnAttendanceDto } from './dto/return-attendance.dto';
import {
  ReturnAttendanceListDto,
  ReturnAttendanceListItemDto,
} from './dto/return-attendance-list.dto';
import { AlreadyCheckedInException } from './exceptions/already-checked-in.exception';
import { SaveAttendanceException } from './exceptions/save-attendance.exception';
import { AttendanceNotFoundException } from './exceptions/attendance-not-found.exception';
import type {
  AttendanceCheckedInPayload,
  AttendanceUndonePayload,
} from './events/attendance.events';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceCrudService: AttendanceCrudService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly eventValidationService: EventValidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async checkInByQrToken(
    eventId: string,
    qrToken: string,
    organizerProfileId: string,
  ): Promise<ReturnAttendanceDto> {
    await this.validateEventAccess(eventId, organizerProfileId);
    const ticket = await this.attendanceCrudService.findTicketByQrToken(
      eventId,
      qrToken,
    );
    return this.checkIn(
      ticket,
      eventId,
      organizerProfileId,
      CheckInMethod.QR_SCAN,
    );
  }

  async checkInManually(
    eventId: string,
    registrationId: string,
    organizerProfileId: string,
  ): Promise<ReturnAttendanceDto> {
    await this.validateEventAccess(eventId, organizerProfileId);
    const ticket = await this.attendanceCrudService.findTicketByRegistrationId(
      eventId,
      registrationId,
    );
    return this.checkIn(
      ticket,
      eventId,
      organizerProfileId,
      CheckInMethod.MANUAL,
    );
  }

  async getAttendanceList(
    eventId: string,
    organizerProfileId: string,
  ): Promise<ReturnAttendanceListDto> {
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    return this.attendanceCrudService.getAttendanceListByEvent(eventId);
  }

  // hard delete: removes the attendance record and makes the ticket usable again
  async undoCheckIn(
    eventId: string,
    attendanceId: string,
    organizerProfileId: string,
  ): Promise<ReturnAttendanceListItemDto> {
    await this.validateEventAccess(eventId, organizerProfileId);
    const attendance = await this.attendanceCrudService.findAttendanceById(
      eventId,
      attendanceId,
    );
    await this.attendanceValidationService.validateNoFeedbackSubmitted(
      attendance.ticket.eventRegistrationId,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        const deleted = await this.attendanceCrudService.deleteAttendance(
          attendance.id,
          tx,
        );
        // another undo removed it between our read and this delete
        if (!deleted) throw new AttendanceNotFoundException();
        await this.attendanceCrudService.reactivateTicket(
          attendance.ticketId,
          tx,
        );
      });
    } catch (error) {
      if (error instanceof AttendanceNotFoundException) throw error;
      this.logger.error('Failed to undo check-in', error);
      throw new SaveAttendanceException();
    }

    await this.emitUndone(
      eventId,
      organizerProfileId,
      attendance.ticket.eventRegistration.participantId,
      attendance.ticket.eventRegistrationId,
      attendance.ticketId,
    );

    return this.attendanceCrudService.mapToListItemDto({
      ...attendance.ticket,
      status: TicketStatus.ACTIVE,
      attendance: null,
    });
  }

  // organizer must own the event and the event must still accept check-ins
  private async validateEventAccess(
    eventId: string,
    organizerProfileId: string,
  ): Promise<void> {
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const event =
      await this.eventValidationService.validateEventExists(eventId);
    this.attendanceValidationService.validateEventCheckable(event.status);
  }

  // shared by QR and manual check-in
  private async checkIn(
    ticket: TicketWithAttendance,
    eventId: string,
    organizerProfileId: string,
    method: CheckInMethod,
  ): Promise<ReturnAttendanceDto> {
    this.assertTicketCheckable(ticket);

    let attendance: Attendance | null = null;
    try {
      attendance = await this.prisma.$transaction(async (tx) => {
        const claimed = await this.attendanceCrudService.markTicketUsed(
          ticket.id,
          tx,
        );
        // another check-in claimed this ticket first
        if (!claimed) return null;
        return this.attendanceCrudService.createAttendance(
          ticket.id,
          eventId,
          organizerProfileId,
          method,
          tx,
        );
      });
    } catch (error) {
      // unique violation on ticketId also means a concurrent check-in won
      if (!this.isUniqueViolation(error)) {
        this.logger.error('Failed to save check-in', error);
        throw new SaveAttendanceException();
      }
    }

    if (!attendance) {
      // lost the race: re-read so the response reflects the winner's check-in
      const latest = await this.attendanceCrudService.findTicketById(ticket.id);
      this.assertTicketCheckable(latest);
      throw new SaveAttendanceException();
    }

    const result = this.attendanceCrudService.mapToReturnAttendanceDto(
      attendance,
      { ...ticket, status: TicketStatus.USED },
    );
    await this.emitCheckedIn(
      eventId,
      organizerProfileId,
      ticket.eventRegistration.participantId,
      result,
    );
    return result;
  }

  // realtime is best-effort: a failure here must never fail the check-in
  private async emitCheckedIn(
    eventId: string,
    organizerProfileId: string,
    participantProfileId: string,
    attendance: ReturnAttendanceDto,
  ): Promise<void> {
    try {
      const counts =
        await this.attendanceCrudService.getAttendanceSummary(eventId);
      const payload: AttendanceCheckedInPayload = {
        eventId,
        organizerProfileId,
        participantProfileId,
        attendance,
        counts,
      };
      this.eventEmitter.emit('attendance.checked-in', payload);
    } catch (error) {
      this.logger.warn('Failed to emit attendance.checked-in', error);
    }
  }

  private async emitUndone(
    eventId: string,
    organizerProfileId: string,
    participantProfileId: string,
    registrationId: string,
    ticketId: string,
  ): Promise<void> {
    try {
      const counts =
        await this.attendanceCrudService.getAttendanceSummary(eventId);
      const payload: AttendanceUndonePayload = {
        eventId,
        organizerProfileId,
        participantProfileId,
        registrationId,
        ticketId,
        counts,
      };
      this.eventEmitter.emit('attendance.undone', payload);
    } catch (error) {
      this.logger.warn('Failed to emit attendance.undone', error);
    }
  }

  // USED -> 409 with the original attendance, CANCELLED/EXPIRED -> 422
  private assertTicketCheckable(ticket: TicketWithAttendance): void {
    if (ticket.status === TicketStatus.USED && ticket.attendance) {
      throw new AlreadyCheckedInException(
        this.attendanceCrudService.mapToReturnAttendanceDto(
          ticket.attendance,
          ticket,
        ),
      );
    }
    this.attendanceValidationService.validateTicketActive(ticket.status);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
