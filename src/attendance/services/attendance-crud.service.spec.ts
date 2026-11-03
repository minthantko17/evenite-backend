/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';
import {
  CheckInMethod,
  Prisma,
  RegistrationStatus,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceCrudService } from './attendance-crud.service';
import { AttendanceTicketNotFoundException } from '../exceptions/attendance-ticket-not-found.exception';
import { AttendanceNotFoundException } from '../exceptions/attendance-not-found.exception';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';
import {
  EVENT_ID,
  ORGANIZER_ID,
  QR_TOKEN,
  CHECKED_IN_AT,
  SNAPSHOT,
  REGISTRATION_PARTICIPANT,
  buildAttendance,
  buildTicket,
  buildTicketWithAttendance,
  buildAttendanceWithTicket,
  expectedListItem,
} from './attendance-crud.service.mock-db';

// This spec sources its fixtures from ./attendance-crud.service.mock-db.ts —
// row builders for tickets / attendance records and the list-item DTO they
// should map to. PrismaService and the transaction client are mocked; each
// test sets the exact Prisma response it needs and also asserts the query
// that was sent (event scoping, status filter, includes), since that is where
// this service's logic lives.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, regular cases come first, followed by error
// cases and edge cases that document current behavior.

const prismaMock = mockDeep<PrismaService>();
const txMock = mockDeep<Prisma.TransactionClient>();

const INCLUDE_TICKET_DETAILS = {
  attendance: true,
  ...REGISTRATION_PARTICIPANT,
};

describe('AttendanceCrudService', () => {
  let service: AttendanceCrudService;

  beforeEach(async () => {
    mockReset(prismaMock);
    mockReset(txMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceCrudService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AttendanceCrudService>(AttendanceCrudService);
  });

  // ==========================================================================
  // findTicketByQrToken
  // ==========================================================================
  describe('findTicketByQrToken', () => {
    it('UT-findTicketByQrToken-01: ticket without attendance — returns it, queried by token and event with attendance and participant included', async () => {
      const input = { eventId: EVENT_ID, qrToken: QR_TOKEN };
      const ticket = buildTicketWithAttendance('a');
      (prismaMock.ticket.findFirst as jest.Mock).mockResolvedValue(ticket);
      const expected = ticket;

      const actual = await service.findTicketByQrToken(
        input.eventId,
        input.qrToken,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith({
        where: { qrToken: QR_TOKEN, eventRegistration: { eventId: EVENT_ID } },
        include: INCLUDE_TICKET_DETAILS,
      });
    });

    it('UT-findTicketByQrToken-02: ticket that already has an attendance record — returns it with the attendance', async () => {
      const input = { eventId: EVENT_ID, qrToken: QR_TOKEN };
      const ticket = buildTicketWithAttendance('a', buildAttendance('a'), {
        status: TicketStatus.USED,
      });
      (prismaMock.ticket.findFirst as jest.Mock).mockResolvedValue(ticket);
      const expected = ticket;

      const actual = await service.findTicketByQrToken(
        input.eventId,
        input.qrToken,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-findTicketByQrToken-03: no ticket for that token in the event — throws AttendanceTicketNotFoundException (TICKET_NOT_FOUND)', async () => {
      const input = { eventId: EVENT_ID, qrToken: 'unknown-token' };
      (prismaMock.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      const expected = {
        message: 'Ticket not found for this event.',
        errorCode: AttendanceErrorCode.TICKET_NOT_FOUND,
      };

      const actual: unknown = await service
        .findTicketByQrToken(input.eventId, input.qrToken)
        .catch((error: unknown) => error);
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AttendanceTicketNotFoundException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
    });
  });

  // ==========================================================================
  // findTicketByRegistrationId
  // ==========================================================================
  describe('findTicketByRegistrationId', () => {
    it('UT-findTicketByRegistrationId-01: ticket found — returns it, queried by registration and event with attendance and participant included', async () => {
      const input = { eventId: EVENT_ID, registrationId: 'registration-a' };
      const ticket = buildTicketWithAttendance('a');
      (prismaMock.ticket.findFirst as jest.Mock).mockResolvedValue(ticket);
      const expected = ticket;

      const actual = await service.findTicketByRegistrationId(
        input.eventId,
        input.registrationId,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith({
        where: {
          eventRegistrationId: 'registration-a',
          eventRegistration: { eventId: EVENT_ID },
        },
        include: INCLUDE_TICKET_DETAILS,
      });
    });

    it('UT-findTicketByRegistrationId-02: no ticket for that registration in the event — throws AttendanceTicketNotFoundException (TICKET_NOT_FOUND)', async () => {
      const input = { eventId: EVENT_ID, registrationId: 'unknown' };
      (prismaMock.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      const expected = {
        message: 'Ticket not found for this event.',
        errorCode: AttendanceErrorCode.TICKET_NOT_FOUND,
      };

      const actual: unknown = await service
        .findTicketByRegistrationId(input.eventId, input.registrationId)
        .catch((error: unknown) => error);
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AttendanceTicketNotFoundException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
    });
  });

  // ==========================================================================
  // findTicketById
  // ==========================================================================
  describe('findTicketById', () => {
    it('UT-findTicketById-01: ticket found — returns it, looked up by id with attendance and participant included', async () => {
      const input = { ticketId: 'ticket-a' };
      const ticket = buildTicketWithAttendance('a');
      (prismaMock.ticket.findUnique as jest.Mock).mockResolvedValue(ticket);
      const expected = ticket;

      const actual = await service.findTicketById(input.ticketId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-a' },
        include: INCLUDE_TICKET_DETAILS,
      });
    });

    it('UT-findTicketById-02: no such ticket — throws AttendanceTicketNotFoundException (TICKET_NOT_FOUND)', async () => {
      const input = { ticketId: 'missing' };
      (prismaMock.ticket.findUnique as jest.Mock).mockResolvedValue(null);
      const expected = {
        message: 'Ticket not found for this event.',
        errorCode: AttendanceErrorCode.TICKET_NOT_FOUND,
      };

      const actual: unknown = await service
        .findTicketById(input.ticketId)
        .catch((error: unknown) => error);
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AttendanceTicketNotFoundException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
    });
  });

  // ==========================================================================
  // getAttendanceListByEvent
  // ==========================================================================
  describe('getAttendanceListByEvent', () => {
    it('UT-getAttendanceListByEvent-01: some tickets checked in — items keep the returned order and the summary counts registered and checked in', async () => {
      const input = { eventId: EVENT_ID };
      const tickets = [
        buildTicketWithAttendance('a', buildAttendance('a'), {
          status: TicketStatus.USED,
        }),
        buildTicketWithAttendance('b'),
        buildTicketWithAttendance('c'),
      ];
      (prismaMock.ticket.findMany as jest.Mock).mockResolvedValue(tickets);
      const expected = {
        summary: { registered: 3, checkedIn: 1 },
        items: tickets.map(expectedListItem),
      };

      const actual = await service.getAttendanceListByEvent(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
        where: {
          eventRegistration: {
            eventId: EVENT_ID,
            status: RegistrationStatus.CONFIRMED,
          },
        },
        include: INCLUDE_TICKET_DETAILS,
        orderBy: { eventRegistration: { createdAt: 'asc' } },
      });
    });

    it('UT-getAttendanceListByEvent-02: nobody checked in — checkedIn is 0', async () => {
      const input = { eventId: EVENT_ID };
      const tickets = [
        buildTicketWithAttendance('a'),
        buildTicketWithAttendance('b'),
      ];
      (prismaMock.ticket.findMany as jest.Mock).mockResolvedValue(tickets);
      const expected = {
        summary: { registered: 2, checkedIn: 0 },
        items: tickets.map(expectedListItem),
      };

      const actual = await service.getAttendanceListByEvent(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-getAttendanceListByEvent-03: everyone checked in — checkedIn equals registered', async () => {
      const input = { eventId: EVENT_ID };
      const tickets = [
        buildTicketWithAttendance('a', buildAttendance('a'), {
          status: TicketStatus.USED,
        }),
        buildTicketWithAttendance('b', buildAttendance('b'), {
          status: TicketStatus.USED,
        }),
      ];
      (prismaMock.ticket.findMany as jest.Mock).mockResolvedValue(tickets);
      const expected = {
        summary: { registered: 2, checkedIn: 2 },
        items: tickets.map(expectedListItem),
      };

      const actual = await service.getAttendanceListByEvent(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-getAttendanceListByEvent-04: no confirmed tickets — empty list and zero summary', async () => {
      const input = { eventId: EVENT_ID };
      (prismaMock.ticket.findMany as jest.Mock).mockResolvedValue([]);
      const expected = { summary: { registered: 0, checkedIn: 0 }, items: [] };

      const actual = await service.getAttendanceListByEvent(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // getAttendanceSummary
  // ==========================================================================
  describe('getAttendanceSummary', () => {
    it('UT-getAttendanceSummary-01: positive counts — registered from confirmed tickets, checkedIn from attendance rows', async () => {
      const input = { eventId: EVENT_ID };
      (prismaMock.ticket.count as jest.Mock).mockResolvedValue(8);
      (prismaMock.attendance.count as jest.Mock).mockResolvedValue(3);
      const expected = { registered: 8, checkedIn: 3 };

      const actual = await service.getAttendanceSummary(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: {
          eventRegistration: {
            eventId: EVENT_ID,
            status: RegistrationStatus.CONFIRMED,
          },
        },
      });
      expect(prismaMock.attendance.count).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID },
      });
    });

    it('UT-getAttendanceSummary-02: nothing registered — both counts are 0', async () => {
      const input = { eventId: EVENT_ID };
      (prismaMock.ticket.count as jest.Mock).mockResolvedValue(0);
      (prismaMock.attendance.count as jest.Mock).mockResolvedValue(0);
      const expected = { registered: 0, checkedIn: 0 };

      const actual = await service.getAttendanceSummary(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // findAttendanceById
  // ==========================================================================
  describe('findAttendanceById', () => {
    it('UT-findAttendanceById-01: record found — returns it with its ticket, queried by id and event', async () => {
      const input = { eventId: EVENT_ID, attendanceId: 'attendance-a' };
      const attendance = buildAttendanceWithTicket('a');
      (prismaMock.attendance.findFirst as jest.Mock).mockResolvedValue(
        attendance,
      );
      const expected = attendance;

      const actual = await service.findAttendanceById(
        input.eventId,
        input.attendanceId,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.attendance.findFirst).toHaveBeenCalledWith({
        where: { id: 'attendance-a', eventId: EVENT_ID },
        include: { ticket: { include: REGISTRATION_PARTICIPANT } },
      });
    });

    it('UT-findAttendanceById-02: no such record in the event — throws AttendanceNotFoundException (ATTENDANCE_NOT_FOUND)', async () => {
      const input = { eventId: EVENT_ID, attendanceId: 'missing' };
      (prismaMock.attendance.findFirst as jest.Mock).mockResolvedValue(null);
      const expected = {
        message: 'Check-in record not found for this event.',
        errorCode: AttendanceErrorCode.ATTENDANCE_NOT_FOUND,
      };

      const actual: unknown = await service
        .findAttendanceById(input.eventId, input.attendanceId)
        .catch((error: unknown) => error);
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AttendanceNotFoundException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
    });
  });

  // ==========================================================================
  // markTicketUsed
  // ==========================================================================
  describe('markTicketUsed', () => {
    const expectedQuery = {
      where: { id: 'ticket-a', status: TicketStatus.ACTIVE },
      data: { status: TicketStatus.USED },
    };

    it('UT-markTicketUsed-01: one row changed, no tx — returns true, runs on prisma', async () => {
      const input = { ticketId: 'ticket-a' };
      (prismaMock.ticket.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      const expected = true;

      const actual = await service.markTicketUsed(input.ticketId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(expectedQuery);
    });

    it('UT-markTicketUsed-02: one row changed, tx given — returns true, runs on the tx and not on prisma', async () => {
      const input = { ticketId: 'ticket-a', tx: txMock };
      (txMock.ticket.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const expected = true;

      const actual = await service.markTicketUsed(input.ticketId, input.tx);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(txMock.ticket.updateMany).toHaveBeenCalledWith(expectedQuery);
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    });

    it('UT-markTicketUsed-03: ticket not ACTIVE (already claimed) — 0 rows changed, returns false', async () => {
      const input = { ticketId: 'ticket-a' };
      (prismaMock.ticket.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      const expected = false;

      const actual = await service.markTicketUsed(input.ticketId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-markTicketUsed-04: more than one row changed — returns false', async () => {
      const input = { ticketId: 'ticket-a' };
      (prismaMock.ticket.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      const expected = false;

      const actual = await service.markTicketUsed(input.ticketId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // createAttendance
  // ==========================================================================
  describe('createAttendance', () => {
    it.each([CheckInMethod.QR_SCAN, CheckInMethod.MANUAL])(
      'UT-createAttendance-01: method %s, no tx — creates the record on prisma and returns it',
      async (method) => {
        const input = {
          ticketId: 'ticket-a',
          eventId: EVENT_ID,
          organizerProfileId: ORGANIZER_ID,
          method,
        };
        const created = buildAttendance('a', { method });
        (prismaMock.attendance.create as jest.Mock).mockResolvedValue(created);
        const expected = created;

        const actual = await service.createAttendance(
          input.ticketId,
          input.eventId,
          input.organizerProfileId,
          input.method,
        );
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
        expect(prismaMock.attendance.create).toHaveBeenCalledWith({
          data: {
            ticketId: 'ticket-a',
            eventId: EVENT_ID,
            checkedInById: ORGANIZER_ID,
            method,
          },
        });
      },
    );

    it('UT-createAttendance-02: tx given — creates the record on the tx and not on prisma', async () => {
      const input = {
        ticketId: 'ticket-a',
        eventId: EVENT_ID,
        organizerProfileId: ORGANIZER_ID,
        method: CheckInMethod.QR_SCAN,
        tx: txMock,
      };
      const created = buildAttendance('a');
      (txMock.attendance.create as jest.Mock).mockResolvedValue(created);
      const expected = created;

      const actual = await service.createAttendance(
        input.ticketId,
        input.eventId,
        input.organizerProfileId,
        input.method,
        input.tx,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(txMock.attendance.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.attendance.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // deleteAttendance
  // ==========================================================================
  describe('deleteAttendance', () => {
    it('UT-deleteAttendance-01: one row deleted, no tx — returns true, runs on prisma', async () => {
      const input = { attendanceId: 'attendance-a' };
      (prismaMock.attendance.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      const expected = true;

      const actual = await service.deleteAttendance(input.attendanceId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(prismaMock.attendance.deleteMany).toHaveBeenCalledWith({
        where: { id: 'attendance-a' },
      });
    });

    it('UT-deleteAttendance-02: one row deleted, tx given — returns true, runs on the tx and not on prisma', async () => {
      const input = { attendanceId: 'attendance-a', tx: txMock };
      (txMock.attendance.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      const expected = true;

      const actual = await service.deleteAttendance(
        input.attendanceId,
        input.tx,
      );
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(txMock.attendance.deleteMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.attendance.deleteMany).not.toHaveBeenCalled();
    });

    it('UT-deleteAttendance-03: record already gone (concurrent undo) — returns false instead of throwing', async () => {
      const input = { attendanceId: 'attendance-a' };
      (prismaMock.attendance.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      const expected = false;

      const actual = await service.deleteAttendance(input.attendanceId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // reactivateTicket
  // ==========================================================================
  describe('reactivateTicket', () => {
    const expectedQuery = {
      where: { id: 'ticket-a', status: TicketStatus.USED },
      data: { status: TicketStatus.ACTIVE },
    };

    it('UT-reactivateTicket-01: no tx — flips USED to ACTIVE on prisma and resolves with nothing', async () => {
      const input = { ticketId: 'ticket-a' };
      (prismaMock.ticket.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      const expected = undefined;

      const actual = await service.reactivateTicket(input.ticketId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(expectedQuery);
    });

    it('UT-reactivateTicket-02: tx given — runs on the tx and not on prisma', async () => {
      const input = { ticketId: 'ticket-a', tx: txMock };
      (txMock.ticket.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const expected = undefined;

      const actual = await service.reactivateTicket(input.ticketId, input.tx);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(txMock.ticket.updateMany).toHaveBeenCalledWith(expectedQuery);
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    });

    // --- edge cases (documents current behavior) ---
    it('UT-reactivateTicket-03: ticket was not USED (0 rows changed) — no error is thrown', async () => {
      const input = { ticketId: 'ticket-a' };
      (prismaMock.ticket.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      const expected = undefined;

      const actual = await service.reactivateTicket(input.ticketId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // mapToListItemDto
  // ==========================================================================
  describe('mapToListItemDto', () => {
    it('UT-mapToListItemDto-01: ticket with an attendance record — maps the row including the attendance part', () => {
      const input = {
        ticket: buildTicketWithAttendance(
          'a',
          buildAttendance('a', { method: CheckInMethod.MANUAL }),
          { status: TicketStatus.USED },
        ),
      };
      const expected = {
        registrationId: 'registration-a',
        ticket: { id: 'ticket-a', status: TicketStatus.USED },
        participantSnapshot: SNAPSHOT,
        attendance: {
          id: 'attendance-a',
          method: CheckInMethod.MANUAL,
          checkedInAt: CHECKED_IN_AT,
        },
      };

      const actual = service.mapToListItemDto(input.ticket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-mapToListItemDto-02: ticket without an attendance record — attendance is null', () => {
      const input = { ticket: buildTicketWithAttendance('a') };
      const expected = {
        registrationId: 'registration-a',
        ticket: { id: 'ticket-a', status: TicketStatus.ACTIVE },
        participantSnapshot: SNAPSHOT,
        attendance: null,
      };

      const actual = service.mapToListItemDto(input.ticket);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // mapToReturnAttendanceDto
  // ==========================================================================
  describe('mapToReturnAttendanceDto', () => {
    it('UT-mapToReturnAttendanceDto-01: attendance and ticket — maps the check-in result with the ticket status as given', () => {
      const input = {
        attendance: buildAttendance('a'),
        ticket: buildTicket('a', { status: TicketStatus.USED }),
      };
      const expected = {
        id: 'attendance-a',
        registrationId: 'registration-a',
        method: CheckInMethod.QR_SCAN,
        checkedInAt: CHECKED_IN_AT,
        ticket: { id: 'ticket-a', status: TicketStatus.USED },
        participantSnapshot: SNAPSHOT,
      };

      const actual = service.mapToReturnAttendanceDto(
        input.attendance,
        input.ticket,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-mapToReturnAttendanceDto-02: ticket still ACTIVE in the argument — the status is reported as given, not forced to USED', () => {
      const input = {
        attendance: buildAttendance('a'),
        ticket: buildTicket('a', { status: TicketStatus.ACTIVE }),
      };
      const expected = { id: 'ticket-a', status: TicketStatus.ACTIVE };

      const actual = service.mapToReturnAttendanceDto(
        input.attendance,
        input.ticket,
      ).ticket;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });
});
