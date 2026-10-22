/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { ForbiddenException, HttpException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CheckInMethod, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventValidationService } from '../event/services/event-validation.service';
import { EventNotFoundException } from '../event/exceptions/event-not-found.exception';
import { AttendanceService } from './attendance.service';
import { AttendanceCrudService } from './services/attendance-crud.service';
import { AttendanceValidationService } from './services/attendance-validation.service';
import { AlreadyCheckedInException } from './exceptions/already-checked-in.exception';
import { AttendanceNotFoundException } from './exceptions/attendance-not-found.exception';
import { AttendanceTicketNotFoundException } from './exceptions/attendance-ticket-not-found.exception';
import { EventNotCheckableException } from './exceptions/event-not-checkable.exception';
import { FeedbackAlreadySubmittedException } from './exceptions/feedback-already-submitted.exception';
import { SaveAttendanceException } from './exceptions/save-attendance.exception';
import { TicketNotActiveException } from './exceptions/ticket-not-active.exception';
import { AttendanceErrorCode } from './constants/attendance-error-code.enum';
import {
  EVENT_ID,
  ORGANIZER_ID,
  OTHER_ORGANIZER_ID,
  QR_TOKEN,
  REGISTRATION_ID,
  COUNTS,
  EVENT_PUBLISHED,
  TICKET_ACTIVE,
  TICKET_USED,
  TICKET_USED_NO_ATTENDANCE,
  TICKET_CANCELLED,
  TICKET_EXPIRED,
  ATTENDANCE_WINNER,
  ATTENDANCE_WITH_TICKET,
  METHOD_BY_ENTRY,
  uniqueViolation,
  foreignKeyViolation,
  fakeReturnDto,
  fakeListItem,
  applyCentralMockImplementations,
} from './attendance.service.mock-db';
import { buildAttendance } from './services/attendance-crud.service.mock-db';

// This spec sources its fixtures from ./attendance.service.mock-db.ts —
// event / ticket / attendance fixtures (an ACTIVE ticket, the winner's USED
// ticket for the race cases, cancelled and expired tickets, a checked-in
// attendance for undo), Prisma error builders, and the simulated mappers.
// PrismaService ($transaction only), the crud and validation services,
// EventValidationService and EventEmitter2 are mocked; the central wiring
// makes the transaction run its callback with a fake client and simulates
// validateTicketActive, so most tests override only the one thing they are
// about. Logger output is spied on to confirm what is logged.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, happy-path cases come first, followed by error
// cases and edge cases that document current behavior.

const prismaMock = mockDeep<PrismaService>();
const crudMock = mockDeep<AttendanceCrudService>();
const validationMock = mockDeep<AttendanceValidationService>();
const eventValidationMock = mockDeep<EventValidationService>();
const emitterMock = mockDeep<EventEmitter2>();
const txMock = { isFakeTransactionClient: true };

type Entry = 'QR' | 'MANUAL';
const ENTRIES: Entry[] = ['QR', 'MANUAL'];

// runs the check-in entry point under test
const checkIn = (service: AttendanceService, entry: Entry) =>
  entry === 'QR'
    ? service.checkInByQrToken(EVENT_ID, QR_TOKEN, ORGANIZER_ID)
    : service.checkInManually(EVENT_ID, REGISTRATION_ID, ORGANIZER_ID);

// the ticket lookup the entry point is expected to use
const findTicketMock = (entry: Entry) =>
  entry === 'QR'
    ? crudMock.findTicketByQrToken
    : crudMock.findTicketByRegistrationId;

// resolves with whatever the promise rejected with (undefined if it resolved)
const caught = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );

describe('AttendanceService', () => {
  let service: AttendanceService;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockReset(prismaMock);
    mockReset(crudMock);
    mockReset(validationMock);
    mockReset(eventValidationMock);
    mockReset(emitterMock);
    applyCentralMockImplementations({
      prisma: prismaMock,
      tx: txMock,
      crud: crudMock,
      validation: validationMock,
      eventValidation: eventValidationMock,
      emitter: emitterMock,
    });
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AttendanceCrudService, useValue: crudMock },
        { provide: AttendanceValidationService, useValue: validationMock },
        { provide: EventValidationService, useValue: eventValidationMock },
        { provide: EventEmitter2, useValue: emitterMock },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // ==========================================================================
  // checkInByQrToken / checkInManually (shared flow)
  // ==========================================================================
  describe('checkIn (checkInByQrToken / checkInManually)', () => {
    it.each(ENTRIES)(
      'UT-checkIn-01: %s entry, ACTIVE ticket — claims the ticket, creates the attendance in one transaction, returns the result with the ticket USED and emits attendance.checked-in',
      async (entry) => {
        const method: CheckInMethod = METHOD_BY_ENTRY[entry];
        const input = { entry };
        const created = buildAttendance('a', { method });
        crudMock.createAttendance.mockResolvedValue(created);
        const usedTicket = { ...TICKET_ACTIVE, status: TicketStatus.USED };
        const expectedResult = fakeReturnDto(created, usedTicket);
        const expected = {
          result: expectedResult,
          event: {
            eventId: EVENT_ID,
            organizerProfileId: ORGANIZER_ID,
            participantProfileId: 'participant-a',
            attendance: expectedResult,
            counts: COUNTS,
          },
        };

        const result = await checkIn(service, input.entry);
        const actual = {
          result,
          event: emitterMock.emit.mock.calls[0][1] as unknown,
        };
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
        expect(emitterMock.emit).toHaveBeenCalledWith(
          'attendance.checked-in',
          expected.event,
        );
        expect(eventValidationMock.validateEventOwnership).toHaveBeenCalledWith(
          EVENT_ID,
          ORGANIZER_ID,
        );
        expect(validationMock.validateEventCheckable).toHaveBeenCalledWith(
          EVENT_PUBLISHED.status,
        );
        expect(findTicketMock(entry)).toHaveBeenCalledWith(
          EVENT_ID,
          entry === 'QR' ? QR_TOKEN : REGISTRATION_ID,
        );
        expect(crudMock.markTicketUsed).toHaveBeenCalledWith(
          TICKET_ACTIVE.id,
          txMock,
        );
        expect(crudMock.createAttendance).toHaveBeenCalledWith(
          TICKET_ACTIVE.id,
          EVENT_ID,
          ORGANIZER_ID,
          method,
          txMock,
        );
        expect(crudMock.mapToReturnAttendanceDto).toHaveBeenCalledWith(
          created,
          usedTicket,
        );
      },
    );

    it.each([
      ['QR', 'not the owner', new ForbiddenException('not yours')],
      ['QR', 'event does not exist', new EventNotFoundException()],
      ['MANUAL', 'not the owner', new ForbiddenException('not yours')],
      ['MANUAL', 'event does not exist', new EventNotFoundException()],
    ])(
      'UT-checkIn-02: %s entry, ownership check fails (%s) — the error bubbles up and nothing else is called',
      async (entry, _label, error) => {
        const input = { entry: entry as Entry, error };
        eventValidationMock.validateEventOwnership.mockRejectedValue(
          input.error,
        );
        const expected = input.error;

        const actual = await caught(checkIn(service, input.entry));
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
        expect(eventValidationMock.validateEventExists).not.toHaveBeenCalled();
        expect(findTicketMock(input.entry)).not.toHaveBeenCalled();
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
      },
    );

    it('UT-checkIn-03: event disappears between the ownership check and the existence check — throws EventNotFoundException before any ticket lookup', async () => {
      const input = { entry: 'QR' as Entry };
      eventValidationMock.validateEventExists.mockRejectedValue(
        new EventNotFoundException(),
      );

      const actual = await caught(checkIn(service, input.entry));
      // console.log({ input, actual });

      expect(actual).toBeInstanceOf(EventNotFoundException);
      expect(crudMock.findTicketByQrToken).not.toHaveBeenCalled();
    });

    it.each(ENTRIES)(
      'UT-checkIn-04: %s entry, event concluded or cancelled — throws EventNotCheckableException before any ticket lookup',
      async (entry) => {
        const input = { entry };
        validationMock.validateEventCheckable.mockImplementation(() => {
          throw new EventNotCheckableException();
        });
        const expected = AttendanceErrorCode.EVENT_NOT_CHECKABLE;

        const actual = await caught(checkIn(service, input.entry));
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(EventNotCheckableException);
        expect((actual as HttpException).getResponse()).toMatchObject({
          errorCode: expected,
        });
        expect(findTicketMock(input.entry)).not.toHaveBeenCalled();
      },
    );

    it.each(ENTRIES)(
      'UT-checkIn-05: %s entry, no ticket found — AttendanceTicketNotFoundException bubbles up and no transaction starts',
      async (entry) => {
        const input = { entry };
        findTicketMock(input.entry).mockRejectedValue(
          new AttendanceTicketNotFoundException(),
        );
        const expected = AttendanceErrorCode.TICKET_NOT_FOUND;

        const actual = await caught(checkIn(service, input.entry));
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(AttendanceTicketNotFoundException);
        expect((actual as HttpException).getResponse()).toMatchObject({
          errorCode: expected,
        });
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
      },
    );

    it.each(ENTRIES)(
      'UT-checkIn-06: %s entry, ticket already USED with an attendance record — throws AlreadyCheckedInException carrying the original check-in, with no transaction and no event',
      async (entry) => {
        const input = { entry };
        findTicketMock(input.entry).mockResolvedValue(TICKET_USED);
        const expected = {
          message: 'This participant is already checked in.',
          errorCode: AttendanceErrorCode.ALREADY_CHECKED_IN,
          attendance: fakeReturnDto(ATTENDANCE_WINNER, TICKET_USED),
        };

        const actual = await caught(checkIn(service, input.entry));
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(AlreadyCheckedInException);
        expect((actual as HttpException).getResponse()).toMatchObject(expected);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
        expect(emitterMock.emit).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        TicketStatus.CANCELLED,
        TICKET_CANCELLED,
        AttendanceErrorCode.TICKET_CANCELLED,
      ],
      [
        TicketStatus.EXPIRED,
        TICKET_EXPIRED,
        AttendanceErrorCode.TICKET_EXPIRED,
      ],
    ])(
      'UT-checkIn-07: ticket %s — throws TicketNotActiveException with its errorCode, with no transaction and no event',
      async (_status, ticket, errorCode) => {
        const input = { ticket };
        crudMock.findTicketByQrToken.mockResolvedValue(input.ticket);
        const expected = { errorCode };

        const actual = await caught(checkIn(service, 'QR'));
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(TicketNotActiveException);
        expect((actual as HttpException).getResponse()).toMatchObject(expected);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
        expect(emitterMock.emit).not.toHaveBeenCalled();
      },
    );

    it("UT-checkIn-08: another check-in claims the ticket first (markTicketUsed false) — re-reads the ticket and throws AlreadyCheckedInException with the winner's check-in, creating nothing and emitting nothing", async () => {
      const input = { entry: 'QR' as Entry };
      crudMock.markTicketUsed.mockResolvedValue(false);
      crudMock.findTicketById.mockResolvedValue(TICKET_USED);
      const expected = {
        errorCode: AttendanceErrorCode.ALREADY_CHECKED_IN,
        attendance: fakeReturnDto(ATTENDANCE_WINNER, TICKET_USED),
      };

      const actual = await caught(checkIn(service, input.entry));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AlreadyCheckedInException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
      expect(crudMock.findTicketById).toHaveBeenCalledWith(TICKET_ACTIVE.id);
      expect(crudMock.createAttendance).not.toHaveBeenCalled();
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });

    it('UT-checkIn-09: unique violation (P2002) while creating the attendance — treated as losing the race: re-reads the ticket and throws AlreadyCheckedInException without logging an error', async () => {
      const input = { entry: 'MANUAL' as Entry };
      crudMock.createAttendance.mockRejectedValue(uniqueViolation());
      crudMock.findTicketById.mockResolvedValue(TICKET_USED);
      const expected = {
        errorCode: AttendanceErrorCode.ALREADY_CHECKED_IN,
        attendance: fakeReturnDto(ATTENDANCE_WINNER, TICKET_USED),
      };

      const actual = await caught(checkIn(service, input.entry));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AlreadyCheckedInException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });

    it('UT-checkIn-10: the transaction fails with a generic error — logs it and throws SaveAttendanceException, with no re-read and no event', async () => {
      const input = { error: new Error('db down') };
      crudMock.createAttendance.mockRejectedValue(input.error);
      const expected = input.error;

      const actual = await caught(checkIn(service, 'QR'));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(SaveAttendanceException);
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to save check-in',
        expected,
      );
      expect(crudMock.findTicketById).not.toHaveBeenCalled();
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });

    it('UT-checkIn-11: the transaction fails with another Prisma error code (P2003) — logs it and throws SaveAttendanceException, with no re-read', async () => {
      const input = { error: foreignKeyViolation() };
      crudMock.createAttendance.mockRejectedValue(input.error);
      const expected = input.error;

      const actual = await caught(checkIn(service, 'QR'));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(SaveAttendanceException);
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to save check-in',
        expected,
      );
      expect(crudMock.findTicketById).not.toHaveBeenCalled();
    });

    it('UT-checkIn-12: counting for the realtime event fails — the check-in is still returned, a warning is logged and no event is emitted', async () => {
      const input = { error: new Error('count failed') };
      crudMock.getAttendanceSummary.mockRejectedValue(input.error);
      const usedTicket = { ...TICKET_ACTIVE, status: TicketStatus.USED };
      const expected = fakeReturnDto(buildAttendance('a'), usedTicket);

      const actual = await checkIn(service, 'QR');
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to emit attendance.checked-in',
        input.error,
      );
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });

    it('UT-checkIn-13: the emitter throws — the check-in is still returned and a warning is logged', async () => {
      const input = { error: new Error('emit failed') };
      emitterMock.emit.mockImplementation(() => {
        throw input.error;
      });
      const usedTicket = { ...TICKET_ACTIVE, status: TicketStatus.USED };
      const expected = fakeReturnDto(buildAttendance('a'), usedTicket);

      const actual = await checkIn(service, 'QR');
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to emit attendance.checked-in',
        input.error,
      );
    });

    // --- edge cases (documents current behavior) ---
    it('UT-checkIn-14: ticket marked USED but without an attendance record — falls through to the status check and throws TicketNotActiveException (TICKET_NOT_ACTIVE)', async () => {
      const input = { ticket: TICKET_USED_NO_ATTENDANCE };
      crudMock.findTicketByQrToken.mockResolvedValue(input.ticket);
      const expected = { errorCode: AttendanceErrorCode.TICKET_NOT_ACTIVE };

      const actual = await caught(checkIn(service, 'QR'));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(TicketNotActiveException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
    });

    it('UT-checkIn-15: lost the race and the re-read shows the ticket CANCELLED — throws TicketNotActiveException (TICKET_CANCELLED)', async () => {
      const input = { entry: 'QR' as Entry };
      crudMock.markTicketUsed.mockResolvedValue(false);
      crudMock.findTicketById.mockResolvedValue(TICKET_CANCELLED);
      const expected = { errorCode: AttendanceErrorCode.TICKET_CANCELLED };

      const actual = await caught(checkIn(service, input.entry));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(TicketNotActiveException);
      expect((actual as HttpException).getResponse()).toMatchObject(expected);
    });

    it('UT-checkIn-16: lost the race but the re-read still shows the ticket ACTIVE — throws SaveAttendanceException', async () => {
      const input = { entry: 'QR' as Entry };
      crudMock.markTicketUsed.mockResolvedValue(false);
      crudMock.findTicketById.mockResolvedValue(TICKET_ACTIVE);

      const actual = await caught(checkIn(service, input.entry));
      // console.log({ input, actual });

      expect(actual).toBeInstanceOf(SaveAttendanceException);
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getAttendanceList
  // ==========================================================================
  describe('getAttendanceList', () => {
    it('UT-getAttendanceList-01: owner — returns the crud list unchanged and does not check the event status', async () => {
      const input = { eventId: EVENT_ID, organizerProfileId: ORGANIZER_ID };
      const list = {
        summary: { registered: 2, checkedIn: 1 },
        items: [fakeListItem(TICKET_ACTIVE), fakeListItem(TICKET_USED)],
      };
      crudMock.getAttendanceListByEvent.mockResolvedValue(list);
      const expected = list;

      const actual = await service.getAttendanceList(
        input.eventId,
        input.organizerProfileId,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(eventValidationMock.validateEventOwnership).toHaveBeenCalledWith(
        EVENT_ID,
        ORGANIZER_ID,
      );
      expect(crudMock.getAttendanceListByEvent).toHaveBeenCalledWith(EVENT_ID);
      expect(eventValidationMock.validateEventExists).not.toHaveBeenCalled();
      expect(validationMock.validateEventCheckable).not.toHaveBeenCalled();
    });

    it.each([
      ['not the owner', new ForbiddenException('not yours')],
      ['event does not exist', new EventNotFoundException()],
    ])(
      'UT-getAttendanceList-02: ownership check fails (%s) — the error bubbles up and the list is not queried',
      async (_label, error) => {
        const input = { organizerProfileId: OTHER_ORGANIZER_ID, error };
        eventValidationMock.validateEventOwnership.mockRejectedValue(
          input.error,
        );
        const expected = input.error;

        const actual = await caught(
          service.getAttendanceList(EVENT_ID, input.organizerProfileId),
        );
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
        expect(crudMock.getAttendanceListByEvent).not.toHaveBeenCalled();
      },
    );
  });

  // ==========================================================================
  // undoCheckIn
  // ==========================================================================
  describe('undoCheckIn', () => {
    const attendance = ATTENDANCE_WITH_TICKET;
    const undoInput = {
      eventId: EVENT_ID,
      attendanceId: attendance.id,
      organizerProfileId: ORGANIZER_ID,
    };
    const undoCall = (input: typeof undoInput = undoInput) =>
      service.undoCheckIn(
        input.eventId,
        input.attendanceId,
        input.organizerProfileId,
      );

    it('UT-undoCheckIn-01: valid undo — deletes the attendance and reactivates the ticket in one transaction, returns the row with the ticket ACTIVE and no attendance, and emits attendance.undone', async () => {
      const input = {
        eventId: EVENT_ID,
        attendanceId: attendance.id,
        organizerProfileId: ORGANIZER_ID,
      };
      const reactivatedTicket = {
        ...attendance.ticket,
        status: TicketStatus.ACTIVE,
        attendance: null,
      };
      const expected = {
        result: fakeListItem(reactivatedTicket),
        event: {
          eventId: EVENT_ID,
          organizerProfileId: ORGANIZER_ID,
          participantProfileId: 'participant-a',
          registrationId: 'registration-a',
          ticketId: 'ticket-a',
          counts: COUNTS,
        },
      };

      const result = await service.undoCheckIn(
        input.eventId,
        input.attendanceId,
        input.organizerProfileId,
      );
      const actual = {
        result,
        event: emitterMock.emit.mock.calls[0][1] as unknown,
      };
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(emitterMock.emit).toHaveBeenCalledWith(
        'attendance.undone',
        expected.event,
      );
      expect(crudMock.findAttendanceById).toHaveBeenCalledWith(
        EVENT_ID,
        attendance.id,
      );
      expect(validationMock.validateNoFeedbackSubmitted).toHaveBeenCalledWith(
        attendance.ticket.eventRegistrationId,
      );
      expect(crudMock.deleteAttendance).toHaveBeenCalledWith(
        attendance.id,
        txMock,
      );
      expect(crudMock.reactivateTicket).toHaveBeenCalledWith(
        attendance.ticketId,
        txMock,
      );
      expect(crudMock.mapToListItemDto).toHaveBeenCalledWith(reactivatedTicket);
    });

    it('UT-undoCheckIn-02: not the owner — the error bubbles up and nothing else is called', async () => {
      const input = { error: new ForbiddenException('not yours') };
      eventValidationMock.validateEventOwnership.mockRejectedValue(input.error);
      const expected = input.error;

      const actual = await caught(undoCall(input));
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(crudMock.findAttendanceById).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('UT-undoCheckIn-03: event concluded or cancelled — throws EventNotCheckableException and the attendance is not even looked up', async () => {
      const input = undoInput;
      validationMock.validateEventCheckable.mockImplementation(() => {
        throw new EventNotCheckableException();
      });
      const expected = AttendanceErrorCode.EVENT_NOT_CHECKABLE;

      const actual = await caught(undoCall(input));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(EventNotCheckableException);
      expect((actual as HttpException).getResponse()).toMatchObject({
        errorCode: expected,
      });
      expect(crudMock.findAttendanceById).not.toHaveBeenCalled();
    });

    it('UT-undoCheckIn-04: attendance not found in the event — AttendanceNotFoundException bubbles up and no transaction starts', async () => {
      const input = undoInput;
      crudMock.findAttendanceById.mockRejectedValue(
        new AttendanceNotFoundException(),
      );
      const expected = AttendanceErrorCode.ATTENDANCE_NOT_FOUND;

      const actual = await caught(undoCall(input));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AttendanceNotFoundException);
      expect((actual as HttpException).getResponse()).toMatchObject({
        errorCode: expected,
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('UT-undoCheckIn-05: participant already submitted feedback — throws FeedbackAlreadySubmittedException and no transaction starts', async () => {
      const input = undoInput;
      validationMock.validateNoFeedbackSubmitted.mockRejectedValue(
        new FeedbackAlreadySubmittedException(),
      );
      const expected = AttendanceErrorCode.FEEDBACK_ALREADY_SUBMITTED;

      const actual = await caught(undoCall(input));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(FeedbackAlreadySubmittedException);
      expect((actual as HttpException).getResponse()).toMatchObject({
        errorCode: expected,
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('UT-undoCheckIn-06: a concurrent undo already deleted the record (delete returns false) — throws AttendanceNotFoundException, does not reactivate the ticket, does not log an error and emits nothing', async () => {
      const input = undoInput;
      crudMock.deleteAttendance.mockResolvedValue(false);
      const expected = AttendanceErrorCode.ATTENDANCE_NOT_FOUND;

      const actual = await caught(undoCall(input));
      // console.log({ input, expected, actual });

      expect(actual).toBeInstanceOf(AttendanceNotFoundException);
      expect((actual as HttpException).getResponse()).toMatchObject({
        errorCode: expected,
      });
      expect(crudMock.reactivateTicket).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });

    it.each([
      ['deleting the attendance fails', 'deleteAttendance'],
      ['reactivating the ticket fails', 'reactivateTicket'],
    ] as const)(
      'UT-undoCheckIn-07: %s — logs it and throws SaveAttendanceException, with no event',
      async (_label, failing) => {
        const input = { failing, error: new Error('db down') };
        crudMock[input.failing].mockRejectedValue(input.error);
        const expected = input.error;

        const actual = await caught(undoCall(input));
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(SaveAttendanceException);
        expect(errorSpy).toHaveBeenCalledWith(
          'Failed to undo check-in',
          expected,
        );
        expect(emitterMock.emit).not.toHaveBeenCalled();
      },
    );

    it('UT-undoCheckIn-08: counting for the realtime event fails — the undo is still returned, a warning is logged and no event is emitted', async () => {
      const input = { error: new Error('count failed') };
      crudMock.getAttendanceSummary.mockRejectedValue(input.error);
      const expected = fakeListItem({
        ...attendance.ticket,
        status: TicketStatus.ACTIVE,
        attendance: null,
      });

      const actual = await undoCall();
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to emit attendance.undone',
        input.error,
      );
      expect(emitterMock.emit).not.toHaveBeenCalled();
    });
  });
});
