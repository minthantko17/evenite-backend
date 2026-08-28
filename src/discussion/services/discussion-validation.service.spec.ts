import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationValidationService } from '../../registration/services/registration-validation.service';
import { RegistrationNotFoundException } from '../../registration/exceptions/registration-not-found.exception';
import { DiscussionValidationService } from './discussion-validation.service';
import { RoomNotFoundException } from '../exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from '../exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from '../exceptions/room-read-only.exception';
import { MessageContentInvalidException } from '../exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from '../exceptions/announcement-not-allowed.exception';
import {
  USERS,
  EVENT_ROOM,
  EVENT_PUBLISHED,
  EVENT_CANCELLED,
  CONCLUDED_END_AT,
  CONCLUDED_START_AT,
  EVENT_CONCLUDED_WITH_END_AT,
  EVENT_CONCLUDED_NO_END_AT_WITH_START,
  EVENT_CONCLUDED_NO_END_NO_START,
  ROOM_ID,
  NOT_FOUND_ROOM_ID,
  HOUR_MS,
  applyCentralMockImplementations,
} from './discussion-validation.service.mock-db';

// This spec sources its fixtures from ./discussion-validation.service.mock-db.ts
// — a single centralized "mock database" (EVENT_ROOM + confirmed/unconfirmed
// participants for validateRoomAccess, status-driven Event fixtures for
// validateRoomWritable, a ROOM_ID/NOT_FOUND_ROOM_ID pair for
// validateRoomExists). PrismaService and RegistrationValidationService are
// wired from those fixtures via applyCentralMockImplementations, so most
// tests just call the service against a fixture id/event and assert.
//
// Within each describe block, happy-path cases come first, followed by
// error cases.

const prismaMock = mockDeep<PrismaService>();
const registrationValidationServiceMock = mockDeep<RegistrationValidationService>();

describe('DiscussionValidationService', () => {
  let service: DiscussionValidationService;

  beforeEach(async () => {
    mockReset(prismaMock);
    mockReset(registrationValidationServiceMock);
    jest.restoreAllMocks();
    applyCentralMockImplementations(prismaMock, registrationValidationServiceMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionValidationService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: RegistrationValidationService,
          useValue: registrationValidationServiceMock,
        },
      ],
    }).compile();

    service = module.get<DiscussionValidationService>(DiscussionValidationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // validateRoomExists
  // ==========================================================================
  describe('validateRoomExists', () => {
    it('UT-validateRoomExists-01: room found — resolves { roomId, event }', async () => {
      const result = await service.validateRoomExists(ROOM_ID);

      const expected = { roomId: ROOM_ID, event: EVENT_ROOM };
      expect(result).toEqual(expected);
    });

    it('UT-validateRoomExists-02 [error]: room not found — throws RoomNotFoundException', async () => {
      const promise = service.validateRoomExists(NOT_FOUND_ROOM_ID);

      await expect(promise).rejects.toThrow(RoomNotFoundException);
      await expect(promise).rejects.toThrow('Discussion room not found.');
    });
  });

  // ==========================================================================
  // validateRoomAccess
  // ==========================================================================
  describe('validateRoomAccess', () => {
    it('UT-validateRoomAccess-01: ORGANIZER, owner — resolves the organizer access-confirmation message, skips the registration check', async () => {
      const result = await service.validateRoomAccess(
        EVENT_ROOM,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_MAIN.id,
      );

      const expected = { message: 'Organizer has access to this room.' };
      expect(result).toEqual(expected);
      expect(
        registrationValidationServiceMock.validateConfirmedRegistration,
      ).not.toHaveBeenCalled();
    });

    it('UT-validateRoomAccess-02: PARTICIPANT, confirmed registration — resolves the participant access-confirmation message', async () => {
      const result = await service.validateRoomAccess(
        EVENT_ROOM,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_MAIN.id,
        null,
      );

      const expected = { message: 'Participant has access to this room.' };
      expect(result).toEqual(expected);
      expect(
        registrationValidationServiceMock.validateConfirmedRegistration,
      ).toHaveBeenCalledWith(EVENT_ROOM.id, USERS.PARTICIPANT_MAIN.id);
    });

    it('UT-validateRoomAccess-03 [error]: PARTICIPANT, registration not confirmed — the collaborator exception bubbles up unwrapped', async () => {
      const promise = service.validateRoomAccess(
        EVENT_ROOM,
        Role.PARTICIPANT,
        USERS.PARTICIPANT_OTHER.id,
        null,
      );

      await expect(promise).rejects.toThrow(RegistrationNotFoundException);
      await expect(promise).rejects.toThrow('Registration not found.');
    });

    it('UT-validateRoomAccess-04 [error]: ORGANIZER, not the owner — throws RoomAccessDeniedException', async () => {
      const promise = service.validateRoomAccess(
        EVENT_ROOM,
        Role.ORGANIZER,
        null,
        USERS.ORGANIZER_OTHER.id,
      );

      await expect(promise).rejects.toThrow(RoomAccessDeniedException);
      await expect(promise).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
    });

    it('UT-validateRoomAccess-05 [error] [single]: ORGANIZER, organizerProfileId null — falls through to RoomAccessDeniedException', async () => {
      const promise = service.validateRoomAccess(EVENT_ROOM, Role.ORGANIZER, null, null);

      await expect(promise).rejects.toThrow(RoomAccessDeniedException);
      await expect(promise).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
    });

    it('UT-validateRoomAccess-06 [error] [single]: PARTICIPANT, participantProfileId null — throws RoomAccessDeniedException without calling the registration check', async () => {
      const promise = service.validateRoomAccess(EVENT_ROOM, Role.PARTICIPANT, null, null);

      await expect(promise).rejects.toThrow(RoomAccessDeniedException);
      await expect(promise).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
      expect(
        registrationValidationServiceMock.validateConfirmedRegistration,
      ).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // validateRoomWritable
  // ==========================================================================
  describe('validateRoomWritable', () => {
    it('UT-validateRoomWritable-01 [single]: PUBLISHED/ONGOING/DRAFT — writable without any time computation', () => {
      const result = service.validateRoomWritable(EVENT_PUBLISHED);

      const expected = { message: 'Discussion room is writable.' };
      expect(result).toEqual(expected);
    });

    it('UT-validateRoomWritable-02: CONCLUDED, endAt present, within the 72h grace period — writable', () => {
      jest.spyOn(Date, 'now').mockReturnValue(CONCLUDED_END_AT.getTime() + 1 * HOUR_MS);

      const result = service.validateRoomWritable(EVENT_CONCLUDED_WITH_END_AT);

      const expected = { message: 'Discussion room is writable.' };
      expect(result).toEqual(expected);
    });

    it('UT-validateRoomWritable-03: CONCLUDED, no endAt, startAt present, within grace — writable (reference = startAt + 6h)', () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(CONCLUDED_START_AT.getTime() + 6 * HOUR_MS + 1 * HOUR_MS);

      const result = service.validateRoomWritable(EVENT_CONCLUDED_NO_END_AT_WITH_START);

      const expected = { message: 'Discussion room is writable.' };
      expect(result).toEqual(expected);
    });

    it('UT-validateRoomWritable-04 [single]: CONCLUDED, no endAt, no startAt, within grace — writable (degenerate reference = epoch + 6h)', () => {
      jest.spyOn(Date, 'now').mockReturnValue(6 * HOUR_MS + 1 * HOUR_MS);

      const result = service.validateRoomWritable(EVENT_CONCLUDED_NO_END_NO_START);

      const expected = { message: 'Discussion room is writable.' };
      expect(result).toEqual(expected);
    });

    it('UT-validateRoomWritable-05 [single]: CONCLUDED, endAt present, now exactly at the 72h threshold — still writable (strict > check)', () => {
      jest.spyOn(Date, 'now').mockReturnValue(CONCLUDED_END_AT.getTime() + 72 * HOUR_MS);

      const result = service.validateRoomWritable(EVENT_CONCLUDED_WITH_END_AT);

      const expected = { message: 'Discussion room is writable.' };
      expect(result).toEqual(expected);
    });

    it('UT-validateRoomWritable-06 [error]: CANCELLED — throws RoomReadOnlyException with the cancellation-specific message', () => {
      expect(() => service.validateRoomWritable(EVENT_CANCELLED)).toThrow(RoomReadOnlyException);
      expect(() => service.validateRoomWritable(EVENT_CANCELLED)).toThrow(
        'This event has been cancelled. The discussion room is read-only.',
      );
    });

    it('UT-validateRoomWritable-07 [error]: CONCLUDED, endAt present, past the 72h grace period — throws with the default read-only message', () => {
      jest.spyOn(Date, 'now').mockReturnValue(CONCLUDED_END_AT.getTime() + 73 * HOUR_MS);

      expect(() => service.validateRoomWritable(EVENT_CONCLUDED_WITH_END_AT)).toThrow(
        RoomReadOnlyException,
      );
      expect(() => service.validateRoomWritable(EVENT_CONCLUDED_WITH_END_AT)).toThrow(
        'This discussion room is read-only and no longer accepts new messages.',
      );
    });

    it('UT-validateRoomWritable-08 [error]: CONCLUDED, no endAt, startAt present, past grace — throws (reference = startAt + 6h)', () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(CONCLUDED_START_AT.getTime() + 6 * HOUR_MS + 73 * HOUR_MS);

      expect(() => service.validateRoomWritable(EVENT_CONCLUDED_NO_END_AT_WITH_START)).toThrow(
        RoomReadOnlyException,
      );
      expect(() => service.validateRoomWritable(EVENT_CONCLUDED_NO_END_AT_WITH_START)).toThrow(
        'This discussion room is read-only and no longer accepts new messages.',
      );
    });
  });

  // ==========================================================================
  // validateMessageContent
  // ==========================================================================
  describe('validateMessageContent', () => {
    it('UT-validateMessageContent-01: non-empty, within the max length — returns the content unchanged', () => {
      const result = service.validateMessageContent('hello world');

      const expected = 'hello world';
      expect(result).toBe(expected);
    });

    it('UT-validateMessageContent-02 [single]: leading/trailing whitespace, valid once trimmed — returns the original (untrimmed) content', () => {
      const padded = '  hello  ';

      const result = service.validateMessageContent(padded);

      const expected = padded;
      expect(result).toBe(expected);
    });

    it('UT-validateMessageContent-03 [single]: exactly 2000 characters after trim (boundary) — passes', () => {
      const exactly2000 = 'a'.repeat(2000);

      expect(() => service.validateMessageContent(exactly2000)).not.toThrow();
    });

    it('UT-validateMessageContent-04 [error]: empty after trim — throws MessageContentInvalidException', () => {
      expect(() => service.validateMessageContent('   ')).toThrow(
        MessageContentInvalidException,
      );
      expect(() => service.validateMessageContent('   ')).toThrow('Message cannot be empty.');
    });

    it('UT-validateMessageContent-05 [error] [single]: exactly 2001 characters after trim (boundary) — throws', () => {
      const exactly2001 = 'a'.repeat(2001);

      expect(() => service.validateMessageContent(exactly2001)).toThrow(
        MessageContentInvalidException,
      );
      expect(() => service.validateMessageContent(exactly2001)).toThrow(
        'Message cannot exceed 2000 characters.',
      );
    });
  });

  // ==========================================================================
  // validateAnnouncementSenderRole
  // ==========================================================================
  describe('validateAnnouncementSenderRole', () => {
    it('UT-validateAnnouncementSenderRole-01: ORGANIZER — returns the announcement-permission success message', () => {
      const result = service.validateAnnouncementSenderRole(Role.ORGANIZER);

      const expected = { message: 'Organizer can send announcements.' };
      expect(result).toEqual(expected);
    });

    it('UT-validateAnnouncementSenderRole-02 [error]: PARTICIPANT — throws AnnouncementNotAllowedException', () => {
      expect(() => service.validateAnnouncementSenderRole(Role.PARTICIPANT)).toThrow(
        AnnouncementNotAllowedException,
      );
      expect(() => service.validateAnnouncementSenderRole(Role.PARTICIPANT)).toThrow(
        'Only the organizer can send announcements.',
      );
    });
  });
});
