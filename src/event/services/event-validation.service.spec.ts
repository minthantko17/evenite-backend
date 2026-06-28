import { Test, TestingModule } from '@nestjs/testing';
import { EventValidationService } from './event-validation.service';
import { InvalidPromptException } from '../exceptions/invalid-prompt.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { EventNotFoundException } from '../exceptions/event-not-found.exception';
import { Event, EventStatus } from '@prisma/client';
import { EventStatusChangeException } from '../exceptions/event-status-change.exception';

const mockPrisma = {
  event: {
    findUnique: jest.fn(),
  },
};

describe('EventValidationService - validatePromptText', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-2-001-01: should not throw for valid English prompt', () => {
    expect(() =>
      service.validatePromptText('Workshop on Machine Learning'),
    ).not.toThrow();
  });

  it('UT-2-001-02: should not throw for valid Thai prompt', () => {
    expect(() =>
      service.validatePromptText('งานกีฬาสี มหาวิทยาลัยเชียงใหม่'),
    ).not.toThrow();
  });

  it('UT-2-001-03: should not throw for valid mixed Thai and English prompt', () => {
    expect(() =>
      service.validatePromptText('CAMT วิศวกรรมซอฟต์แวร์ Workshop'),
    ).not.toThrow();
  });

  it('UT-2-001-04: should not throw for valid prompt mixed with symbols', () => {
    expect(() =>
      service.validatePromptText('!!! CAMT Halloween Night 2026 @@@'),
    ).not.toThrow();
  });

  it('UT-2-001-05: should not throw for numbers only', () => {
    expect(() => service.validatePromptText('12345')).not.toThrow();
  });

  it('UT-2-001-06: should not throw for whitespace padded valid prompt', () => {
    expect(() =>
      service.validatePromptText('   CAMT Study Trip   '),
    ).not.toThrow();
  });

  it('UT-2-001-07: should throw InvalidPromptException for empty string', () => {
    expect(() => service.validatePromptText('')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('')).toThrow(
      "Prompt field can't be empty",
    );
  });

  it('UT-2-001-08: should throw InvalidPromptException for whitespace only', () => {
    expect(() => service.validatePromptText('     ')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('     ')).toThrow(
      "Prompt field can't be empty",
    );
  });

  it('UT-2-001-09: should throw InvalidPromptException for symbols only', () => {
    expect(() => service.validatePromptText('@#$%^&*!')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('@#$%^&*!')).toThrow(
      'Invalid Input',
    );
  });
});

describe('EventValidationService - validatePublishDateRange', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-2-002-01: should not throw when startAt is before endAt', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(() =>
      service.validatePublishDateRange(startAt, endAt),
    ).not.toThrow();
  });

  it('UT-2-002-02: should throw InvalidDateRangeException when startAt equals endAt', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      InvalidDateRangeException,
    );
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      'Start date must be before end date.',
    );
  });

  it('UT-2-002-03: should throw InvalidDateRangeException when startAt is after endAt', () => {
    const startAt = new Date('2026-10-31T12:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      InvalidDateRangeException,
    );
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      'Start date must be before end date.',
    );
  });
});

describe('EventValidationService - validateEventExists', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-2-003-01: should return the event when it exists', async () => {
    const eventId = 'mock-event-uuid-1234';
    const mockFoundEvent = {
      id: eventId,
      organizerId: 'mock-organizer-uuid-5678',
      universityId: 'mock-university-uuid-9012',
      title: 'Mock Event',
      description: 'Mock event description',
      startAt: new Date('2026-10-31T09:00:00.000Z'),
      endAt: new Date('2026-10-31T12:00:00.000Z'),
      createdAt: new Date('2026-10-01T08:00:00.000Z'),
      updatedAt: new Date('2026-10-15T10:00:00.000Z'),
      publishedAt: null,
      status: EventStatus.DRAFT,
    };
    mockPrisma.event.findUnique.mockResolvedValueOnce(mockFoundEvent);

    const result = await service.validateEventExists(eventId);
    // console.log('Result from validateEventExists:', result);
    // console.log('expected: ', mockFoundEvent);

    expect(result).toEqual(mockFoundEvent);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
    });
    expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-2-003-02: should throw EventNotFoundException when event does not exist', async () => {
    const eventId = 'non-existent-uuid-9999';
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    const result = service.validateEventExists(eventId);
    await expect(result).rejects.toThrow(EventNotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
    });
  });
});

describe('EventValidationService - validateEventOwnership', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-2-004-01: should return the organizer ID when organizer owns the event', async () => {
    const eventId = 'mock-event-uuid-1234';
    const organizerId = 'mock-org-uuid-1234';
    const mockFoundEvent = { organizerId };
    mockPrisma.event.findUnique.mockResolvedValueOnce(mockFoundEvent);
    const expected = { organizerProfileId: organizerId };
    
    const result =await
      service.validateEventOwnership(eventId, organizerId);
    // console.log('Expected: ', expected);
    // console.log('Result: ', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      select: { organizerId: true },
    });
    expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-2-004-02: should throw EventNotFoundException when event does not exist', async () => {
    const eventId = 'non-existent-uuid-9999';
    const organizerId = 'mock-org-uuid-1234';
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    const result = service.validateEventOwnership(eventId, organizerId);
    await expect(result).rejects.toThrow(EventNotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      select: { organizerId: true },
    });
  });

  it('UT-2-004-03: should throw ForbiddenException when organizer does not own the event', async () => {
    const eventId = 'mock-event-uuid-1234';
    const actualOwnerId = 'mock-owner-uuid-1234';
    const requestingOrganizerId = 'mock-non-matching-org-uuid-5678';
    const mockFoundEvent = { organizerId: actualOwnerId };
    mockPrisma.event.findUnique.mockResolvedValueOnce(mockFoundEvent);

    const result = service.validateEventOwnership(
      eventId,
      requestingOrganizerId,
    );
    await expect(result).rejects.toThrow(ForbiddenException);
    await expect(result).rejects.toThrow(
      'You do not have permission to edit this event.',
    );
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      select: { organizerId: true },
    });
  });
});

describe('EventValidationService - ', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  // PUBLISHED allowed transitions: ONGOING, CONCLUDED, CANCELLED
  it('UT-M007-01: should not throw when transitioning from PUBLISHED to ONGOING', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.PUBLISHED,
        EventStatus.ONGOING,
      ),
    ).not.toThrow();
  });

  it('UT-M007-02: should not throw when transitioning from PUBLISHED to CONCLUDED', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.PUBLISHED,
        EventStatus.CONCLUDED,
      ),
    ).not.toThrow();
  });

  it('UT-M007-03: should not throw when transitioning from PUBLISHED to CANCELLED', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.PUBLISHED,
        EventStatus.CANCELLED,
      ),
    ).not.toThrow();
  });

  // ONGOING allowed transitions: PUBLISHED, CONCLUDED, CANCELLED
  it('UT-M007-04: should not throw when transitioning from ONGOING to PUBLISHED', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.ONGOING,
        EventStatus.PUBLISHED,
      ),
    ).not.toThrow();
  });

  it('UT-M007-05: should not throw when transitioning from ONGOING to CONCLUDED', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.ONGOING,
        EventStatus.CONCLUDED,
      ),
    ).not.toThrow();
  });

  it('UT-M007-06: should not throw when transitioning from ONGOING to CANCELLED', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.ONGOING,
        EventStatus.CANCELLED,
      ),
    ).not.toThrow();
  });

  it('UT-M007-07: should throw EventStatusChangeException when transitioning from DRAFT to any status', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.DRAFT,
        EventStatus.PUBLISHED,
      ),
    ).toThrow(EventStatusChangeException);
    expect(() =>
      service.validateStatusTransition(EventStatus.DRAFT, EventStatus.ONGOING),
    ).toThrow(
      `Cannot transition from ${EventStatus.DRAFT} to ${EventStatus.ONGOING}.`,
    );
  });

  it('UT-M007-08: should throw EventStatusChangeException when transitioning from CONCLUDED to any status', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.CONCLUDED,
        EventStatus.PUBLISHED,
      ),
    ).toThrow(EventStatusChangeException);
    expect(() =>
      service.validateStatusTransition(
        EventStatus.CONCLUDED,
        EventStatus.ONGOING,
      ),
    ).toThrow(
      `Cannot transition from ${EventStatus.CONCLUDED} to ${EventStatus.ONGOING}.`,
    );
  });

  it('UT-M007-09: should throw EventStatusChangeException when transitioning from CANCELLED to any status', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.CANCELLED,
        EventStatus.PUBLISHED,
      ),
    ).toThrow(EventStatusChangeException);
  });

  it('UT-M007-10: should throw EventStatusChangeException when transitioning from PUBLISHED to DRAFT', () => {
    expect(() =>
      service.validateStatusTransition(
        EventStatus.PUBLISHED,
        EventStatus.DRAFT,
      ),
    ).toThrow(EventStatusChangeException);
    expect(() =>
      service.validateStatusTransition(
        EventStatus.PUBLISHED,
        EventStatus.DRAFT,
      ),
    ).toThrow(
      `Cannot transition from ${EventStatus.PUBLISHED} to ${EventStatus.DRAFT}.`,
    );
  });

  it('UT-M007-11: should throw EventStatusChangeException when transitioning from ONGOING to DRAFT', () => {
    expect(() =>
      service.validateStatusTransition(EventStatus.ONGOING, EventStatus.DRAFT),
    ).toThrow(EventStatusChangeException);
  });
});
