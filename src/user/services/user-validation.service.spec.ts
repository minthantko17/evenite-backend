import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { UserValidationService } from './user-validation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileAlreadyExistsException } from '../exceptions/profile-already-exists.exception';
import { InvalidMailException } from '../exceptions/invalid-mail.exception';
import { InvalidPreferencesException } from '../exceptions/invalid-preferences.exception';
import { InvalidRoleTransitionException } from '../exceptions/invalid-role-transition.exception';
import { NameEmptyException } from '../exceptions/name-empty.exception';
import { InvalidUrlException } from '../exceptions/invalid-url.exception';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  participantProfile: { findUnique: jest.fn() },
  organizerProfile: { findUnique: jest.fn() },
};


describe('UserValidationService - validateUserExists', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserValidationService>(UserValidationService);
    jest.clearAllMocks();
  });

  it('UT-M055-01: should resolve without throwing when user exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1000000-0000-0000-0000-000000000001',
      email: 'minthant@cmu.ac.th',
    });
    const result = service.validateUserExists(
      'u1000000-0000-0000-0000-000000000001',
    );
    await expect(result).resolves.toBeUndefined();
    await expect(()=>result).not.toThrow();
  });

  it('UT-M055-02: should throw UserNotFoundException with message when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const result = service.validateUserExists(
      'u9999999-9999-9999-9999-999999999999',
    );
    await expect(result).rejects.toThrow(UserNotFoundException);
    await expect(result).rejects.toThrow('User not found.');
  });
});

describe('UserValidationService - validateParticipantProfileNotExists', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserValidationService>(UserValidationService);
    jest.clearAllMocks();
  });

  it('UT-M056-01: should resolve without throwing when participant profile does not exist', async () => {
    mockPrisma.participantProfile.findUnique.mockResolvedValue(null);
    const result = service.validateParticipantProfileNotExists(
      'u2000000-0000-0000-0000-000000000002',
    );
    await expect(result).resolves.toBeUndefined();
    await expect(()=>result).not.toThrow();
  });

  it('UT-M056-02: should throw ProfileAlreadyExistsException with message when participant profile already exists', async () => {
    mockPrisma.participantProfile.findUnique.mockResolvedValue({
      id: 'p1000000-0000-0000-0000-000000000001',
      userId: 'u3000000-0000-0000-0000-000000000003',
    });
    const result = service.validateParticipantProfileNotExists(
      'u3000000-0000-0000-0000-000000000003',
    );
    await expect(result).rejects.toThrow(ProfileAlreadyExistsException);
    await expect(result).rejects.toThrow(
      'Participant profile already exists.',
    );
  });
});

describe('UserValidationService - validateOrganizerProfileNotExists', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserValidationService>(UserValidationService);
    jest.clearAllMocks();
  });

  it('UT-M057-01: should resolve without throwing when organizer profile does not exist', async () => {
    mockPrisma.organizerProfile.findUnique.mockResolvedValue(null);
    const result = service.validateOrganizerProfileNotExists(
      'u4000000-0000-0000-0000-000000000004',
    );
    await expect(result).resolves.toBeUndefined();
    await expect(()=>result).not.toThrow();
  });

  it('UT-M057-02: should throw ProfileAlreadyExistsException with message when organizer profile already exists', async () => {
    mockPrisma.organizerProfile.findUnique.mockResolvedValue({
      id: 'o1000000-0000-0000-0000-000000000001',
      userId: 'u5000000-0000-0000-0000-000000000005',
    });
    const result = service.validateOrganizerProfileNotExists(
      'u5000000-0000-0000-0000-000000000005',
    );
    await expect(result).rejects.toThrow(ProfileAlreadyExistsException);
    await expect(result).rejects.toThrow('Organizer profile already exists.');
  });
});

describe('UserValidationService - validateParticipantProfileData', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserValidationService>(UserValidationService);
    jest.clearAllMocks();
  });

  it('UT-M059-01: should resolve without throwing when full valid dto is provided', () => {
    expect(() =>
      service.validateParticipantProfileData({
        firstName: 'Rory',
        lastName: 'Yin',
        nickname: 'RY',
        contactEmail: 'sawrory_yin@cmu.ac.th',
        preferences: {
          personal: ['MUSIC'],
          event: ['SEMINAR'],
          language: ['en'],
        },
      }),
    ).not.toThrow();
  });

  it('UT-M059-02: should resolve without throwing when only firstName is provided', () => {
    expect(() =>
      service.validateParticipantProfileData({
        firstName: 'Su Su',
      }),
    ).not.toThrow();
  });

  it('UT-M059-03: should resolve without throwing when contactEmail is empty string', () => {
    expect(() =>
      service.validateParticipantProfileData({
        firstName: 'Chaiwat',
        contactEmail: '',
      }),
    ).not.toThrow();
  });

  it('UT-M059-04: should resolve without throwing when optional fields are undefined', () => {
    expect(() =>
      service.validateParticipantProfileData({
        firstName: 'Napat',
        contactEmail: undefined,
        preferences: undefined,
      }),
    ).not.toThrow();
  });

  it('UT-M059-05: should throw NameEmptyException when firstName is empty string', () => {
    const call = () =>
      service.validateParticipantProfileData({ firstName: '' });
    expect(call).toThrow(NameEmptyException);
    expect(call).toThrow('First name cannot be empty.');
  });

  it('UT-M059-06: should throw NameEmptyException when firstName is whitespace only', () => {
    const call = () =>
      service.validateParticipantProfileData({ firstName: '    ' });
    expect(call).toThrow(NameEmptyException);
    expect(call).toThrow('First name cannot be empty.');
  });

  it('UT-M059-07: should throw NameEmptyException when firstName is undefined', () => {
    const call = () =>
      service.validateParticipantProfileData({ firstName: undefined });
    expect(call).toThrow(NameEmptyException);
    expect(call).toThrow('First name cannot be empty.');
  });

  it('UT-M059-08: should throw InvalidMailException when contactEmail has invalid format', () => {
    const call = () =>
      service.validateParticipantProfileData({
        firstName: 'Somsak',
        contactEmail: 'not-valid-email',
      });
    expect(call).toThrow(InvalidMailException);
    expect(call).toThrow('Invalid contact email format.');
  });

  it('UT-M059-09: should throw InvalidMailException when contactEmail is missing @ symbol', () => {
    const call = () =>
      service.validateParticipantProfileData({
        firstName: 'Nattapong',
        contactEmail: 'invalidemail.com',
      });
    expect(call).toThrow(InvalidMailException);
    expect(call).toThrow('Invalid contact email format.');
  });

  it('UT-M059-10: should throw InvalidPreferencesException when personal preference contains invalid value', () => {
    const call = () =>
      service.validateParticipantProfileData({
        firstName: 'Arisa',
        preferences: {
          personal: ['INVALID_HOBBY' as any],
          event: [],
          language: [],
        },
      });
    expect(call).toThrow(InvalidPreferencesException);
    expect(call).toThrow('Invalid personal preferences: INVALID_HOBBY');
  });

  it('UT-M059-11: should throw InvalidPreferencesException when event preference contains invalid value', () => {
    const call = () =>
      service.validateParticipantProfileData({
        firstName: 'Thanida',
        preferences: {
          personal: [],
          event: ['INVALID_EVENT_TYPE' as any],
          language: [],
        },
      });
    expect(call).toThrow(InvalidPreferencesException);
    expect(call).toThrow('Invalid event preferences: INVALID_EVENT_TYPE');
  });

  it('UT-M059-12: should throw InvalidPreferencesException when language preference contains invalid value', () => {
    const call = () =>
      service.validateParticipantProfileData({
        firstName: 'Wanchai',
        preferences: {
          personal: [],
          event: [],
          language: ['jp' as any],
        },
      });
    expect(call).toThrow(InvalidPreferencesException);
    expect(call).toThrow('Invalid language preferences: jp');
  });

  it('UT-M059-13: should throw InvalidPreferencesException when personalOther exceeds max length', () => {
    const call = () =>
      service.validateParticipantProfileData({
        firstName: 'Kanya',
        preferences: {
          personal: [],
          personalOther: 'a'.repeat(101),
          event: [],
          language: [],
        },
        });
        expect(call).toThrow(InvalidPreferencesException);
        expect(call).toThrow('Personal other field must not exceed 100 characters.');
  });
});

describe('UserValidationService - validateOrganizerProfileData', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserValidationService>(UserValidationService);
    jest.clearAllMocks();
  });

  it('UT-M060-01: should resolve without throwing when full valid dto is provided', () => {
    expect(() =>
      service.validateOrganizerProfileData({
        name: 'CAMT Student Club',
        contactEmail: 'club@cmu.ac.th',
        imageUrl: 'https://placehold.co/200x200?text=Image',
        externalUrl: 'https://camt.cmu.ac.th',
      }),
    ).not.toThrow();
  });

  it('UT-M060-02: should resolve without throwing when only name is provided', () => {
    expect(() =>
      service.validateOrganizerProfileData({
        name: 'SE Department',
      }),
    ).not.toThrow();
  });

  it('UT-M060-03: should resolve without throwing when contactEmail is empty string', () => {
    expect(() =>
      service.validateOrganizerProfileData({
        name: 'Engineering Faculty',
        contactEmail: '',
      }),
    ).not.toThrow();
  });

  it('UT-M060-04: should resolve without throwing when externalUrl is empty string', () => {
    expect(() =>
      service.validateOrganizerProfileData({
        name: 'Science Club',
        externalUrl: '',
      }),
    ).not.toThrow();
  });

  it('UT-M060-05: should resolve without throwing when optional fields are undefined', () => {
    expect(() =>
      service.validateOrganizerProfileData({
        name: 'Art Society',
        contactEmail: undefined,
        externalUrl: undefined,
      }),
    ).not.toThrow();
  });

  it('UT-M060-06: should throw NameEmptyException when name is empty string', () => {
    const call = () =>
      service.validateOrganizerProfileData({ name: '' });
    expect(call).toThrow(NameEmptyException);
    expect(call).toThrow('Organizer name cannot be empty.');
  });

  it('UT-M060-07: should throw NameEmptyException when name is whitespace only', () => {
    const call = () =>
      service.validateOrganizerProfileData({ name: '   ' });
    expect(call).toThrow(NameEmptyException);
    expect(call).toThrow('Organizer name cannot be empty.');
  });

  it('UT-M060-08: should throw NameEmptyException when name is undefined', () => {
    const call = () =>
      service.validateOrganizerProfileData({ name: undefined });
    expect(call).toThrow(NameEmptyException);
    expect(call).toThrow('Organizer name cannot be empty.');
  });

  it('UT-M060-09: should throw InvalidMailException when contactEmail has invalid format', () => {
    const call = () =>
      service.validateOrganizerProfileData({
        name: 'Music Club',
        contactEmail: 'invalid-email',
      });
    expect(call).toThrow(InvalidMailException);
    expect(call).toThrow('Invalid contact email format.');
  });

  it('UT-M060-10: should throw InvalidUrlException when externalUrl has invalid format', () => {
    const call = () =>
      service.validateOrganizerProfileData({
        name: 'Sports Club',
        externalUrl: 'not-a-valid-url',
      });
    expect(call).toThrow(InvalidUrlException);
    expect(call).toThrow('Invalid external URL format.');
  });

  it('UT-M060-11: should throw InvalidUrlException when externalUrl is missing protocol', () => {
    const call = () =>
      service.validateOrganizerProfileData({
        name: 'Coding Club',
        externalUrl: 'www.codingclub.com',
      });
    expect(call).toThrow(InvalidUrlException);
    expect(call).toThrow('Invalid external URL format.');
  });
});

describe('UserValidationService - checkRoleTransition', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserValidationService>(UserValidationService);
    jest.clearAllMocks();
  });

  it('UT-M058-01: should resolve without throwing when switching from null to PARTICIPANT', () => {
    expect(() =>
      service.checkRoleTransition(null, Role.PARTICIPANT),
    ).not.toThrow();
  });

  it('UT-M058-02: should resolve without throwing when switching from null to ORGANIZER', () => {
    expect(() =>
      service.checkRoleTransition(null, Role.ORGANIZER),
    ).not.toThrow();
  });

  it('UT-M058-03: should resolve without throwing when switching from PARTICIPANT to ORGANIZER', () => {
    expect(() =>
      service.checkRoleTransition(Role.PARTICIPANT, Role.ORGANIZER),
    ).not.toThrow();
  });

  it('UT-M058-04: should resolve without throwing when switching from ORGANIZER to PARTICIPANT', () => {
    expect(() =>
      service.checkRoleTransition(Role.ORGANIZER, Role.PARTICIPANT),
    ).not.toThrow();
  });

  it('UT-M058-05: should throw InvalidRoleTransitionException with message when switching from PARTICIPANT to PARTICIPANT', () => {
    const call = () =>
      service.checkRoleTransition(Role.PARTICIPANT, Role.PARTICIPANT);
    expect(call).toThrow(InvalidRoleTransitionException);
    expect(call).toThrow('You are already in this role.');
  });

  it('UT-M058-06: should throw InvalidRoleTransitionException with message when switching from ORGANIZER to ORGANIZER', () => {
    const call = () =>
      service.checkRoleTransition(Role.ORGANIZER, Role.ORGANIZER);
    expect(call).toThrow(InvalidRoleTransitionException);
    expect(call).toThrow('You are already in this role.');
  });
});