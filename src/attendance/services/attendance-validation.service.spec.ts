/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';
import { EventStatus, FormType, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceValidationService } from './attendance-validation.service';
import { EventNotCheckableException } from '../exceptions/event-not-checkable.exception';
import { TicketNotActiveException } from '../exceptions/ticket-not-active.exception';
import { FeedbackAlreadySubmittedException } from '../exceptions/feedback-already-submitted.exception';
import { AttendanceErrorCode } from '../constants/attendance-error-code.enum';

// PrismaService is the only collaborator and is fully mocked (only
// validateNoFeedbackSubmitted touches it). The two status validators are pure.
// For thrown exceptions each test asserts the exception class and its response
// body (message + errorCode), since clients rely on errorCode.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, happy-path cases come first, followed by error
// cases and edge cases that document current behavior.

const prismaMock = mockDeep<PrismaService>();

const REGISTRATION_ID = '11111111-1111-4111-8111-111111111111';

// runs a synchronous validator and returns what it threw (undefined if nothing)
const getThrown = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('AttendanceValidationService', () => {
  let service: AttendanceValidationService;

  beforeEach(async () => {
    mockReset(prismaMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceValidationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AttendanceValidationService>(
      AttendanceValidationService,
    );
  });

  // ==========================================================================
  // validateEventCheckable
  // ==========================================================================
  describe('validateEventCheckable', () => {
    it.each([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.ONGOING])(
      'UT-validateEventCheckable-01: status %s — returns the open-for-check-in message',
      (status) => {
        const input = { status };
        const expected = { message: 'Event is open for check-in.' };

        const actual = service.validateEventCheckable(input.status);
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it.each([EventStatus.CONCLUDED, EventStatus.CANCELLED])(
      'UT-validateEventCheckable-02: status %s — throws EventNotCheckableException',
      (status) => {
        const input = { status };
        const expected = {
          message: 'Check-in is closed for concluded or cancelled events.',
          errorCode: AttendanceErrorCode.EVENT_NOT_CHECKABLE,
        };

        const actual = getThrown(() =>
          service.validateEventCheckable(input.status),
        );
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(EventNotCheckableException);
        expect((actual as HttpException).getResponse()).toMatchObject(expected);
      },
    );
  });

  // ==========================================================================
  // validateTicketActive
  // ==========================================================================
  describe('validateTicketActive', () => {
    it('UT-validateTicketActive-01: status ACTIVE — returns the ticket-is-active message', () => {
      const input = { status: TicketStatus.ACTIVE };
      const expected = { message: 'Ticket is active.' };

      const actual = service.validateTicketActive(input.status);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it.each([
      [
        TicketStatus.CANCELLED,
        'This ticket has been cancelled.',
        AttendanceErrorCode.TICKET_CANCELLED,
      ],
      [
        TicketStatus.EXPIRED,
        'This ticket has expired.',
        AttendanceErrorCode.TICKET_EXPIRED,
      ],
      [
        TicketStatus.USED,
        'This ticket is not active.',
        AttendanceErrorCode.TICKET_NOT_ACTIVE,
      ],
    ])(
      'UT-validateTicketActive-02: status %s — throws TicketNotActiveException with its own message and errorCode',
      (status, message, errorCode) => {
        const input = { status };
        const expected = { message, errorCode };

        const actual = getThrown(() =>
          service.validateTicketActive(input.status),
        );
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(TicketNotActiveException);
        expect((actual as HttpException).getResponse()).toMatchObject(expected);
      },
    );
  });

  // ==========================================================================
  // validateNoFeedbackSubmitted
  // ==========================================================================
  describe('validateNoFeedbackSubmitted', () => {
    it('UT-validateNoFeedbackSubmitted-01: no feedback response — returns the no-feedback message, counting feedback forms of that registration only', async () => {
      const input = { registrationId: REGISTRATION_ID };
      (prismaMock.formResponse.count as jest.Mock).mockResolvedValue(0);
      const expected = { message: 'No feedback submitted.' };

      const actual = await service.validateNoFeedbackSubmitted(
        input.registrationId,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.formResponse.count).toHaveBeenCalledWith({
        where: {
          eventRegistrationId: REGISTRATION_ID,
          form: { type: FormType.FEEDBACK },
        },
      });
    });

    it.each([
      ['one feedback response', 1],
      ['several feedback responses', 3],
    ])(
      'UT-validateNoFeedbackSubmitted-02: %s — throws FeedbackAlreadySubmittedException',
      async (_label, count) => {
        const input = { registrationId: REGISTRATION_ID, count };
        (prismaMock.formResponse.count as jest.Mock).mockResolvedValue(
          input.count,
        );
        const expected = {
          message:
            'Cannot undo check-in because the participant has already submitted feedback.',
          errorCode: AttendanceErrorCode.FEEDBACK_ALREADY_SUBMITTED,
        };

        const actual: unknown = await service
          .validateNoFeedbackSubmitted(input.registrationId)
          .catch((error: unknown) => error);
        // console.log({ input, expected, actual });

        expect(actual).toBeInstanceOf(FeedbackAlreadySubmittedException);
        expect((actual as HttpException).getResponse()).toMatchObject(expected);
      },
    );

    // --- edge cases (documents current behavior) ---
    it('UT-validateNoFeedbackSubmitted-03: the database fails — the error bubbles up unchanged', async () => {
      const input = { error: new Error('db down') };
      (prismaMock.formResponse.count as jest.Mock).mockRejectedValue(
        input.error,
      );

      const actual = service.validateNoFeedbackSubmitted(REGISTRATION_ID);
      // console.log({ input, actual });

      await expect(actual).rejects.toBe(input.error);
    });
  });
});
