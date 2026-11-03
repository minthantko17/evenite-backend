import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Socket } from 'socket.io';
import {
  buildPersonalChannel,
  extractTokenFromHandshake,
  socketCorsOptions,
} from './socket.utils';

// Pure helpers: sockets are plain fake objects shaped like
// { handshake: { auth, headers } }. socketCorsOptions.origin reads
// process.env.FRONTEND_URL, which is saved and restored around every test.
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, regular cases come first, followed by error
// cases and edge cases that document current behavior.

const fakeClient = (handshake: {
  auth?: { token?: string };
  headers?: { authorization?: string };
}) => ({ handshake }) as unknown as Socket;

describe('SocketUtils', () => {
  // ==========================================================================
  // extractTokenFromHandshake
  // ==========================================================================
  describe('extractTokenFromHandshake', () => {
    it('UT-extractTokenFromHandshake-01: token in handshake.auth — returns it', () => {
      const input = {
        client: fakeClient({ auth: { token: 'auth-token' }, headers: {} }),
      };
      const expected = 'auth-token';

      const actual = extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    it('UT-extractTokenFromHandshake-02: no auth token, Bearer authorization header — returns the token without the prefix', () => {
      const input = {
        client: fakeClient({
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        }),
      };
      const expected = 'header-token';

      const actual = extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    it('UT-extractTokenFromHandshake-03: auth token and header both present — the auth token wins', () => {
      const input = {
        client: fakeClient({
          auth: { token: 'auth-token' },
          headers: { authorization: 'Bearer header-token' },
        }),
      };
      const expected = 'auth-token';

      const actual = extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    it('UT-extractTokenFromHandshake-04: empty auth token and a header — falls back to the header', () => {
      const input = {
        client: fakeClient({
          auth: { token: '' },
          headers: { authorization: 'Bearer header-token' },
        }),
      };
      const expected = 'header-token';

      const actual = extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    it('UT-extractTokenFromHandshake-05: handshake.auth undefined, Bearer header — returns the header token', () => {
      const input = {
        client: fakeClient({
          headers: { authorization: 'Bearer header-token' },
        }),
      };
      const expected = 'header-token';

      const actual = extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });

    it('UT-extractTokenFromHandshake-06: neither auth token nor header — throws UnauthorizedException', () => {
      const input = { client: fakeClient({ auth: {}, headers: {} }) };
      const expected = 'No token provided';

      const actual = () => extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toThrow(UnauthorizedException);
      expect(actual).toThrow(expected);
    });

    it('UT-extractTokenFromHandshake-07: auth and headers both undefined — throws UnauthorizedException', () => {
      const input = { client: fakeClient({}) };
      const expected = 'No token provided';

      const actual = () => extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toThrow(UnauthorizedException);
      expect(actual).toThrow(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-extractTokenFromHandshake-08: header without the Bearer prefix — returned unchanged', () => {
      const input = {
        client: fakeClient({ headers: { authorization: 'raw-token' } }),
      };
      const expected = 'raw-token';

      const actual = extractTokenFromHandshake(input.client);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // buildPersonalChannel
  // ==========================================================================
  describe('buildPersonalChannel', () => {
    it.each([
      [Role.ORGANIZER, 'user:ORGANIZER:profile-1'],
      [Role.PARTICIPANT, 'user:PARTICIPANT:profile-1'],
    ])(
      'UT-buildPersonalChannel-01: role %s with a profile id — returns user:<role>:<id>',
      (role, expectedChannel) => {
        const input = { role, profileId: 'profile-1' };
        const expected = expectedChannel;

        const actual = buildPersonalChannel(input.role, input.profileId);
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
      },
    );

    it.each([
      ['null role', null, 'profile-1'],
      ['null profile id', Role.ORGANIZER, null],
      ['both null', null, null],
    ])(
      'UT-buildPersonalChannel-02: %s — returns null',
      (_label, role, profileId) => {
        const input = { role, profileId };
        const expected = null;

        const actual = buildPersonalChannel(input.role, input.profileId);
        // console.log({ input, expected, actual });

        expect(actual).toBe(expected);
      },
    );

    // --- edge cases (documents current behavior) ---
    it('UT-buildPersonalChannel-03: empty-string profile id — returns null', () => {
      const input = { role: Role.ORGANIZER, profileId: '' };
      const expected = null;

      const actual = buildPersonalChannel(input.role, input.profileId);
      // console.log({ input, expected, actual });

      expect(actual).toBe(expected);
    });
  });

  // ==========================================================================
  // socketCorsOptions
  // ==========================================================================
  describe('socketCorsOptions', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    afterEach(() => {
      if (originalFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    });

    // runs the origin callback and returns the arguments it was called with
    const checkOrigin = (origin: string | undefined) => {
      const callback = jest.fn();
      socketCorsOptions.origin(origin, callback);
      return callback.mock.calls[0] as [Error | null, boolean];
    };

    it('UT-socketCorsOptions-01: credentials are enabled', () => {
      const expected = true;

      const actual = socketCorsOptions.credentials;
      // console.log({ expected, actual });

      expect(actual).toBe(expected);
    });

    it('UT-socketCorsOptions-02: FRONTEND_URL unset, default origin — allowed', () => {
      delete process.env.FRONTEND_URL;
      const input = { origin: 'http://localhost:5173' };
      const expected = [null, true];

      const actual = checkOrigin(input.origin);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-socketCorsOptions-03: FRONTEND_URL set to one origin, that origin — allowed', () => {
      process.env.FRONTEND_URL = 'https://evenite.example.com';
      const input = { origin: 'https://evenite.example.com' };
      const expected = [null, true];

      const actual = checkOrigin(input.origin);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it.each(['https://a.example.com', 'https://b.example.com'])(
      'UT-socketCorsOptions-04: several comma-separated origins with spaces, origin %s — allowed',
      (origin) => {
        process.env.FRONTEND_URL =
          'https://a.example.com , https://b.example.com';
        const input = { origin };
        const expected = [null, true];

        const actual = checkOrigin(input.origin);
        // console.log({ input, expected, actual });

        expect(actual).toEqual(expected);
      },
    );

    it('UT-socketCorsOptions-05: no origin (non-browser client) — allowed', () => {
      process.env.FRONTEND_URL = 'https://evenite.example.com';
      const input = { origin: undefined };
      const expected = [null, true];

      const actual = checkOrigin(input.origin);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-socketCorsOptions-06: an origin not in the list — not allowed', () => {
      process.env.FRONTEND_URL = 'https://evenite.example.com';
      const input = { origin: 'https://evil.example.com' };
      const expected = [null, false];

      const actual = checkOrigin(input.origin);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });

    it('UT-socketCorsOptions-07: FRONTEND_URL set to something else, the default origin — not allowed', () => {
      process.env.FRONTEND_URL = 'https://evenite.example.com';
      const input = { origin: 'http://localhost:5173' };
      const expected = [null, false];

      const actual = checkOrigin(input.origin);
      // console.log({ input, expected, actual });

      expect(actual).toEqual(expected);
    });
  });
});
