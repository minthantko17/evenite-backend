import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationValidationService } from './registration-validation.service';
import { AlreadyRegisteredException } from '../exceptions/already-registered.exception';
import { EventNotRegisterableException } from '../exceptions/event-not-registerable.exception';
import { RegistrationAlreadyCancelledException } from '../exceptions/registration-already-cancelled.exception';
import { RegistrationNotFoundException } from '../exceptions/registration-not-found.exception';
import { RegistrationNotCancellableException } from '../exceptions/registration-not-cancellable.exception';
import { TicketNotFoundException } from '../exceptions/ticket-not-found.exception';
import {
  MOCK_EVENT_ID,
  MOCK_PARTICIPANT_PROFILE_ID,
  MOCK_TICKET_ID,
  MOCK_OTHER_PARTICIPANT_ID,
  MOCK_CONFIRMED_REGISTRATION,
  MOCK_CANCELLED_REGISTRATION,
  MOCK_PUBLISHED_EVENT,
  MOCK_ONGOING_EVENT,
  MOCK_CONCLUDED_EVENT,
  MOCK_CANCELLED_EVENT,
  MOCK_DRAFT_EVENT,
  MOCK_PAST_DATE,
  MOCK_FUTURE_DATE,
} from './registration.mocks';
import { ForbiddenException } from '@nestjs/common';

const prismaMock = mockDeep<PrismaService>();

describe('RegistrationValidationService', () => {
  let service: RegistrationValidationService;

  beforeEach(async () => {
    mockReset(prismaMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationValidationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RegistrationValidationService>(
      RegistrationValidationService,
    );
  });

  describe('validateEventRegisterable', () => {
    it('UT-5-001-01: returns message when event is PUBLISHED', () => {
      const result = service.validateEventRegisterable(EventStatus.PUBLISHED);
      expect(result).toEqual({ message: 'Event is accepting registrations.' });
    });

    it('UT-5-001-02: returns message when event is ONGOING', () => {
      const result = service.validateEventRegisterable(EventStatus.ONGOING);
      expect(result).toEqual({ message: 'Event is accepting registrations.' });
    });

    it('UT-5-001-03: throws EventNotRegisterableException when event is DRAFT', () => {
      const error = () => {
        service.validateEventRegisterable(EventStatus.DRAFT);
      };
      expect(error).toThrow(EventNotRegisterableException);
      expect(error).toThrow(
        'This event is not currently accepting registrations.',
      );
    });

    it('UT-5-001-04: throws EventNotRegisterableException when event is CONCLUDED', () => {
      const error = () => {
        service.validateEventRegisterable(EventStatus.CONCLUDED);
      };
      expect(error).toThrow(EventNotRegisterableException);
      expect(error).toThrow(
        'This event is not currently accepting registrations.',
      );
    });

    it('UT-5-001-05: throws EventNotRegisterableException when event is CANCELLED', () => {
      const error = () => {
        service.validateEventRegisterable(EventStatus.CANCELLED);
      };
      expect(error).toThrow(EventNotRegisterableException);
      expect(error).toThrow(
        'This event is not currently accepting registrations.',
      );
    });
  });

  describe('validateNotAlreadyRegistered', () => {
    it('UT-5-002-01: returns message when no existing registration', async () => {
      prismaMock.eventRegistration.findUnique.mockResolvedValue(null);

      const result = await service.validateNotAlreadyRegistered(
        MOCK_EVENT_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual({
        message: 'Participant is not already registered.',
      });
    });

    it('UT-5-002-02: returns message when existing registration is CANCELLED', async () => {
      prismaMock.eventRegistration.findUnique.mockResolvedValue(
        MOCK_CANCELLED_REGISTRATION as any,
      );

      const result = await service.validateNotAlreadyRegistered(
        MOCK_EVENT_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );

      expect(result).toEqual({
        message: 'Participant is not already registered.',
      });
    });

    it('UT-5-002-03: throws AlreadyRegisteredException when existing registration is CONFIRMED', async () => {
      prismaMock.eventRegistration.findUnique.mockResolvedValue(
        MOCK_CONFIRMED_REGISTRATION as any,
      );

      const error = async () => {
        await service.validateNotAlreadyRegistered(
          MOCK_EVENT_ID,
          MOCK_PARTICIPANT_PROFILE_ID,
        );
      };
      expect(error).rejects.toThrow(AlreadyRegisteredException);
      expect(error).rejects.toThrow(
        'You have already registered for this event.',
      );
    });
  });

  describe('validateCancellable', () => {
    it('UT-5-003-01: returns message for CONFIRMED registration and PUBLISHED event with future startAt', () => {
      const result = service.validateCancellable(
        { status: RegistrationStatus.CONFIRMED },
        { status: EventStatus.PUBLISHED, startAt: MOCK_FUTURE_DATE },
      );
      expect(result).toEqual({ message: 'Registration can be cancelled.' });
    });

    it('UT-5-003-02: returns message when startAt is null', () => {
      const result = service.validateCancellable(
        { status: RegistrationStatus.CONFIRMED },
        { status: EventStatus.PUBLISHED, startAt: null },
      );
      expect(result).toEqual({ message: 'Registration can be cancelled.' });
    });

    it('UT-5-003-03: throws RegistrationAlreadyCancelledException when registration is CANCELLED', () => {
      const error = () => {
        service.validateCancellable(
          { status: RegistrationStatus.CANCELLED },
          { status: EventStatus.PUBLISHED, startAt: MOCK_FUTURE_DATE },
        );
      };

      expect(error).toThrow(RegistrationAlreadyCancelledException);
      expect(error).toThrow('Registration has already been cancelled.');
    });

    it('UT-5-003-04: throws RegistrationNotCancellableException when event is ONGOING', () => {
      const error = () => {
        service.validateCancellable(
          { status: RegistrationStatus.CONFIRMED },
          { status: EventStatus.ONGOING, startAt: MOCK_FUTURE_DATE },
        );
      };
      expect(error).toThrow(RegistrationNotCancellableException);
      expect(error).toThrow('Cannot cancel after event has started or ended.');
    });

    it('UT-5-003-05: throws RegistrationNotCancellableException when event is CONCLUDED', () => {
      const error = () => {
        service.validateCancellable(
          { status: RegistrationStatus.CONFIRMED },
          { status: EventStatus.CONCLUDED, startAt: MOCK_PAST_DATE },
        );
      };
      expect(error).toThrow(RegistrationNotCancellableException);
      expect(error).toThrow('Cannot cancel after event has started or ended.');
    });

    it('UT-5-003-06: throws RegistrationNotCancellableException when event is CANCELLED', () => {
      const error = () => {
        service.validateCancellable(
          { status: RegistrationStatus.CONFIRMED },
          { status: EventStatus.CANCELLED, startAt: MOCK_FUTURE_DATE },
        );
      };
      expect(error).toThrow(RegistrationNotCancellableException);
      expect(error).toThrow('Cannot cancel after event has started or ended.');
    });

    it('UT-5-003-07: throws RegistrationNotCancellableException when startAt has passed', () => {
      const error = () => {
        service.validateCancellable(
          { status: RegistrationStatus.CONFIRMED },
          { status: EventStatus.PUBLISHED, startAt: MOCK_PAST_DATE },
        );
      };
      expect(error).toThrow(RegistrationNotCancellableException);
      expect(error).toThrow('Cannot cancel after event start time has passed.');
    });
  });

  describe('validateTicketOwnership', () => {
    it('UT-5-004-01: returns message when ticket belongs to participant', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({
        eventRegistration: { participantId: MOCK_PARTICIPANT_PROFILE_ID },
      } as any);

      const result = await service.validateTicketOwnership(
        MOCK_TICKET_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );
      expect(result).toEqual({ message: 'Ticket ownership validated.' });
    });

    it('UT-5-004-02: throws RegistrationNotFoundException when ticket does not exist', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const error = async () => {
        await service.validateTicketOwnership(
          MOCK_TICKET_ID,
          MOCK_PARTICIPANT_PROFILE_ID,
        );
      };
      expect(error).rejects.toThrow(RegistrationNotFoundException);
      expect(error).rejects.toThrow('Registration not found.');
    });

    it('UT-5-004-03: throws RegistrationNotFoundException when ticket belongs to different participant', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({
        eventRegistration: { participantId: MOCK_OTHER_PARTICIPANT_ID },
      } as any);

      const error = async () => {
        await service.validateTicketOwnership(
          MOCK_TICKET_ID,
          MOCK_PARTICIPANT_PROFILE_ID,
        );
      };
      await expect(error()).rejects.toThrow(RegistrationNotFoundException);
      await expect(error()).rejects.toThrow('Registration not found.');
    });

    it('UT-5-004-04: throws RegistratioinNotFoundException when ticket id is empty string', async () => {
      const error = async () => {
        await service.validateTicketOwnership('', MOCK_PARTICIPANT_PROFILE_ID);
      };
      await expect(error()).rejects.toThrow(RegistrationNotFoundException);
      await expect(error()).rejects.toThrow('Registration not found.');
    });

    it('UT-5-004-05: throws RegistratioinNotFoundException when participant id is empty string', async () => {
      const error = async () => {
        await service.validateTicketOwnership(MOCK_TICKET_ID, '');
      };
      await expect(error()).rejects.toThrow(RegistrationNotFoundException);
      await expect(error()).rejects.toThrow('Registration not found.');
    });
  });
});
