import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import {
  EventStatus,
  FieldType,
  RegistrationStatus,
  TicketStatus,
  Prisma,
} from '@prisma/client';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationCrudService } from './registration-crud.service';
import { EventFullException } from '../exceptions/event-full.exception';
import { EventNotFoundException } from '../../event/exceptions/event-not-found.exception';
import { RegistrationNotFoundException } from '../exceptions/registration-not-found.exception';
import { TicketNotFoundException } from '../exceptions/ticket-not-found.exception';
import { SaveRegistrationException } from '../exceptions/save-registration.exception';
import { SaveTicketException } from '../exceptions/save-ticket.exception';
import { DeleteRegistrationException } from '../exceptions/delete-registration.exception';
import { SaveFormResponseException } from '../../form/exceptions/save-form-response.exception';
import {
  MOCK_EVENT_ID,
  MOCK_PARTICIPANT_PROFILE_ID,
  MOCK_ORGANIZER_PROFILE_ID,
  MOCK_REGISTRATION_ID,
  MOCK_TICKET_ID,
  MOCK_FORM_ID,
  MOCK_FIELD_ID_FIRSTNAME,
  MOCK_FIELD_ID_STUDENTID,
  MOCK_FIELD_ID_LASTNAME,
  MOCK_FIELD_ID_NICKNAME,
  MOCK_FIELD_ID_MAJOR,
  MOCK_QR_TOKEN,
  MOCK_PARTICIPANT_SNAPSHOT,
  MOCK_FUTURE_DATE,
  MOCK_FUTURE_END_DATE,
  MOCK_CREATED_AT,
  MOCK_ISSUED_AT,
  MOCK_PUBLISHED_EVENT,
  MOCK_FULL_EVENT,
  MOCK_EVENT_WITH_ORGANIZER,
  MOCK_CONFIRMED_REGISTRATION,
  MOCK_CANCELLED_REGISTRATION,
  MOCK_ACTIVE_TICKET,
  MOCK_CANCELLED_TICKET,
  MOCK_FIRSTNAME_FIELD,
  MOCK_STUDENTID_FIELD,
  MOCK_LASTNAME_FIELD,
  MOCK_NICKNAME_FIELD,
  MOCK_MAJOR_FIELD,
  MOCK_CHOICE_FIELD,
  MOCK_NUMBER_FIELD,
  MOCK_VALID_ANSWERS,
  MOCK_PARTICIPANT_PROFILE,
  MOCK_REGISTRATION_ID_2,
  MOCK_REGISTRATION_ID_3,
  MOCK_TICKET_ID_2,
  MOCK_TICKET_ID_3,
  MOCK_EVENT_ID_2,
  MOCK_ISSUED_AT_2,
  MOCK_ISSUED_AT_3,
  MOCK_CREATED_AT_2,
  MOCK_CREATED_AT_3,
  MOCK_PARTICIPANT_SNAPSHOT_2,
  MOCK_PARTICIPANT_SNAPSHOT_3,
  MOCK_ONGOING_EVENT_2,
  MOCK_CONCLUDED_EVENT_2,
  MOCK_REG_WITH_TICKET_PAR1,
  MOCK_REG_WITH_TICKET_PAR2,
  MOCK_REG_WITH_TICKET_PAR3,
  MOCK_REG_WITH_EVENT_PAR1_EVT1,
  MOCK_REG_WITH_EVENT_PAR1_EVT2,
  MOCK_TICKET_WITH_REG_ACTIVE,
  MOCK_TICKET_WITH_REG_ACTIVE_2,
  MOCK_TICKET_WITH_REG_EXPIRED,
  MOCK_TICKET_WITH_REG_CANCELLED,
  MOCK_REG_WITH_TICKET_AND_EVENT,
  MOCK_TICKET_WITH_ALL,
} from './registration.mocks';
import { SaveEventException } from '../../event/exceptions/save-event.exception';

const prismaMock = mockDeep<PrismaService>();

// mock tx that mirrors prismaMock structure for transaction tests
const mockTx = mockDeep<Prisma.TransactionClient>();

// describe('RegistrationCrudService', () => {
let service: RegistrationCrudService;

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
});

beforeEach(async () => {
  mockReset(prismaMock);
  mockReset(mockTx);

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RegistrationCrudService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();

  service = module.get<RegistrationCrudService>(RegistrationCrudService);
});

describe('countConfirmedRegistrations', () => {
  it('UT-5-005-01: returns 3 when 3 confirmed registrations exist', async () => {
    prismaMock.eventRegistration.count.mockResolvedValue(3);

    const result = await service.countConfirmedRegistrations(MOCK_EVENT_ID);

    expect(result).toBe(3);
  });

  it('UT-5-005-02: returns 0 when no confirmed registrations', async () => {
    prismaMock.eventRegistration.count.mockResolvedValue(0);

    const result = await service.countConfirmedRegistrations(MOCK_EVENT_ID);

    expect(result).toBe(0);
  });
});

describe('findRegistrationByParticipantAndEvent', () => {
  it('UT-5-006-01: returns registration when found', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(
      MOCK_CONFIRMED_REGISTRATION,
    );

    const result = await service.findRegistrationByParticipantAndEvent(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toEqual(MOCK_CONFIRMED_REGISTRATION);
  });

  it('UT-5-006-02: throws RegistrationNotFoundException when not found', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);

    const error = async () => {
      await service.findRegistrationByParticipantAndEvent(
        MOCK_EVENT_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );
    };
    await expect(error).rejects.toThrow(RegistrationNotFoundException);
    await expect(error).rejects.toThrow('Registration not found.');
  });

  it('UT-5-006-03: throws RegistratioinNOtFound Exception when eventId is empty string', async () => {
    const error = async () => {
      await service.findRegistrationByParticipantAndEvent(
        '',
        MOCK_PARTICIPANT_PROFILE_ID,
      );
    };
    await expect(error).rejects.toThrow(RegistrationNotFoundException);
    await expect(error).rejects.toThrow('Registration not found.');
  });

  it('UT-5-006-04: throws RegistrationNotFoundException when participantProfileId is empty string', async () => {
    const error = async () => {
      await service.findRegistrationByParticipantAndEvent(MOCK_EVENT_ID, '');
    };
    await expect(error).rejects.toThrow(RegistrationNotFoundException);
    await expect(error).rejects.toThrow('Registration not found.');
  });
});

describe('findCancelledRegistration', () => {
  it('UT-5-007-01: returns registration when CANCELLED registration exists', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(
      MOCK_CANCELLED_REGISTRATION as any,
    );

    const result = await service.findCancelledRegistration(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toEqual(MOCK_CANCELLED_REGISTRATION);
  });

  it('UT-5-007-02: returns registration when CANCELLED registration exists and tx is provided', async () => {
    mockTx.eventRegistration.findUnique.mockResolvedValue(
      MOCK_CANCELLED_REGISTRATION as any,
    );

    const result = await service.findCancelledRegistration(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
      mockTx,
    );

    expect(result).toEqual(MOCK_CANCELLED_REGISTRATION);
  });

  it('UT-5-007-02: returns null when no registration exists', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);

    const result = await service.findCancelledRegistration(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toBeNull();
  });

  it('UT-5-007-03: returns null when registration is CONFIRMED', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(
      MOCK_CONFIRMED_REGISTRATION as any,
    );

    const result = await service.findCancelledRegistration(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toBeNull();
  });

  it('UT-5-007-04: return null when eventId is empty string', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);

    const result = await service.findCancelledRegistration(
      '',
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toBeNull();
  });

  it('UT-5-007-05: return null when participantProfileId is empty string', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);

    const result = await service.findCancelledRegistration(MOCK_EVENT_ID, '');

    expect(result).toBeNull();
  });
});

describe('deleteExistingCancelledRegistration', () => {
  it('UT-5-008-01: deletes all related data and returns deletedRegistrationId', async () => {
    prismaMock.formResponse.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.ticket.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.eventRegistration.delete.mockResolvedValue(
      MOCK_CANCELLED_REGISTRATION as any,
    );

    const result =
      await service.deleteExistingCancelledRegistration(MOCK_REGISTRATION_ID);

    expect(result).toEqual({ deletedRegistrationId: MOCK_REGISTRATION_ID });
  });

  it('UT-5-008-02: deletes all related data and returns deletedRegistrationId and tx is provided', async () => {
    mockTx.formResponse.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.ticket.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.eventRegistration.delete.mockResolvedValue(
      MOCK_CANCELLED_REGISTRATION as any,
    );

    const result = await service.deleteExistingCancelledRegistration(
      MOCK_REGISTRATION_ID,
      mockTx,
    );

    expect(result).toEqual({ deletedRegistrationId: MOCK_REGISTRATION_ID });
  });

  it('UT-5-008-03: throws DeleteRegistrationException when formResponse.deleteMany fails', async () => {
    prismaMock.formResponse.deleteMany.mockRejectedValue(new Error('DB error'));
    const error = async () => {
      await service.deleteExistingCancelledRegistration(MOCK_REGISTRATION_ID);
    };

    await expect(error).rejects.toThrow(DeleteRegistrationException);
    await expect(error).rejects.toThrow(
      'An error occurred while removing registration data. Please try again later.',
    );
  });

  it('UT-5-008-04: throws DeleteRegistrationException when formResponse.deleteMany fails', async () => {
    prismaMock.formResponse.deleteMany.mockRejectedValue({ count: 1 });
    prismaMock.ticket.deleteMany.mockRejectedValue(new Error('DB error'));

    const error = async () => {
      await service.deleteExistingCancelledRegistration(MOCK_REGISTRATION_ID);
    };

    await expect(error).rejects.toThrow(DeleteRegistrationException);
    await expect(error).rejects.toThrow(
      'An error occurred while removing registration data. Please try again later.',
    );
  });

  it('UT-5-008-05: throws DeleteRegistrationException when eventRegistration.delete fails', async () => {
    prismaMock.formResponse.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.ticket.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.eventRegistration.delete.mockRejectedValue(
      new Error('DB error'),
    );

    const error = async () => {
      await service.deleteExistingCancelledRegistration(MOCK_REGISTRATION_ID);
    };
    await expect(error).rejects.toThrow(DeleteRegistrationException);
    await expect(error).rejects.toThrow(
      'An error occurred while removing registration data. Please try again later.',
    );
  });
});

describe('claimSeat', () => {
  it('UT-5-009-01: returns updated seatsTaken when seat is available', async () => {
    mockTx.$queryRaw.mockResolvedValue([{ id: MOCK_EVENT_ID, seatsTaken: 4 }]);

    const result = await service.claimSeat(MOCK_EVENT_ID, mockTx);

    expect(result).toEqual({ id: MOCK_EVENT_ID, seatsTaken: 4 });
  });

  it('UT-5-009-02: returns updated seatsTaken for seatLimit null event', async () => {
    mockTx.$queryRaw.mockResolvedValue([{ id: MOCK_EVENT_ID, seatsTaken: 6 }]);

    const result = await service.claimSeat(MOCK_EVENT_ID, mockTx);

    expect(result).toEqual({ id: MOCK_EVENT_ID, seatsTaken: 6 });
  });

  it('UT-5-009-03: throws EventFullException when seat is full', async () => {
    mockTx.$queryRaw.mockResolvedValue([]);
    mockTx.event.findUnique.mockResolvedValue(MOCK_FULL_EVENT as any);

    const error = async () => {
      await service.claimSeat(MOCK_EVENT_ID, mockTx);
    };
    await expect(error).rejects.toThrow(EventFullException);
    await expect(error).rejects.toThrow(
      'All seats are fully taken for this event.',
    );
  });

  it('UT-5-009-04: throws EventNotFoundException when event not found', async () => {
    mockTx.$queryRaw.mockResolvedValue([]);
    mockTx.event.findUnique.mockResolvedValue(null);

    const error = async () => {
      await service.claimSeat(MOCK_EVENT_ID, mockTx);
    };
    await expect(error).rejects.toThrow(EventNotFoundException);
    await expect(error).rejects.toThrow('Event not found.');
  });

  it('UT-5-009-05: calls $queryRaw with prisma when tx is not provided', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { id: MOCK_EVENT_ID, seatsTaken: 1 },
    ]);

    const result = await service.claimSeat(MOCK_EVENT_ID);

    expect(result).toEqual({ id: MOCK_EVENT_ID, seatsTaken: 1 });
  });
});

describe('createRegistration', () => {
  it('UT-5-010-01: successfully creates registration', async () => {
    prismaMock.eventRegistration.create.mockResolvedValue(
      MOCK_CONFIRMED_REGISTRATION as any,
    );

    const result = await service.createRegistration(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toEqual(MOCK_CONFIRMED_REGISTRATION);
  });

  it('UT-5-010-02: throws SaveRegistrationException when eventId is empty string', async () => {
    prismaMock.eventRegistration.create.mockRejectedValue(
      new Error('DB error'),
    );
    const error = async () => {
      await service.createRegistration('', MOCK_PARTICIPANT_PROFILE_ID);
    };
    await expect(error).rejects.toThrow(SaveRegistrationException);
    await expect(error).rejects.toThrow(
      'An unexpected error occurred while processing your registration. Please try again later.',
    );
  });

  it('UT-5-010-03: throws SaveRegistrationException when participantId is empty string', async () => {
    prismaMock.eventRegistration.create.mockRejectedValue(
      new Error('DB error'),
    );
    const error = async () => {
      await service.createRegistration(MOCK_EVENT_ID, '');
    };
    await expect(error).rejects.toThrow(SaveRegistrationException);
    await expect(error).rejects.toThrow(
      'An unexpected error occurred while processing your registration. Please try again later.',
    );
  });

  it('UT-5-010-04: throws SaveRegistrationException when prisma create fails', async () => {
    prismaMock.eventRegistration.create.mockRejectedValue(
      new Error('DB error'),
    );

    const error = async () => {
      await service.createRegistration(
        MOCK_EVENT_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );
    };
    await expect(error).rejects.toThrow(SaveRegistrationException);
    await expect(error).rejects.toThrow(
      'An unexpected error occurred while processing your registration. Please try again later.',
    );
  });

  it('UT-5-010-04: successfully create registration with tx client when tx provided', async () => {
    mockTx.eventRegistration.create.mockResolvedValue(
      MOCK_CONFIRMED_REGISTRATION as any,
    );

    const result = await service.createRegistration(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
      mockTx,
    );

    expect(result).toEqual(MOCK_CONFIRMED_REGISTRATION);
    expect(mockTx.eventRegistration.create).toHaveBeenCalled();
    expect(prismaMock.eventRegistration.create).not.toHaveBeenCalled();
  });
});

describe('createFormResponse', () => {
  const mockFormResponse = {
    id: 'a3000001-0000-4000-8000-000000000001',
    formId: MOCK_FORM_ID,
    eventRegistrationId: MOCK_REGISTRATION_ID,
    createdAt: MOCK_CREATED_AT,
  };

  it('UT-5-011-01: creates form response with TEXT field mapping', async () => {
    prismaMock.formResponse.create.mockResolvedValue(mockFormResponse as any);

    const result = await service.createFormResponse(
      MOCK_FORM_ID,
      MOCK_REGISTRATION_ID,
      [{ formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: 'Su Su' }],
      [MOCK_FIRSTNAME_FIELD],
    );

    expect(result).toEqual(mockFormResponse);
    expect(prismaMock.formResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          formId: MOCK_FORM_ID,
          eventRegistrationId: MOCK_REGISTRATION_ID,
          fieldResponses: {
            create: expect.arrayContaining([
              expect.objectContaining({
                formFieldId: MOCK_FIELD_ID_FIRSTNAME,
                valueText: 'Su Su',
              }),
            ]),
          },
        }),
      }),
    );
  });

  it('UT-5-011-02: creates form response with CHOICE field (uses valueArray)', async () => {
    prismaMock.formResponse.create.mockResolvedValue(mockFormResponse as any);

    const result = await service.createFormResponse(
      MOCK_FORM_ID,
      MOCK_REGISTRATION_ID,
      [{ formFieldId: MOCK_CHOICE_FIELD.id, value: ['Year 3'] }],
      [MOCK_CHOICE_FIELD],
    );

    expect(result).toEqual(mockFormResponse);
    expect(prismaMock.formResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fieldResponses: {
            create: expect.arrayContaining([
              expect.objectContaining({ valueArray: ['Year 3'] }),
            ]),
          },
        }),
      }),
    );
  });

  it('UT-5-011-03: creates form response with NUMBER field (uses valueNumber)', async () => {
    prismaMock.formResponse.create.mockResolvedValue(mockFormResponse as any);

    const result = await service.createFormResponse(
      MOCK_FORM_ID,
      MOCK_REGISTRATION_ID,
      [{ formFieldId: MOCK_NUMBER_FIELD.id, value: 22 }],
      [MOCK_NUMBER_FIELD],
    );

    expect(result).toEqual(mockFormResponse);
    expect(prismaMock.formResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fieldResponses: {
            create: expect.arrayContaining([
              expect.objectContaining({ valueNumber: 22 }),
            ]),
          },
        }),
      }),
    );
  });

  it('UT-5-011-04: throws SaveFormResponseException when prisma create fails', async () => {
    prismaMock.formResponse.create.mockRejectedValue(new Error('DB error'));

    const error = async () => {
      await service.createFormResponse(
        MOCK_FORM_ID,
        MOCK_REGISTRATION_ID,
        MOCK_VALID_ANSWERS,
        [MOCK_FIRSTNAME_FIELD, MOCK_STUDENTID_FIELD],
      );
    };
    await expect(error).rejects.toThrow(SaveFormResponseException);
    await expect(error).rejects.toThrow(
      'An error occurred while saving the form response. Please try again later',
    );
  });

  it('UT-5-011-05: create form response with Text Field mapping with tx client when tx provided', async () => {
    mockTx.formResponse.create.mockResolvedValue(mockFormResponse as any);

    const result = await service.createFormResponse(
      MOCK_FORM_ID,
      MOCK_REGISTRATION_ID,
      MOCK_VALID_ANSWERS,
      [MOCK_FIRSTNAME_FIELD, MOCK_STUDENTID_FIELD],
      mockTx,
    );

    expect(result).toBe(mockFormResponse);
    expect(mockTx.formResponse.create).toHaveBeenCalled();
    expect(prismaMock.formResponse.create).not.toHaveBeenCalled();
  });
});

describe('createTicket', () => {
  it('UT-5-012-01: successfully creates ticket', async () => {
    prismaMock.ticket.create.mockResolvedValue(MOCK_ACTIVE_TICKET as any);

    const result = await service.createTicket(
      MOCK_REGISTRATION_ID,
      MOCK_PARTICIPANT_SNAPSHOT,
    );

    expect(result).toEqual(MOCK_ACTIVE_TICKET);
  });

  it('UT-5-012-02: successfully create ticket with tx client when tx provided', async () => {
    mockTx.ticket.create.mockResolvedValue(MOCK_ACTIVE_TICKET as any);

    const result = await service.createTicket(
      MOCK_REGISTRATION_ID,
      MOCK_PARTICIPANT_SNAPSHOT,
      mockTx,
    );

    expect(result).toEqual(MOCK_ACTIVE_TICKET);
    expect(mockTx.ticket.create).toHaveBeenCalled();
    expect(prismaMock.ticket.create).not.toHaveBeenCalled();
  });

  it('UT-5-012-03: throws SaveTicketException when prisma create fails', async () => {
    prismaMock.ticket.create.mockRejectedValue(new Error('DB error'));

    const error = async () => {
      await service.createTicket(
        MOCK_REGISTRATION_ID,
        MOCK_PARTICIPANT_SNAPSHOT,
      );
    };
    await expect(error).rejects.toThrow(SaveTicketException);
    await expect(error).rejects.toThrow(
      'An error occurred while processing your ticket. Please try again later.',
    );
  });
});

describe('updateRegistrationStatus', () => {
  it('UT-5-013-01: successfully updates reg status to CANCELLED', async () => {
    prismaMock.eventRegistration.update.mockResolvedValue(
      MOCK_CANCELLED_REGISTRATION as any,
    );

    const result = await service.updateRegistrationStatus(
      MOCK_REGISTRATION_ID,
      RegistrationStatus.CANCELLED,
    );

    expect(result).toEqual(MOCK_CANCELLED_REGISTRATION);
  });

  // This scenario should not exist, but.. whatever...
  it('UT-5-013-02: successfully updates reg status to CONFIRMED', async () => {
    prismaMock.eventRegistration.update.mockResolvedValue(
      MOCK_CONFIRMED_REGISTRATION as any,
    );

    const result = await service.updateRegistrationStatus(
      MOCK_REGISTRATION_ID,
      RegistrationStatus.CONFIRMED,
    );

    expect(result).toEqual(MOCK_CONFIRMED_REGISTRATION);
  });

  it('UT-5-013-03: successfully update status with tx client when tx provided', async () => {
    mockTx.eventRegistration.update.mockResolvedValue(
      MOCK_CANCELLED_REGISTRATION as any,
    );

    await service.updateRegistrationStatus(
      MOCK_REGISTRATION_ID,
      RegistrationStatus.CANCELLED,
      mockTx,
    );

    expect(mockTx.eventRegistration.update).toHaveBeenCalled();
    expect(prismaMock.eventRegistration.update).not.toHaveBeenCalled();
  });

  it('UT-5-013-04: throws SaveRegistrationException when prisma update fails', async () => {
    prismaMock.eventRegistration.update.mockRejectedValue(
      new Error('DB error'),
    );

    const error = async () => {
      await service.updateRegistrationStatus(
        MOCK_REGISTRATION_ID,
        RegistrationStatus.CANCELLED,
      );
    };
    await expect(error).rejects.toThrow(SaveRegistrationException);
    await expect(error).rejects.toThrow(
      'An unexpected error occurred while processing your registration. Please try again later.',
    );
  });
});

describe('updateTicketStatus', () => {
  it('UT-5-014-01: successfully updates ticket to CANCELLED', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(MOCK_ACTIVE_TICKET as any);
    prismaMock.ticket.update.mockResolvedValue(MOCK_CANCELLED_TICKET as any);

    const result = await service.updateTicketStatus(
      MOCK_REGISTRATION_ID,
      TicketStatus.CANCELLED,
    );

    expect(result).toEqual(MOCK_CANCELLED_TICKET);
  });

  it('UT-5-014-02: successfully updates ticket to ACTIVE', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(MOCK_ACTIVE_TICKET as any);
    prismaMock.ticket.update.mockResolvedValue(MOCK_ACTIVE_TICKET as any);

    const result = await service.updateTicketStatus(
      MOCK_REGISTRATION_ID,
      TicketStatus.ACTIVE,
    );

    expect(result).toEqual(MOCK_ACTIVE_TICKET);
  });

  it('UT-5-014-03: successfully update ticket with tx client when tx provided', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(MOCK_ACTIVE_TICKET as any);
    mockTx.ticket.update.mockResolvedValue(MOCK_CANCELLED_TICKET as any);

    const result = await service.updateTicketStatus(
      MOCK_REGISTRATION_ID,
      TicketStatus.CANCELLED,
      mockTx,
    );

    expect(result).toEqual(MOCK_CANCELLED_TICKET);
    expect(mockTx.ticket.findUnique).toHaveBeenCalled();
    expect(mockTx.ticket.update).toHaveBeenCalled();
    expect(prismaMock.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('UT-5-014-04: throws TicketNotFoundException when ticket not found', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    const result = async () => {
      await service.updateTicketStatus(
        MOCK_REGISTRATION_ID,
        TicketStatus.CANCELLED,
      );
    };
    await expect(result).rejects.toThrow(TicketNotFoundException);
    await expect(result).rejects.toThrow('Ticket not found.');
  });

  it('UT-5-014-05: throws SaveTicketException when prisma update fails', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(MOCK_ACTIVE_TICKET as any);
    prismaMock.ticket.update.mockRejectedValue(new Error('DB error'));

    const result = async () => {
      await service.updateTicketStatus(
        MOCK_REGISTRATION_ID,
        TicketStatus.CANCELLED,
      );
    };

    await expect(result).rejects.toThrow(SaveTicketException);
    await expect(result).rejects.toThrow(
      'An error occurred while processing your ticket. Please try again later.',
    );
  });
});

describe('decrementSeatsTaken', () => {
  it('UT-5-015-01: returns updated seatsTaken after decrement', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { id: MOCK_EVENT_ID, seatsTaken: 2 },
    ]);

    const result = await service.decrementSeatsTaken(MOCK_EVENT_ID);

    expect(result).toEqual({ id: MOCK_EVENT_ID, seatsTaken: 2 });
  });

  it('UT-5-015-02: returns 0 when seatsTaken was already 0 — GREATEST prevents negative', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { id: MOCK_EVENT_ID, seatsTaken: 0 },
    ]);

    const result = await service.decrementSeatsTaken(MOCK_EVENT_ID);

    expect(result).toEqual({ id: MOCK_EVENT_ID, seatsTaken: 0 });
  });

  it('UT-5-015-03: return updated seatsTaken with tx client when tx provided', async () => {
    mockTx.$queryRaw.mockResolvedValue([{ id: MOCK_EVENT_ID, seatsTaken: 3 }]);

    const result = await service.decrementSeatsTaken(MOCK_EVENT_ID, mockTx);

    expect(result).toEqual({ id: MOCK_EVENT_ID, seatsTaken: 3 });
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it('UT-5-015-04: throws SaveEventException when $queryRaw fails', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('DB error'));

    const error = async () => {
      await service.decrementSeatsTaken(MOCK_EVENT_ID);
    };
    await expect(error).rejects.toThrow(SaveEventException);
    await expect(error).rejects.toThrow(
      'Failed to save event. Please try again.',
    );
  });
});

// this is like behavior test
describe('extractIdentitySnapshot', () => {
  it('UT-5-016-01: form answer include participant info', async () => {
    const result = await service.extractIdentitySnapshot(
      [
        MOCK_FIRSTNAME_FIELD,
        MOCK_STUDENTID_FIELD,
        MOCK_LASTNAME_FIELD,
        MOCK_NICKNAME_FIELD,
        MOCK_MAJOR_FIELD,
      ],
      [
        { formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: 'Su Su' },
        { formFieldId: MOCK_FIELD_ID_STUDENTID, value: '662115522' },
        { formFieldId: MOCK_FIELD_ID_LASTNAME, value: 'Myint' },
        { formFieldId: MOCK_FIELD_ID_NICKNAME, value: 'Su' },
        { formFieldId: MOCK_FIELD_ID_MAJOR, value: 'Software Engineering' },
      ],
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toStrictEqual({
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115522',
      major: 'Software Engineering',
    });
    expect(prismaMock.participantProfile.findUnique).not.toHaveBeenCalled();
  });

  it('UT-5-016-02: falls back to profile when participant data is not in form', async () => {
    prismaMock.participantProfile.findUnique.mockResolvedValue(
      MOCK_PARTICIPANT_PROFILE as any,
    );

    const result = await service.extractIdentitySnapshot(
      [MOCK_FIRSTNAME_FIELD, MOCK_STUDENTID_FIELD],
      [
        { formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: 'Updated Su Su' },
        { formFieldId: MOCK_FIELD_ID_STUDENTID, value: '662115510' },
      ],
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toStrictEqual({
      firstName: 'Updated Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115510',
      major: 'Software Engineering',
    });
    expect(prismaMock.participantProfile.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-5-016-03: fallback to profile when form field answer is empty string', async () => {
    prismaMock.participantProfile.findUnique.mockResolvedValue(
      MOCK_PARTICIPANT_PROFILE as any,
    );

    const result = await service.extractIdentitySnapshot(
      [
        MOCK_FIRSTNAME_FIELD,
        MOCK_STUDENTID_FIELD,
        MOCK_LASTNAME_FIELD,
        MOCK_NICKNAME_FIELD,
        MOCK_MAJOR_FIELD,
      ],
      [
        { formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: 'Su Su' },
        { formFieldId: MOCK_FIELD_ID_STUDENTID, value: '' },
        { formFieldId: MOCK_FIELD_ID_LASTNAME, value: 'Myint' },
        { formFieldId: MOCK_FIELD_ID_NICKNAME, value: '' },
        { formFieldId: MOCK_FIELD_ID_MAJOR, value: '' },
      ],
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toStrictEqual({
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115522',
      major: 'Software Engineering',
    });
    expect(prismaMock.participantProfile.findUnique).toHaveBeenCalled();
  });

  it('UT-5-016-04: fallback to profile when form field answer is white space', async () => {
    prismaMock.participantProfile.findUnique.mockResolvedValue(
      MOCK_PARTICIPANT_PROFILE as any,
    );

    const result = await service.extractIdentitySnapshot(
      [
        MOCK_FIRSTNAME_FIELD,
        MOCK_STUDENTID_FIELD,
        MOCK_LASTNAME_FIELD,
        MOCK_NICKNAME_FIELD,
        MOCK_MAJOR_FIELD,
      ],
      [
        { formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: '    ' },
        { formFieldId: MOCK_FIELD_ID_STUDENTID, value: '    ' },
        { formFieldId: MOCK_FIELD_ID_LASTNAME, value: '    ' },
        { formFieldId: MOCK_FIELD_ID_NICKNAME, value: 'Su' },
        { formFieldId: MOCK_FIELD_ID_MAJOR, value: 'Software Engineering' },
      ],
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toStrictEqual({
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115522',
      major: 'Software Engineering',
    });
    expect(prismaMock.participantProfile.findUnique).toHaveBeenCalled();
  });

  it('UT-5-016-05: fetches profile when no autoFillKey fields in form', async () => {
    prismaMock.participantProfile.findUnique.mockResolvedValue(
      MOCK_PARTICIPANT_PROFILE as any,
    );

    const result = await service.extractIdentitySnapshot(
      [{ ...MOCK_FIRSTNAME_FIELD, autoFillKey: null }],
      [{ formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: 'Sofia' }],
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toStrictEqual({
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115522',
      major: 'Software Engineering',
    });
    expect(prismaMock.participantProfile.findUnique).toHaveBeenCalled();
  });
});

describe('getEventWithOrganizer', () => {
  it('UT-5-017-01: returns event with organizer when found', async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      MOCK_EVENT_WITH_ORGANIZER as any,
    );

    const result = await service.getEventWithOrganizer(MOCK_EVENT_ID);

    expect(result).toEqual(MOCK_EVENT_WITH_ORGANIZER);
  });

  it('UT-5-017-02: throws EventNotFoundException when event not found', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    const result = async () => {
      await service.getEventWithOrganizer(MOCK_EVENT_ID);
    };

    await expect(result).rejects.toThrow(EventNotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
  });

  it('UT-5-017-03: throws EventNotFoundException when event id is empty string', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    const result = async () => {
      await service.getEventWithOrganizer('');
    };

    await expect(result).rejects.toThrow(EventNotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
  });
});

describe('getRegistrationsByEvent', () => {
  it('UT-5-018-01: returns mapped registrant DTOs for multiple registrations', async () => {
    prismaMock.eventRegistration.findMany.mockResolvedValue([
      MOCK_REG_WITH_TICKET_PAR1 as any,
      MOCK_REG_WITH_TICKET_PAR2 as any,
      MOCK_REG_WITH_TICKET_PAR3 as any,
    ]);

    const result = await service.getRegistrationsByEvent(MOCK_EVENT_ID);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: MOCK_REGISTRATION_ID,
      status: RegistrationStatus.CONFIRMED,
      createdAt: MOCK_CREATED_AT,
      ticketStatus: TicketStatus.ACTIVE,
      ticketIssuedAt: MOCK_ISSUED_AT,
      participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT,
    });
    expect(result[1]).toEqual({
      id: MOCK_REGISTRATION_ID_2,
      status: RegistrationStatus.CONFIRMED,
      createdAt: MOCK_CREATED_AT_2,
      ticketStatus: TicketStatus.ACTIVE,
      ticketIssuedAt: MOCK_ISSUED_AT_2,
      participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT_2,
    });
    expect(result[2]).toEqual({
      id: MOCK_REGISTRATION_ID_3,
      status: RegistrationStatus.CONFIRMED,
      createdAt: MOCK_CREATED_AT_3,
      ticketStatus: TicketStatus.EXPIRED,
      ticketIssuedAt: MOCK_ISSUED_AT_3,
      participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT_3,
    });
  });

  it('UT-5-018-02: returns empty array when no registrations for event', async () => {
    prismaMock.eventRegistration.findMany.mockResolvedValue([]);

    const result = await service.getRegistrationsByEvent(MOCK_EVENT_ID);

    expect(result).toEqual([]);
  });
});

describe('getRegisteredEvents', () => {
  it('UT-5-019-01: returns all registered events without filter', async () => {
    prismaMock.eventRegistration.findMany.mockResolvedValue([
      MOCK_REG_WITH_EVENT_PAR1_EVT1 as any,
      MOCK_REG_WITH_EVENT_PAR1_EVT2 as any,
    ]);

    const result = await service.getRegisteredEvents(
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: MOCK_EVENT_ID,
      title: MOCK_PUBLISHED_EVENT.title,
      bannerUrl: '',
      startAt: MOCK_FUTURE_DATE,
      endAt: MOCK_FUTURE_END_DATE,
      location: MOCK_PUBLISHED_EVENT.location,
      status: EventStatus.PUBLISHED,
      organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      registration: {
        id: MOCK_REGISTRATION_ID,
        status: RegistrationStatus.CONFIRMED,
        createdAt: MOCK_CREATED_AT,
      },
    });
    expect(result[1]).toEqual({
      id: MOCK_EVENT_ID_2,
      title: MOCK_ONGOING_EVENT_2.title,
      bannerUrl: '',
      startAt: MOCK_ONGOING_EVENT_2.startAt,
      endAt: MOCK_ONGOING_EVENT_2.endAt,
      location: MOCK_ONGOING_EVENT_2.location,
      status: EventStatus.ONGOING,
      organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      registration: {
        id: 'a2000001-0000-4000-8000-000000000001',
        status: RegistrationStatus.CONFIRMED,
        createdAt: MOCK_CREATED_AT_2,
      },
    });
  });

  it('UT-5-019-02: returns filtered results for PUBLISHED status only', async () => {
    prismaMock.eventRegistration.findMany.mockResolvedValue([
      MOCK_REG_WITH_EVENT_PAR1_EVT1 as any,
    ]);

    const result = await service.getRegisteredEvents(
      MOCK_PARTICIPANT_PROFILE_ID,
      EventStatus.PUBLISHED,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: MOCK_EVENT_ID,
      title: MOCK_PUBLISHED_EVENT.title,
      bannerUrl: '',
      startAt: MOCK_FUTURE_DATE,
      endAt: MOCK_FUTURE_END_DATE,
      location: MOCK_PUBLISHED_EVENT.location,
      status: EventStatus.PUBLISHED,
      organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      registration: {
        id: MOCK_REGISTRATION_ID,
        status: RegistrationStatus.CONFIRMED,
        createdAt: MOCK_CREATED_AT,
      },
    });
  });

  it('UT-5-019-03: returns empty array when participant has no registrations', async () => {
    prismaMock.eventRegistration.findMany.mockResolvedValue([]);

    const result = await service.getRegisteredEvents(
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toEqual([]);
  });
});

describe('getTicketsByParticipant', () => {
  it('UT-5-020-01: returns all tickets without filter', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([
      MOCK_TICKET_WITH_REG_ACTIVE as any,
      MOCK_TICKET_WITH_REG_ACTIVE_2 as any,
      MOCK_TICKET_WITH_REG_EXPIRED as any,
      MOCK_TICKET_WITH_REG_CANCELLED as any,
    ]);

    const result = await service.getTicketsByParticipant(
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      id: MOCK_TICKET_ID,
      status: TicketStatus.ACTIVE,
      issuedAt: MOCK_ISSUED_AT,
      registrationStatus: RegistrationStatus.CONFIRMED,
      event: {
        id: MOCK_EVENT_ID,
        title: MOCK_PUBLISHED_EVENT.title,
        bannerUrl: '',
        startAt: MOCK_FUTURE_DATE,
        endAt: MOCK_FUTURE_END_DATE,
        status: EventStatus.PUBLISHED,
      },
    });
    expect(result[1]).toEqual({
      id: MOCK_TICKET_ID_2,
      status: TicketStatus.ACTIVE,
      issuedAt: MOCK_ISSUED_AT_2,
      registrationStatus: RegistrationStatus.CONFIRMED,
      event: {
        id: MOCK_EVENT_ID_2,
        title: MOCK_ONGOING_EVENT_2.title,
        bannerUrl: '',
        startAt: MOCK_ONGOING_EVENT_2.startAt,
        endAt: MOCK_ONGOING_EVENT_2.endAt,
        status: EventStatus.ONGOING,
      },
    });
    expect(result[2]).toEqual({
      id: MOCK_TICKET_ID_3,
      status: TicketStatus.EXPIRED,
      issuedAt: MOCK_ISSUED_AT_3,
      registrationStatus: RegistrationStatus.CONFIRMED,
      event: {
        id: 'e0000004-0000-4000-8000-000000000004',
        title: MOCK_CONCLUDED_EVENT_2.title,
        bannerUrl: '',
        startAt: MOCK_CONCLUDED_EVENT_2.startAt,
        endAt: MOCK_CONCLUDED_EVENT_2.endAt,
        status: EventStatus.CONCLUDED,
      },
    });
    expect(result[3]).toEqual({
      id: MOCK_TICKET_ID,
      status: TicketStatus.CANCELLED,
      issuedAt: MOCK_ISSUED_AT,
      registrationStatus: RegistrationStatus.CANCELLED,
      event: {
        id: MOCK_EVENT_ID,
        title: MOCK_PUBLISHED_EVENT.title,
        bannerUrl: '',
        startAt: MOCK_FUTURE_DATE,
        endAt: MOCK_FUTURE_END_DATE,
        status: EventStatus.CANCELLED,
      },
    });
  });

  it('UT-5-020-02: returns only ACTIVE tickets when ticketStatus is ACTIVE', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([
      MOCK_TICKET_WITH_REG_ACTIVE as any,
      MOCK_TICKET_WITH_REG_ACTIVE_2 as any,
    ]);

    const result = await service.getTicketsByParticipant(
      MOCK_PARTICIPANT_PROFILE_ID,
      TicketStatus.ACTIVE,
    );

    expect(result).toHaveLength(2);
    expect(result).toStrictEqual([
      {
        id: 'b1000001-0000-4000-8000-000000000001',
        status: 'ACTIVE',
        issuedAt: new Date('2026-07-08T14:24:52.680Z'),
        registrationStatus: 'CONFIRMED',
        event: {
          id: 'e0000002-0000-4000-8000-000000000002',
          title: {
            en: 'CAMT Halloween Night 2026',
            th: 'คืนฮาโลวีน CAMT 2026',
          },
          bannerUrl: '',
          startAt: new Date('2026-10-31T10:00:00.000Z'),
          endAt: new Date('2026-10-31T14:00:00.000Z'),
          status: 'PUBLISHED',
        },
      },
      {
        id: 'b1000002-0000-4000-8000-000000000002',
        status: 'ACTIVE',
        issuedAt: new Date('2026-07-09T10:00:00.000Z'),
        registrationStatus: 'CONFIRMED',
        event: {
          id: 'e0000003-0000-4000-8000-000000000003',
          title: {
            en: 'AI Research Seminar',
            th: 'สัมมนาวิจัย AI',
          },
          bannerUrl: '',
          startAt: new Date('2026-06-01T10:00:00.000Z'),
          endAt: new Date('2026-11-30T10:00:00.000Z'),
          status: 'ONGOING',
        },
      },
    ]);
  });

  it('UT-5-020-03: returns only CANCELLED tickets when ticketStatus is CANCELLED', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([
      MOCK_TICKET_WITH_REG_CANCELLED as any,
    ]);

    const result = await service.getTicketsByParticipant(
      MOCK_PARTICIPANT_PROFILE_ID,
      TicketStatus.CANCELLED,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: MOCK_TICKET_ID,
      status: TicketStatus.CANCELLED,
      issuedAt: MOCK_ISSUED_AT,
      registrationStatus: RegistrationStatus.CANCELLED,
      event: {
        id: MOCK_EVENT_ID,
        title: MOCK_PUBLISHED_EVENT.title,
        bannerUrl: '',
        startAt: MOCK_FUTURE_DATE,
        endAt: MOCK_FUTURE_END_DATE,
        status: EventStatus.CANCELLED,
      },
    });
  });

  it('UT-5-020-04: returns empty array when no tickets', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([]);

    const result = await service.getTicketsByParticipant(
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toEqual([]);
  });
});

describe('getTicketByEventIdAndParticipantId', () => {
  it('UT-5-021-01: returns full ticket detail when registration and ticket exist', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(
      MOCK_REG_WITH_TICKET_AND_EVENT as any,
    );

    const result = await service.getTicketByEventIdAndParticipantId(
      MOCK_EVENT_ID,
      MOCK_PARTICIPANT_PROFILE_ID,
    );

    expect(result).toEqual({
      id: MOCK_TICKET_ID,
      qrToken: MOCK_QR_TOKEN,
      status: TicketStatus.ACTIVE,
      issuedAt: MOCK_ISSUED_AT,
      participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT,
      registration: {
        id: MOCK_REGISTRATION_ID,
        status: RegistrationStatus.CONFIRMED,
        createdAt: MOCK_CREATED_AT,
      },
      event: {
        id: MOCK_EVENT_ID,
        title: MOCK_PUBLISHED_EVENT.title,
        bannerUrl: '',
        startAt: MOCK_FUTURE_DATE,
        endAt: MOCK_FUTURE_END_DATE,
        location: MOCK_PUBLISHED_EVENT.location,
        mapLink: '',
        status: EventStatus.PUBLISHED,
        seatLimit: 100,
        seatsTaken: 3,
        organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      },
    });
  });

  it('UT-5-021-02: throws RegistrationNotFoundException when registration not found', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);

    const error = async () => {
      await service.getTicketByEventIdAndParticipantId(
        MOCK_EVENT_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );
    };
    await expect(error).rejects.toThrow(RegistrationNotFoundException);
    await expect(error).rejects.toThrow('Registration not found.');
  });

  it('UT-5-021-03: throws TicketNotFoundException when registration exists but ticket is null', async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({
      ...MOCK_CONFIRMED_REGISTRATION,
      ticket: null,
      event: MOCK_EVENT_WITH_ORGANIZER,
    } as any);

    const error = async () => {
      await service.getTicketByEventIdAndParticipantId(
        MOCK_EVENT_ID,
        MOCK_PARTICIPANT_PROFILE_ID,
      );
    };
    await expect(error).rejects.toThrow(TicketNotFoundException);
    await expect(error).rejects.toThrow('Ticket not found.');
  });
});

describe('getTicketById', () => {
  it('UT-5-022-01: returns full ticket detail when ticketId exists', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(MOCK_TICKET_WITH_ALL as any);

    const result = await service.getTicketById(MOCK_TICKET_ID);

    expect(result).toEqual({
      id: MOCK_TICKET_ID,
      qrToken: MOCK_QR_TOKEN,
      status: TicketStatus.ACTIVE,
      issuedAt: MOCK_ISSUED_AT,
      participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT,
      registration: {
        id: MOCK_REGISTRATION_ID,
        status: RegistrationStatus.CONFIRMED,
        createdAt: MOCK_CREATED_AT,
      },
      event: {
        id: MOCK_EVENT_ID,
        title: MOCK_PUBLISHED_EVENT.title,
        bannerUrl: '',
        startAt: MOCK_FUTURE_DATE,
        endAt: MOCK_FUTURE_END_DATE,
        location: MOCK_PUBLISHED_EVENT.location,
        mapLink: '',
        status: EventStatus.PUBLISHED,
        seatLimit: 100,
        seatsTaken: 3,
        organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      },
    });
  });

  it('UT-5-022-02: throws TicketNotFoundException when ticket not found', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    const error = async () => {
      await service.getTicketById('12345678-false-ticket');
    };
    await expect(error).rejects.toThrow(TicketNotFoundException);
    await expect(error).rejects.toThrow('Ticket not found.');
  });
});

describe('mapToReturnTicketDetailDto', () => {
  it('UT-5-023-01: maps all fields correctly when all data is available', () => {
    const result = service.mapToReturnTicketDetailDto(
      MOCK_CONFIRMED_REGISTRATION,
      MOCK_ACTIVE_TICKET,
      MOCK_EVENT_WITH_ORGANIZER,
    );

    expect(result).toEqual({
      id: 'b1000001-0000-4000-8000-000000000001',
      qrToken: '868af4ff-48f6-42b5-a612-c04cbcaf861a',
      status: 'ACTIVE',
      issuedAt: new Date('2026-07-08T14:24:52.680Z'),
      participantSnapshot: {
        firstName: 'Su Su',
        lastName: 'Myint',
        nickname: 'Su',
        studentId: '662115522',
        major: 'Software Engineering',
      },
      registration: {
        id: 'a1000001-0000-4000-8000-000000000001',
        status: 'CONFIRMED',
        createdAt: new Date('2026-07-08T14:24:52.668Z'),
      },
      event: {
        id: 'e0000002-0000-4000-8000-000000000002',
        title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
        bannerUrl: '',
        startAt: new Date('2026-10-31T10:00:00.000Z'),
        endAt: new Date('2026-10-31T14:00:00.000Z'),
        location: { en: 'CAMT Auditorium', th: 'ห้องประชุม CAMT' },
        mapLink: '',
        status: 'PUBLISHED',
        seatLimit: 100,
        seatsTaken: 3,
        organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      },
    });
    expect(result.id).toBe(MOCK_TICKET_ID);
    expect(result.qrToken).toBe(MOCK_QR_TOKEN);
    expect(result.status).toBe(TicketStatus.ACTIVE);
    expect(result.registration.id).toBe(MOCK_REGISTRATION_ID);
    expect(result.event.id).toBe(MOCK_EVENT_ID);
    expect(result.participantSnapshot).toEqual(MOCK_PARTICIPANT_SNAPSHOT);
  });

  it('UT-5-023-02: applies fallback for nullable event fields', () => {
    const result = service.mapToReturnTicketDetailDto(
      MOCK_CONFIRMED_REGISTRATION,
      MOCK_ACTIVE_TICKET,
      { ...MOCK_EVENT_WITH_ORGANIZER, bannerUrl: null, mapLink: null },
    );

    expect(result).toEqual({
      id: 'b1000001-0000-4000-8000-000000000001',
      qrToken: '868af4ff-48f6-42b5-a612-c04cbcaf861a',
      status: 'ACTIVE',
      issuedAt: new Date('2026-07-08T14:24:52.680Z'),
      participantSnapshot: {
        firstName: 'Su Su',
        lastName: 'Myint',
        nickname: 'Su',
        studentId: '662115522',
        major: 'Software Engineering',
      },
      registration: {
        id: 'a1000001-0000-4000-8000-000000000001',
        status: 'CONFIRMED',
        createdAt: new Date('2026-07-08T14:24:52.668Z'),
      },
      event: {
        id: 'e0000002-0000-4000-8000-000000000002',
        title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
        bannerUrl: '',
        startAt: new Date('2026-10-31T10:00:00.000Z'),
        endAt: new Date('2026-10-31T14:00:00.000Z'),
        location: { en: 'CAMT Auditorium', th: 'ห้องประชุม CAMT' },
        mapLink: '',
        status: 'PUBLISHED',
        seatLimit: 100,
        seatsTaken: 3,
        organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      },
    });
    expect(result.event.bannerUrl).toBe('');
    expect(result.event.mapLink).toBe('');
  });

  it('UT-5-023-03: uses 0 as fallback when seatsTaken is null', () => {
    const result = service.mapToReturnTicketDetailDto(
      MOCK_CONFIRMED_REGISTRATION,
      MOCK_ACTIVE_TICKET,
      { ...MOCK_EVENT_WITH_ORGANIZER, seatsTaken: null },
    );

    expect(result).toEqual({
      id: 'b1000001-0000-4000-8000-000000000001',
      qrToken: '868af4ff-48f6-42b5-a612-c04cbcaf861a',
      status: 'ACTIVE',
      issuedAt: new Date('2026-07-08T14:24:52.680Z'),
      participantSnapshot: {
        firstName: 'Su Su',
        lastName: 'Myint',
        nickname: 'Su',
        studentId: '662115522',
        major: 'Software Engineering',
      },
      registration: {
        id: 'a1000001-0000-4000-8000-000000000001',
        status: 'CONFIRMED',
        createdAt: new Date('2026-07-08T14:24:52.668Z'),
      },
      event: {
        id: 'e0000002-0000-4000-8000-000000000002',
        title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
        bannerUrl: '',
        startAt: new Date('2026-10-31T10:00:00.000Z'),
        endAt: new Date('2026-10-31T14:00:00.000Z'),
        location: { en: 'CAMT Auditorium', th: 'ห้องประชุม CAMT' },
        mapLink: '',
        status: 'PUBLISHED',
        seatLimit: 100,
        seatsTaken: 0,
        organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
      },
    });
    expect(result.event.seatsTaken).toBe(0);
  });
});
// });
