/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { CheckInMethod, TicketStatus } from '@prisma/client';
import { RealtimeGateway } from './realtime.gateway';
import {
  EVENT_ID,
  REGISTRATION_ID,
  TICKET_ID,
  ATTENDANCE_ID,
  ORGANIZER_CHANNEL,
  PARTICIPANT_CHANNEL,
  CHECKED_IN_AT,
  COUNTS,
  SNAPSHOT,
  ORGANIZER_JWT,
  PARTICIPANT_JWT,
  NO_PROFILE_JWT,
  PARTICIPANT_WITHOUT_PROFILE_JWT,
  UNDONE_PAYLOAD,
  REGISTRATION_PAYLOAD,
  FEEDBACK_PAYLOAD,
  createMockSocket,
  createMockServerRig,
  buildCheckedInPayload,
  MockServerRig,
} from './realtime.gateway.mock-db';

// This spec sources its fixtures from ./realtime.gateway.mock-db.ts — JWT
// payloads for each role, a fake socket, a fake socket.io server that records
// every server.to(channel).emit(message, data) as an { channel, message, data }
// entry, and the event payloads the handlers receive. JwtService is the only
// mocked collaborator. The @OnEvent handlers are called directly; the event
// wiring itself is decoration only.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, happy-path cases come first, followed by error
// cases and edge cases that document current behavior.

const jwtServiceMock = mockDeep<JwtService>();

// first argument of the first call of a jest mock
const firstArg = (mock: unknown): unknown =>
  ((mock as jest.Mock).mock.calls as unknown[][])[0]?.[0];

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let rig: MockServerRig;
  let logSpy: jest.SpyInstance;
  const originalSecret = process.env.JWT_ACCESS_SECRET;

  beforeEach(async () => {
    mockReset(jwtServiceMock);
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    rig = createMockServerRig();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    gateway.server = rig.server;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = originalSecret;
    }
  });

  // ==========================================================================
  // handleConnection
  // ==========================================================================
  describe('handleConnection', () => {
    it('UT-handleConnection-01: token in handshake.auth, PARTICIPANT payload — stores the user and joins the participant personal channel', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(PARTICIPANT_JWT);
      const input = {
        client: createMockSocket({
          handshake: { auth: { token: 'valid-token' }, headers: {} },
        }),
      };
      const expected = {
        user: PARTICIPANT_JWT,
        joined: PARTICIPANT_CHANNEL,
      };

      await gateway.handleConnection(input.client);
      const actual = {
        user: (input.client.data as { user?: unknown }).user,
        joined: firstArg(input.client.join),
      };
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-access-secret',
      });
      expect(input.client.disconnect).not.toHaveBeenCalled();
      expect(input.client.emit).not.toHaveBeenCalled();
    });

    it('UT-handleConnection-02: token in handshake.auth, ORGANIZER payload — stores the user and joins the organizer personal channel', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(ORGANIZER_JWT);
      const input = {
        client: createMockSocket({
          handshake: { auth: { token: 'valid-token' }, headers: {} },
        }),
      };
      const expected = { user: ORGANIZER_JWT, joined: ORGANIZER_CHANNEL };

      await gateway.handleConnection(input.client);
      const actual = {
        user: (input.client.data as { user?: unknown }).user,
        joined: firstArg(input.client.join),
      };
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-handleConnection-03: token only in the Authorization header — the header path also works', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(PARTICIPANT_JWT);
      const input = {
        client: createMockSocket({
          handshake: {
            auth: {},
            headers: { authorization: 'Bearer header-token' },
          },
        }),
      };
      const expected = 'header-token';

      await gateway.handleConnection(input.client);
      const actual = jwtServiceMock.verifyAsync.mock.calls[0][0];
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(input.client.join).toHaveBeenCalledWith(PARTICIPANT_CHANNEL);
    });

    it('UT-handleConnection-04: verified payload without a role (profile not created) — user is stored but no channel is joined and the connection stays open', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(NO_PROFILE_JWT);
      const input = {
        client: createMockSocket({
          handshake: { auth: { token: 'valid-token' }, headers: {} },
        }),
      };
      const expected = NO_PROFILE_JWT;

      await gateway.handleConnection(input.client);
      const actual = (input.client.data as { user?: unknown }).user;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
      expect(input.client.join).not.toHaveBeenCalled();
      expect(input.client.disconnect).not.toHaveBeenCalled();
    });

    it('UT-handleConnection-05: PARTICIPANT role but no participant profile id — no channel is joined and the connection stays open', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(
        PARTICIPANT_WITHOUT_PROFILE_JWT,
      );
      const input = {
        client: createMockSocket({
          handshake: { auth: { token: 'valid-token' }, headers: {} },
        }),
      };

      await gateway.handleConnection(input.client);
      // console.log({ input });

      expect(input.client.join).not.toHaveBeenCalled();
      expect(input.client.disconnect).not.toHaveBeenCalled();
    });

    it('UT-handleConnection-06: no token anywhere — emits Unauthorized and disconnects without verifying', async () => {
      const input = { client: createMockSocket() };
      const expected = { message: 'Unauthorized' };

      await gateway.handleConnection(input.client);
      const actual = (input.client.emit as jest.Mock).mock
        .calls[0] as unknown[];
      // console.log({ input, expected, actual });

      expect(actual).toEqual(['error', expected]);
      expect(input.client.disconnect).toHaveBeenCalled();
      expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('UT-handleConnection-07: token present but verification fails — emits Unauthorized, disconnects, leaves the user unset and joins nothing', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('bad token'));
      const input = {
        client: createMockSocket({
          handshake: { auth: { token: 'invalid-token' }, headers: {} },
        }),
      };
      const expected = { message: 'Unauthorized' };

      await gateway.handleConnection(input.client);
      const actual = (input.client.emit as jest.Mock).mock
        .calls[0] as unknown[];
      // console.log({ input, expected, actual });

      expect(actual).toEqual(['error', expected]);
      expect(input.client.disconnect).toHaveBeenCalled();
      expect((input.client.data as { user?: unknown }).user).toBeUndefined();
      expect(input.client.join).not.toHaveBeenCalled();
    });

    // --- edge cases (documents current behavior) ---
    it('UT-handleConnection-08: joining the channel fails — handled like a failed login: Unauthorized is emitted and the client disconnected', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(PARTICIPANT_JWT);
      const input = {
        client: createMockSocket({
          handshake: { auth: { token: 'valid-token' }, headers: {} },
          join: jest.fn().mockRejectedValue(new Error('adapter down')),
        }),
      };
      const expected = { message: 'Unauthorized' };

      await gateway.handleConnection(input.client);
      const actual = (input.client.emit as jest.Mock).mock
        .calls[0] as unknown[];
      // console.log({ input, expected, actual });

      expect(actual).toEqual(['error', expected]);
      expect(input.client.disconnect).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // handleDisconnect
  // ==========================================================================
  describe('handleDisconnect', () => {
    it('UT-handleDisconnect-01: any client — only logs the disconnect, nothing is emitted', () => {
      const input = { client: createMockSocket() };
      const expected = 'Realtime socket disconnected: socket-1';
      logSpy.mockClear(); // drop the module-init log lines

      gateway.handleDisconnect(input.client);
      const actual = firstArg(logSpy);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
      expect(rig.emissions).toEqual([]);
      expect(input.client.emit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // handleAttendanceCheckedIn
  // ==========================================================================
  describe('handleAttendanceCheckedIn', () => {
    it.each([CheckInMethod.QR_SCAN, CheckInMethod.MANUAL])(
      'UT-handleAttendanceCheckedIn-01: %s check-in — organizer gets the row, counts and an analytics nudge; participant gets their ticket flipped to USED; nobody else',
      (method) => {
        const input = { payload: buildCheckedInPayload(method) };
        const expected = [
          {
            channel: ORGANIZER_CHANNEL,
            message: 'attendance:checkedIn',
            data: {
              eventId: EVENT_ID,
              attendanceId: ATTENDANCE_ID,
              registrationId: REGISTRATION_ID,
              method,
              checkedInAt: CHECKED_IN_AT,
              participantSnapshot: SNAPSHOT,
              counts: COUNTS,
            },
          },
          {
            channel: ORGANIZER_CHANNEL,
            message: 'analytics:changed',
            data: { eventId: EVENT_ID, reason: 'attendance' },
          },
          {
            channel: PARTICIPANT_CHANNEL,
            message: 'ticket:statusChanged',
            data: {
              eventId: EVENT_ID,
              registrationId: REGISTRATION_ID,
              ticketId: TICKET_ID,
              status: TicketStatus.USED,
              checkedInAt: CHECKED_IN_AT,
            },
          },
        ];

        gateway.handleAttendanceCheckedIn(input.payload);
        const actual = rig.emissions;
        // console.log({ input, expected, actual });

        expect(actual).toHaveLength(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));
      },
    );
  });

  // ==========================================================================
  // handleAttendanceUndone
  // ==========================================================================
  describe('handleAttendanceUndone', () => {
    it('UT-handleAttendanceUndone-01: undo — organizer gets a nudge and the undone row with counts; participant gets their ticket flipped back to ACTIVE; nobody else', () => {
      const input = { payload: UNDONE_PAYLOAD };
      const expected = [
        {
          channel: ORGANIZER_CHANNEL,
          message: 'analytics:changed',
          data: { eventId: EVENT_ID, reason: 'attendance' },
        },
        {
          channel: ORGANIZER_CHANNEL,
          message: 'attendance:undone',
          data: {
            eventId: EVENT_ID,
            registrationId: REGISTRATION_ID,
            counts: COUNTS,
          },
        },
        {
          channel: PARTICIPANT_CHANNEL,
          message: 'ticket:statusChanged',
          data: {
            eventId: EVENT_ID,
            registrationId: REGISTRATION_ID,
            ticketId: TICKET_ID,
            status: TicketStatus.ACTIVE,
            checkedInAt: null,
          },
        },
      ];

      gateway.handleAttendanceUndone(input.payload);
      const actual = rig.emissions;
      // console.log({ input, expected, actual });

      expect(actual).toHaveLength(expected.length);
      expect(actual).toEqual(expect.arrayContaining(expected));
    });
  });

  // ==========================================================================
  // handleRegistrationCreated / handleRegistrationCancelled / handleFeedbackSubmitted
  // ==========================================================================
  describe('analytics nudges', () => {
    it('UT-handleRegistrationCreated-01: registration created — only the organizer gets an analytics nudge with reason registration', () => {
      const input = { payload: REGISTRATION_PAYLOAD };
      const expected = [
        {
          channel: ORGANIZER_CHANNEL,
          message: 'analytics:changed',
          data: { eventId: EVENT_ID, reason: 'registration' },
        },
      ];

      gateway.handleRegistrationCreated(input.payload);
      const actual = rig.emissions;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-handleRegistrationCancelled-01: registration cancelled — only the organizer gets an analytics nudge with reason registration', () => {
      const input = { payload: REGISTRATION_PAYLOAD };
      const expected = [
        {
          channel: ORGANIZER_CHANNEL,
          message: 'analytics:changed',
          data: { eventId: EVENT_ID, reason: 'registration' },
        },
      ];

      gateway.handleRegistrationCancelled(input.payload);
      const actual = rig.emissions;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-handleFeedbackSubmitted-01: feedback submitted — only the organizer gets an analytics nudge with reason feedback', () => {
      const input = { payload: FEEDBACK_PAYLOAD };
      const expected = [
        {
          channel: ORGANIZER_CHANNEL,
          message: 'analytics:changed',
          data: { eventId: EVENT_ID, reason: 'feedback' },
        },
      ];

      gateway.handleFeedbackSubmitted(input.payload);
      const actual = rig.emissions;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-handleRegistrationCreated-02: empty organizer profile id — no channel can be built, so nothing is emitted and nothing throws', () => {
      const input = {
        payload: { ...REGISTRATION_PAYLOAD, organizerProfileId: '' },
      };
      const expected: unknown[] = [];

      gateway.handleRegistrationCreated(input.payload);
      const actual = rig.emissions;
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });
});
