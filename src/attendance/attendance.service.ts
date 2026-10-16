import { Injectable, Logger } from '@nestjs/common';
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
import { AlreadyCheckedInException } from './exceptions/already-checked-in.exception';
import { SaveAttendanceException } from './exceptions/save-attendance.exception';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceCrudService: AttendanceCrudService,
    private readonly attendanceValidationService: AttendanceValidationService,
    private readonly eventValidationService: EventValidationService,
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

    return this.attendanceCrudService.mapToReturnAttendanceDto(attendance, {
      ...ticket,
      status: TicketStatus.USED,
    });
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
