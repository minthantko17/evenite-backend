import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { Event, EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationValidationService } from '../../registration/services/registration-validation.service';
import { DiscussionValidationService } from './discussion-validation.service';
import { RoomNotFoundException } from '../exceptions/room-not-found.exception';
import { RoomAccessDeniedException } from '../exceptions/room-access-denied.exception';
import { RoomReadOnlyException } from '../exceptions/room-read-only.exception';
import { MessageContentInvalidException } from '../exceptions/message-content-invalid.exception';
import { AnnouncementNotAllowedException } from '../exceptions/announcement-not-allowed.exception';
import { RegistrationNotFoundException } from '../../registration/exceptions/registration-not-found.exception';

const MOCK_ROOM_ID = 'e8946e7f-42a6-4586-9089-9267d0312bff';
const MOCK_EVENT_ID = '1fa29edd-3a7d-4d2c-bf8f-8521eb4e76b8';
const MOCK_ORGANIZER_PROFILE_ID = '084066b4-231a-4e1e-bb37-084d5ea66c8a';
const MOCK_PARTICIPANT_PROFILE_ID = 'bd8a4cbf-dd0f-4dce-a6b4-ee16618c4f44';
const MOCK_OTHER_ORGANIZER_PROFILE_ID = 'd1f5649f-cc81-4bdf-bcfc-ddb265b33de0';

const buildEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: MOCK_EVENT_ID,
    organizerId: MOCK_ORGANIZER_PROFILE_ID,
    status: EventStatus.PUBLISHED,
    startAt: null,
    endAt: null,
    ...overrides,
  }) as Event;

const HOUR_MS = 60 * 60 * 1000;

const prismaMock = mockDeep<PrismaService>();
const registrationValidationServiceMock =
  mockDeep<RegistrationValidationService>();

describe('DiscussionValidationService', () => {
  let service: DiscussionValidationService;

  beforeEach(async () => {
    mockReset(prismaMock);
    mockReset(registrationValidationServiceMock);
    jest.restoreAllMocks();

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

    service = module.get<DiscussionValidationService>(
      DiscussionValidationService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateRoomExists', () => {
    it('UT-6-001-01: a DiscussionRoom with this id exists → returns { roomId, event }', async () => {
      const event = buildEvent();
      prismaMock.discussionRoom.findUnique.mockResolvedValue({
        id: MOCK_ROOM_ID,
        eventId: MOCK_EVENT_ID,
        createdAt: new Date(),
        event,
      } as any);

      const result = await service.validateRoomExists(MOCK_ROOM_ID);

      expect(result).toEqual({ roomId: MOCK_ROOM_ID, event });
    });

    it('UT-6-001-02: no DiscussionRoom with this id exists → throws RoomNotFoundException', async () => {
      prismaMock.discussionRoom.findUnique.mockResolvedValue(null);

      await expect(service.validateRoomExists(MOCK_ROOM_ID)).rejects.toThrow(
        RoomNotFoundException,
      );
      await expect(service.validateRoomExists(MOCK_ROOM_ID)).rejects.toThrow(
        'Discussion room not found.',
      );
    });
  });

  describe('validateRoomAccess', () => {
    it('UT-6-002-01: RoleOrganizer + IsOwner → returns access-confirmation message', async () => {
      const event = buildEvent({ organizerId: MOCK_ORGANIZER_PROFILE_ID });

      const result = await service.validateRoomAccess(
        event,
        Role.ORGANIZER,
        null,
        MOCK_ORGANIZER_PROFILE_ID,
      );

      expect(result).toEqual({
        message: 'Organizer has access to this room.',
      });
      expect(
        registrationValidationServiceMock.validateConfirmedRegistration,
      ).not.toHaveBeenCalled();
    });

    it('UT-6-002-02: RoleOrganizer + not-owner → throws RoomAccessDeniedException', async () => {
      const event = buildEvent({ organizerId: MOCK_OTHER_ORGANIZER_PROFILE_ID });

      await expect(
        service.validateRoomAccess(
          event,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(RoomAccessDeniedException);
      await expect(
        service.validateRoomAccess(
          event,
          Role.ORGANIZER,
          null,
          MOCK_ORGANIZER_PROFILE_ID,
        ),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
    });

    it('UT-6-002-03: RoleOrganizer + organizerProfileId null → throws RoomAccessDeniedException', async () => {
      const event = buildEvent({ organizerId: MOCK_ORGANIZER_PROFILE_ID });

      await expect(
        service.validateRoomAccess(event, Role.ORGANIZER, null, null),
      ).rejects.toThrow(RoomAccessDeniedException);
      await expect(
        service.validateRoomAccess(event, Role.ORGANIZER, null, null),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
    });

    it('UT-6-002-04: RoleParticipant + HasParticipantId + ConfirmedReg → returns access-confirmation message', async () => {
      const event = buildEvent();
      registrationValidationServiceMock.validateConfirmedRegistration.mockResolvedValue(
        { message: 'Participant is confirmed for this event.' },
      );

      const result = await service.validateRoomAccess(
        event,
        Role.PARTICIPANT,
        MOCK_PARTICIPANT_PROFILE_ID,
        null,
      );

      expect(result).toEqual({
        message: 'Participant has access to this room.',
      });
      expect(
        registrationValidationServiceMock.validateConfirmedRegistration,
      ).toHaveBeenCalledWith(event.id, MOCK_PARTICIPANT_PROFILE_ID);
    });

    it('UT-6-002-05: RoleParticipant + HasParticipantId + not-confirmed → RegistrationNotFoundException bubbles', async () => {
      const event = buildEvent();
      registrationValidationServiceMock.validateConfirmedRegistration.mockRejectedValue(
        new RegistrationNotFoundException(),
      );

      await expect(
        service.validateRoomAccess(
          event,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow(RegistrationNotFoundException);
      await expect(
        service.validateRoomAccess(
          event,
          Role.PARTICIPANT,
          MOCK_PARTICIPANT_PROFILE_ID,
          null,
        ),
      ).rejects.toThrow('Registration not found.');
    });

    it('UT-6-002-06: RoleParticipant + participantProfileId null → throws RoomAccessDeniedException', async () => {
      const event = buildEvent();

      await expect(
        service.validateRoomAccess(event, Role.PARTICIPANT, null, null),
      ).rejects.toThrow(RoomAccessDeniedException);
      await expect(
        service.validateRoomAccess(event, Role.PARTICIPANT, null, null),
      ).rejects.toThrow(
        'You do not have permission to access this discussion room.',
      );
      expect(
        registrationValidationServiceMock.validateConfirmedRegistration,
      ).not.toHaveBeenCalled();
    });
  });

  describe('validateRoomWritable', () => {
    it('UT-6-003-01: PUBLISHED → writable', () => {
      const event = buildEvent({ status: EventStatus.PUBLISHED });

      const result = service.validateRoomWritable(event);

      expect(result).toEqual({ message: 'Discussion room is writable.' });
    });

    it('UT-6-003-02: ONGOING → writable', () => {
      const event = buildEvent({ status: EventStatus.ONGOING });

      const result = service.validateRoomWritable(event);

      expect(result).toEqual({ message: 'Discussion room is writable.' });
    });

    it('UT-6-003-03: DRAFT → writable', () => {
      const event = buildEvent({ status: EventStatus.DRAFT });

      const result = service.validateRoomWritable(event);

      expect(result).toEqual({ message: 'Discussion room is writable.' });
    });

    it('UT-6-003-04: CANCELLED → throws RoomReadOnlyException with cancellation message', () => {
      const event = buildEvent({ status: EventStatus.CANCELLED });

      expect(() => service.validateRoomWritable(event)).toThrow(
        RoomReadOnlyException,
      );
      expect(() => service.validateRoomWritable(event)).toThrow(
        'This event has been cancelled. The discussion room is read-only.',
      );
    });

    it('UT-6-003-05: CONCLUDED + HasEndAt + WithinGrace → writable', () => {
      const endAt = new Date('2026-08-01T00:00:00Z');
      const event = buildEvent({ status: EventStatus.CONCLUDED, endAt });
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(endAt.getTime() + 1 * HOUR_MS);

      const result = service.validateRoomWritable(event);

      expect(result).toEqual({ message: 'Discussion room is writable.' });
    });

    it('UT-6-003-06: CONCLUDED + HasEndAt + past 72h → throws with default message', () => {
      const endAt = new Date('2026-08-01T00:00:00Z');
      const event = buildEvent({ status: EventStatus.CONCLUDED, endAt });
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(endAt.getTime() + 73 * HOUR_MS);

      expect(() => service.validateRoomWritable(event)).toThrow(
        RoomReadOnlyException,
      );
      expect(() => service.validateRoomWritable(event)).toThrow(
        'This discussion room is read-only and no longer accepts new messages.',
      );
    });

    it('UT-6-003-07: CONCLUDED + NoEndAt + startAt present + WithinGrace → writable (reference = startAt + 6h)', () => {
      const startAt = new Date('2026-08-01T00:00:00Z');
      const event = buildEvent({
        status: EventStatus.CONCLUDED,
        endAt: null,
        startAt,
      });
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(startAt.getTime() + 6 * HOUR_MS + 1 * HOUR_MS);

      const result = service.validateRoomWritable(event);

      expect(result).toEqual({ message: 'Discussion room is writable.' });
    });

    it('UT-6-003-08: CONCLUDED + NoEndAt + startAt present + past 72h → throws', () => {
      const startAt = new Date('2026-08-01T00:00:00Z');
      const event = buildEvent({
        status: EventStatus.CONCLUDED,
        endAt: null,
        startAt,
      });
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(startAt.getTime() + 6 * HOUR_MS + 73 * HOUR_MS);

      expect(() => service.validateRoomWritable(event)).toThrow(
        RoomReadOnlyException,
      );
      expect(() => service.validateRoomWritable(event)).toThrow(
        'This discussion room is read-only and no longer accepts new messages.',
      );
    });

    it('UT-6-003-09: CONCLUDED + NoEndAt + startAt null + WithinGrace → writable (reference = epoch + 6h; edge case)', () => {
      const event = buildEvent({
        status: EventStatus.CONCLUDED,
        endAt: null,
        startAt: null,
      });
      jest.spyOn(Date, 'now').mockReturnValue(7 * HOUR_MS);

      const result = service.validateRoomWritable(event);

      expect(result).toEqual({ message: 'Discussion room is writable.' });
    });

    it('UT-6-003-10: CONCLUDED + NoEndAt + startAt null + past 72h → throws (realistic case)', () => {
      const event = buildEvent({
        status: EventStatus.CONCLUDED,
        endAt: null,
        startAt: null,
      });
      // real wall-clock "now" is trivially past epoch + 78h

      expect(() => service.validateRoomWritable(event)).toThrow(
        RoomReadOnlyException,
      );
      expect(() => service.validateRoomWritable(event)).toThrow(
        'This discussion room is read-only and no longer accepts new messages.',
      );
    });
  });

  describe('validateMessageContent', () => {
    it('UT-6-004-01: non-empty, length <= 2000 → returns the original content', () => {
      const result = service.validateMessageContent('hello world');

      expect(result).toBe('hello world');
    });

    it('UT-6-004-02: empty after trim ("", "   ") → throws "cannot be empty"', () => {
      expect(() => service.validateMessageContent('   ')).toThrow(
        MessageContentInvalidException,
      );
      expect(() => service.validateMessageContent('   ')).toThrow(
        'Message cannot be empty.',
      );
    });

    it('UT-6-004-03: length > 2000 chars after trim → throws "cannot exceed..."', () => {
      const tooLong = 'a'.repeat(2001);

      expect(() => service.validateMessageContent(tooLong)).toThrow(
        MessageContentInvalidException,
      );
      expect(() => service.validateMessageContent(tooLong)).toThrow(
        /cannot exceed/,
      );
    });

    it('UT-6-004-04: exactly 2000 chars after trim (boundary) → passes', () => {
      const exactly2000 = 'a'.repeat(2000);

      expect(() => service.validateMessageContent(exactly2000)).not.toThrow();
    });

    it('UT-6-004-05: exactly 2001 chars after trim (boundary) → throws', () => {
      const exactly2001 = 'a'.repeat(2001);

      expect(() => service.validateMessageContent(exactly2001)).toThrow(
        MessageContentInvalidException,
      );
      expect(() => service.validateMessageContent(exactly2001)).toThrow(
        'Message cannot exceed 2000 characters.',
      );
    });

    it('UT-6-004-06: leading/trailing whitespace, valid once trimmed → passes, returns original (untrimmed) content', () => {
      const padded = '  hello  ';

      const result = service.validateMessageContent(padded);

      expect(result).toBe(padded);
    });
  });

  describe('validateAnnouncementPermission', () => {
    it('UT-6-005-01: NotAnnouncing + ORGANIZER → returns false', () => {
      const result = service.validateAnnouncementPermission(
        false,
        Role.ORGANIZER,
      );

      expect(result).toBe(false);
    });

    it('UT-6-005-02: NotAnnouncing + PARTICIPANT → returns false (role irrelevant)', () => {
      const result = service.validateAnnouncementPermission(
        false,
        Role.PARTICIPANT,
      );

      expect(result).toBe(false);
    });

    it('UT-6-005-03: Announcing + RoleOrganizer → returns true', () => {
      const result = service.validateAnnouncementPermission(
        true,
        Role.ORGANIZER,
      );

      expect(result).toBe(true);
    });

    it('UT-6-005-04: Announcing + RoleParticipant → throws AnnouncementNotAllowedException', () => {
      expect(() =>
        service.validateAnnouncementPermission(true, Role.PARTICIPANT),
      ).toThrow(AnnouncementNotAllowedException);
      expect(() =>
        service.validateAnnouncementPermission(true, Role.PARTICIPANT),
      ).toThrow('Only the organizer can send announcements.');
    });
  });
});
