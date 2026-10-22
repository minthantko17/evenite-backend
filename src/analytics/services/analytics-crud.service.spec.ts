/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import {
  CheckInMethod,
  FieldType,
  FormType,
  RegistrationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsCrudService } from './analytics-crud.service';

// PrismaService is the only collaborator and is fully mocked; each test sets
// the exact Prisma response it needs and also asserts the query that was sent
// (event id, status filter, half-open time window), since that is where this
// service's logic lives.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, regular cases come first, followed by edge
// cases that document current behavior.

const prismaMock = mockDeep<PrismaService>();

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const FORM_ID = '22222222-2222-4222-8222-222222222222';
const FROM = new Date('2026-05-20T10:00:00.000Z');
const TO = new Date('2026-05-20T12:00:00.000Z');

describe('AnalyticsCrudService', () => {
  let service: AnalyticsCrudService;

  beforeEach(async () => {
    mockReset(prismaMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsCrudService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AnalyticsCrudService>(AnalyticsCrudService);
  });

  // ==========================================================================
  // getOverviewCounts
  // ==========================================================================
  describe('getOverviewCounts', () => {
    // registration counts are told apart by the status in the query
    const mockCounts = (
      confirmed: number,
      cancelled: number,
      attendance: number,
    ) => {
      (prismaMock.eventRegistration.count as jest.Mock).mockImplementation(
        ({ where }: { where: { status: RegistrationStatus } }) =>
          Promise.resolve(
            where.status === RegistrationStatus.CONFIRMED
              ? confirmed
              : cancelled,
          ),
      );
      (prismaMock.attendance.count as jest.Mock).mockResolvedValue(attendance);
    };

    it('UT-getOverviewCounts-01: positive counts — each figure comes from its own query', async () => {
      const input = { eventId: EVENT_ID };
      mockCounts(7, 2, 5);
      const expected = { registered: 7, cancelled: 2, checkedIn: 5 };

      const actual = await service.getOverviewCounts(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.eventRegistration.count).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID, status: RegistrationStatus.CONFIRMED },
      });
      expect(prismaMock.eventRegistration.count).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID, status: RegistrationStatus.CANCELLED },
      });
      expect(prismaMock.attendance.count).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID },
      });
    });

    it('UT-getOverviewCounts-02: nothing recorded — all three counts are 0', async () => {
      const input = { eventId: EVENT_ID };
      mockCounts(0, 0, 0);
      const expected = { registered: 0, cancelled: 0, checkedIn: 0 };

      const actual = await service.getOverviewCounts(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // getCheckInMethodCounts
  // ==========================================================================
  describe('getCheckInMethodCounts', () => {
    const mockGroups = (
      groups: { method: CheckInMethod; _count: { _all: number } }[],
    ) => {
      (prismaMock.attendance.groupBy as jest.Mock).mockResolvedValue(groups);
    };

    it('UT-getCheckInMethodCounts-01: both methods present — each count taken from its group', async () => {
      const input = { eventId: EVENT_ID };
      mockGroups([
        { method: CheckInMethod.QR_SCAN, _count: { _all: 3 } },
        { method: CheckInMethod.MANUAL, _count: { _all: 4 } },
      ]);
      const expected = { QR_SCAN: 3, MANUAL: 4 };

      const actual = await service.getCheckInMethodCounts(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.attendance.groupBy).toHaveBeenCalledWith({
        by: ['method'],
        where: { eventId: EVENT_ID },
        _count: { _all: true },
      });
    });

    it('UT-getCheckInMethodCounts-02: only QR_SCAN present — MANUAL stays 0', async () => {
      const input = { eventId: EVENT_ID };
      mockGroups([{ method: CheckInMethod.QR_SCAN, _count: { _all: 3 } }]);
      const expected = { QR_SCAN: 3, MANUAL: 0 };

      const actual = await service.getCheckInMethodCounts(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-getCheckInMethodCounts-03: only MANUAL present — QR_SCAN stays 0', async () => {
      const input = { eventId: EVENT_ID };
      mockGroups([{ method: CheckInMethod.MANUAL, _count: { _all: 4 } }]);
      const expected = { QR_SCAN: 0, MANUAL: 4 };

      const actual = await service.getCheckInMethodCounts(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-getCheckInMethodCounts-04: no check-ins — both methods are 0', async () => {
      const input = { eventId: EVENT_ID };
      mockGroups([]);
      const expected = { QR_SCAN: 0, MANUAL: 0 };

      const actual = await service.getCheckInMethodCounts(input.eventId);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // getRegistrationTimestamps
  // ==========================================================================
  describe('getRegistrationTimestamps', () => {
    it('UT-getRegistrationTimestamps-01: matching registrations — returns their createdAt in the returned order, from a confirmed-only half-open window', async () => {
      const input = { eventId: EVENT_ID, from: FROM, to: TO };
      (prismaMock.eventRegistration.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2026-05-20T10:05:00.000Z') },
        { createdAt: new Date('2026-05-20T11:30:00.000Z') },
      ]);
      const expected = [
        new Date('2026-05-20T10:05:00.000Z'),
        new Date('2026-05-20T11:30:00.000Z'),
      ];

      const actual = await service.getRegistrationTimestamps(
        input.eventId,
        input.from,
        input.to,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.eventRegistration.findMany).toHaveBeenCalledWith({
        where: {
          eventId: EVENT_ID,
          status: RegistrationStatus.CONFIRMED,
          createdAt: { gte: FROM, lt: TO },
        },
        select: { createdAt: true },
      });
    });

    it('UT-getRegistrationTimestamps-02: no matching registrations — returns an empty list', async () => {
      const input = { eventId: EVENT_ID, from: FROM, to: TO };
      (prismaMock.eventRegistration.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      const expected: Date[] = [];

      const actual = await service.getRegistrationTimestamps(
        input.eventId,
        input.from,
        input.to,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // countRegistrationsBefore
  // ==========================================================================
  describe('countRegistrationsBefore', () => {
    it.each([
      ['positive', 12],
      ['zero', 0],
    ])(
      'UT-countRegistrationsBefore-01: count is %s — returned as is, from a confirmed-only exclusive query',
      async (_label, count) => {
        const input = { eventId: EVENT_ID, before: FROM };
        (prismaMock.eventRegistration.count as jest.Mock).mockResolvedValue(
          count,
        );
        const expected = count;

        const actual = await service.countRegistrationsBefore(
          input.eventId,
          input.before,
        );
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
        expect(prismaMock.eventRegistration.count).toHaveBeenCalledWith({
          where: {
            eventId: EVENT_ID,
            status: RegistrationStatus.CONFIRMED,
            createdAt: { lt: FROM },
          },
        });
      },
    );
  });

  // ==========================================================================
  // findEarliestRegistration
  // ==========================================================================
  describe('findEarliestRegistration', () => {
    it('UT-findEarliestRegistration-01: a confirmed registration exists — returns its createdAt, from a confirmed-only exclusive query', async () => {
      const input = { eventId: EVENT_ID, to: TO };
      (prismaMock.eventRegistration.aggregate as jest.Mock).mockResolvedValue({
        _min: { createdAt: new Date('2026-05-19T08:00:00.000Z') },
      });
      const expected = new Date('2026-05-19T08:00:00.000Z');

      const actual = await service.findEarliestRegistration(
        input.eventId,
        input.to,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.eventRegistration.aggregate).toHaveBeenCalledWith({
        where: {
          eventId: EVENT_ID,
          status: RegistrationStatus.CONFIRMED,
          createdAt: { lt: TO },
        },
        _min: { createdAt: true },
      });
    });

    it('UT-findEarliestRegistration-02: no confirmed registration — returns null', async () => {
      const input = { eventId: EVENT_ID, to: TO };
      (prismaMock.eventRegistration.aggregate as jest.Mock).mockResolvedValue({
        _min: { createdAt: null },
      });
      const expected = null;

      const actual = await service.findEarliestRegistration(
        input.eventId,
        input.to,
      );
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // getCheckInTimestamps
  // ==========================================================================
  describe('getCheckInTimestamps', () => {
    it('UT-getCheckInTimestamps-01: matching attendance rows — returns their checkedInAt in the returned order, from a half-open window', async () => {
      const input = { eventId: EVENT_ID, from: FROM, to: TO };
      (prismaMock.attendance.findMany as jest.Mock).mockResolvedValue([
        { checkedInAt: new Date('2026-05-20T10:15:00.000Z') },
        { checkedInAt: new Date('2026-05-20T10:45:00.000Z') },
      ]);
      const expected = [
        new Date('2026-05-20T10:15:00.000Z'),
        new Date('2026-05-20T10:45:00.000Z'),
      ];

      const actual = await service.getCheckInTimestamps(
        input.eventId,
        input.from,
        input.to,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.attendance.findMany).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID, checkedInAt: { gte: FROM, lt: TO } },
        select: { checkedInAt: true },
      });
    });

    it('UT-getCheckInTimestamps-02: no matching attendance rows — returns an empty list', async () => {
      const input = { eventId: EVENT_ID, from: FROM, to: TO };
      (prismaMock.attendance.findMany as jest.Mock).mockResolvedValue([]);
      const expected: Date[] = [];

      const actual = await service.getCheckInTimestamps(
        input.eventId,
        input.from,
        input.to,
      );
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });

  // ==========================================================================
  // countCheckInsBefore
  // ==========================================================================
  describe('countCheckInsBefore', () => {
    it.each([
      ['positive', 9],
      ['zero', 0],
    ])(
      'UT-countCheckInsBefore-01: count is %s — returned as is, from an exclusive query',
      async (_label, count) => {
        const input = { eventId: EVENT_ID, before: FROM };
        (prismaMock.attendance.count as jest.Mock).mockResolvedValue(count);
        const expected = count;

        const actual = await service.countCheckInsBefore(
          input.eventId,
          input.before,
        );
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
        expect(prismaMock.attendance.count).toHaveBeenCalledWith({
          where: { eventId: EVENT_ID, checkedInAt: { lt: FROM } },
        });
      },
    );
  });

  // ==========================================================================
  // findEarliestCheckIn
  // ==========================================================================
  describe('findEarliestCheckIn', () => {
    it('UT-findEarliestCheckIn-01: a check-in exists — returns its checkedInAt, from an exclusive query', async () => {
      const input = { eventId: EVENT_ID, to: TO };
      (prismaMock.attendance.aggregate as jest.Mock).mockResolvedValue({
        _min: { checkedInAt: new Date('2026-05-20T09:30:00.000Z') },
      });
      const expected = new Date('2026-05-20T09:30:00.000Z');

      const actual = await service.findEarliestCheckIn(input.eventId, input.to);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(prismaMock.attendance.aggregate).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID, checkedInAt: { lt: TO } },
        _min: { checkedInAt: true },
      });
    });

    it('UT-findEarliestCheckIn-02: no check-in — returns null', async () => {
      const input = { eventId: EVENT_ID, to: TO };
      (prismaMock.attendance.aggregate as jest.Mock).mockResolvedValue({
        _min: { checkedInAt: null },
      });
      const expected = null;

      const actual = await service.findEarliestCheckIn(input.eventId, input.to);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // getFormAnswerData
  // ==========================================================================
  describe('getFormAnswerData', () => {
    const FIELDS = [
      { id: 'f1', label: 'Name', type: FieldType.TEXT, options: [] },
      { id: 'f2', label: 'Meal', type: FieldType.CHOICE, options: ['A', 'B'] },
    ];
    const ROWS = [
      {
        formFieldId: 'f1',
        valueText: 'Alice',
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      {
        formFieldId: 'f2',
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: ['A'],
      },
    ];

    it.each([FormType.REGISTRATION, FormType.FEEDBACK])(
      'UT-getFormAnswerData-01: %s form with fields, answers and responses — returns fields, rows and responseCount, restricted to confirmed registrations',
      async (type) => {
        const input = { eventId: EVENT_ID, type };
        (prismaMock.form.findUnique as jest.Mock).mockResolvedValue({
          id: FORM_ID,
          fields: FIELDS,
        });
        (prismaMock.formFieldResponse.findMany as jest.Mock).mockResolvedValue(
          ROWS,
        );
        (prismaMock.formResponse.count as jest.Mock).mockResolvedValue(2);
        const expected = { fields: FIELDS, rows: ROWS, responseCount: 2 };

        const actual = await service.getFormAnswerData(
          input.eventId,
          input.type,
        );
        // console.log({ input, expected, actual });

        const confirmed = {
          eventRegistration: { status: RegistrationStatus.CONFIRMED },
        };
        expect(actual).toEqual(expected);
        expect(prismaMock.form.findUnique).toHaveBeenCalledWith({
          where: { eventId_type: { eventId: EVENT_ID, type } },
          select: {
            id: true,
            fields: {
              orderBy: { order: 'asc' },
              select: { id: true, label: true, type: true, options: true },
            },
          },
        });
        expect(prismaMock.formFieldResponse.findMany).toHaveBeenCalledWith({
          where: { formId: FORM_ID, formResponse: confirmed },
          select: {
            formFieldId: true,
            valueText: true,
            valueNumber: true,
            valueDate: true,
            valueArray: true,
          },
        });
        expect(prismaMock.formResponse.count).toHaveBeenCalledWith({
          where: { formId: FORM_ID, ...confirmed },
        });
      },
    );

    it('UT-getFormAnswerData-02: form exists but nobody answered — empty rows and a response count of 0', async () => {
      const input = { eventId: EVENT_ID, type: FormType.FEEDBACK };
      (prismaMock.form.findUnique as jest.Mock).mockResolvedValue({
        id: FORM_ID,
        fields: FIELDS,
      });
      (prismaMock.formFieldResponse.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaMock.formResponse.count as jest.Mock).mockResolvedValue(0);
      const expected = { fields: FIELDS, rows: [], responseCount: 0 };

      const actual = await service.getFormAnswerData(input.eventId, input.type);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-getFormAnswerData-03: the event has no form of that type — returns null without querying answers', async () => {
      const input = { eventId: EVENT_ID, type: FormType.FEEDBACK };
      (prismaMock.form.findUnique as jest.Mock).mockResolvedValue(null);
      const expected = null;

      const actual = await service.getFormAnswerData(input.eventId, input.type);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(prismaMock.formFieldResponse.findMany).not.toHaveBeenCalled();
      expect(prismaMock.formResponse.count).not.toHaveBeenCalled();
    });

    // --- edge cases (documents current behavior) ---
    it('UT-getFormAnswerData-04: form without fields — returns an empty field list', async () => {
      const input = { eventId: EVENT_ID, type: FormType.REGISTRATION };
      (prismaMock.form.findUnique as jest.Mock).mockResolvedValue({
        id: FORM_ID,
        fields: [],
      });
      (prismaMock.formFieldResponse.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaMock.formResponse.count as jest.Mock).mockResolvedValue(0);
      const expected = { fields: [], rows: [], responseCount: 0 };

      const actual = await service.getFormAnswerData(input.eventId, input.type);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });
});
