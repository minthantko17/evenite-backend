import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UserCrudService } from './user-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';
import { SaveProfileException } from '../exceptions/save-profile.exception';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from '../constants/user-images.constant';
import { DEFAULT_PREFERENCES } from '../constants/user-preferences.constant';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  participantProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  organizerProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const MOCK_UNIVERSITY_ID = 'univ0001-0000-0000-0000-000000000001';
const MOCK_USER_ID_1 = 'u1000000-0000-0000-0000-000000000001';
const MOCK_USER_ID_2 = 'u2000000-0000-0000-0000-000000000002';
const MOCK_USER_ID_3 = 'u3000000-0000-0000-0000-000000000003';
const MOCK_PARTICIPANT_PROFILE_ID_1 = 'p1000000-0000-0000-0000-000000000001';
const MOCK_ORGANIZER_PROFILE_ID_1 = 'o1000000-0000-0000-0000-000000000001';

const mockFullParticipantProfile = {
  id: MOCK_PARTICIPANT_PROFILE_ID_1,
  userId: MOCK_USER_ID_1,
  firstName: 'Su Su',
  lastName: 'Myint',
  nickname: 'Su',
  studentId: '662115510',
  major: 'Software Engineering',
  contactEmail: 'susu@cmu.ac.th',
  contactPhone: '0812345678',
  contactLineId: 'susu_line',
  imageUrl: `https://mockproject.supabase.co/storage/v1/object/public/evenite-images/participant/susu.jpg`,
  preferences: {
    personal: ['MUSIC'],
    event: ['SEMINAR'],
    language: ['en'],
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockMinimalParticipantProfile = {
  id: 'p2000000-0000-0000-0000-000000000002',
  userId: MOCK_USER_ID_2,
  firstName: 'Napat',
  lastName: null,
  nickname: null,
  studentId: null,
  major: null,
  contactEmail: null,
  contactPhone: null,
  contactLineId: null,
  imageUrl: null,
  preferences: null,
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
};

const mockFullOrganizerProfile = {
  id: MOCK_ORGANIZER_PROFILE_ID_1,
  userId: MOCK_USER_ID_3,
  name: 'CAMT Student Club',
  bio: 'We organize events for CAMT students.',
  contactEmail: 'club@cmu.ac.th',
  contactPhone: '0898765432',
  contactLineId: 'camt_club',
  imageUrl: `https://mockproject.supabase.co/storage/v1/object/public/evenite-images/organizer/camt.png`,
  externalUrl: 'https://camt.cmu.ac.th',
  createdAt: new Date('2026-01-15T00:00:00.000Z'),
};

const mockMinimalOrganizerProfile = {
  id: 'o2000000-0000-0000-0000-000000000002',
  userId: MOCK_USER_ID_2,
  name: 'SE Department',
  bio: null,
  contactEmail: null,
  contactPhone: null,
  contactLineId: null,
  imageUrl: null,
  externalUrl: null,
  createdAt: new Date('2026-02-15T00:00:00.000Z'),
};

const createParticipantDto = () => ({
  firstName: 'Arisa',
  lastName: 'Tanaka',
  nickname: 'Ari',
  studentId: '662115520',
  major: 'Computer Science',
  contactEmail: 'arisa@cmu.ac.th',
  contactPhone: '0823456789',
  contactLineId: 'arisa_line',
  imageUrl: `https://mockproject.supabase.co/storage/v1/object/public/evenite-images/participant/arisa.jpg`,
  preferences: {
    personal: ['MUSIC'],
    event: ['WORKSHOP'],
    language: ['en', 'th'],
  },
});

const createOrganizerDto = () => ({
  name: 'Engineering Faculty Club',
  bio: 'Organizing tech events for engineers.',
  contactEmail: 'eng@cmu.ac.th',
  contactPhone: '0844444444',
  contactLineId: 'eng_club',
  imageUrl: `https://mockproject.supabase.co/storage/v1/object/public/evenite-images/organizer/eng.jpg`,
  externalUrl: 'https://eng.cmu.ac.th',
});


const buildModule = async (): Promise<TestingModule> =>
  Test.createTestingModule({
    providers: [
      UserCrudService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();

describe('UserCrudService - getUserById', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-011-01: should return mapped ReturnUserDto when user exists with both profiles', async () => {
    const input = { userId: MOCK_USER_ID_1 };
    const mockFoundUser = {
      id: MOCK_USER_ID_1,
      email: 'minthant@cmu.ac.th',
      currentRole: Role.PARTICIPANT,
      isVerified: true,
      universityId: MOCK_UNIVERSITY_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      participantProfile: mockFullParticipantProfile,
      organizerProfile: mockFullOrganizerProfile,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser);

    const result = await service.getUserById(input.userId);

    // console.log('[UT-4-011-01] Input :', input);
    // console.log('[UT-4-011-01] Expected :', mockFoundUser);
    // console.log('[UT-4-011-01] Actual :', result);

    expect(result.id).toBe(MOCK_USER_ID_1);
    expect(result.participantProfile).not.toBeNull();
    expect(result.organizerProfile).not.toBeNull();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: input.userId },
      include: {
        participantProfile: true,
        organizerProfile: true,
      },
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-4-011-02: should return mapped ReturnUserDto when user exists with only participant profile', async () => {
    const input = { userId: MOCK_USER_ID_2 };
    const mockFoundUser = {
      id: MOCK_USER_ID_2,
      email: 'rory@cmu.ac.th',
      currentRole: Role.PARTICIPANT,
      isVerified: true,
      universityId: MOCK_UNIVERSITY_ID,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      participantProfile: mockFullParticipantProfile,
      organizerProfile: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser);

    const result = await service.getUserById(input.userId);

    // console.log('[UT-4-011-02] Input :', input);
    // console.log('[UT-4-011-02] Expected: ', mockFoundUser);
    // console.log('[UT-4-011-02] Actual result:', result);

    expect(result.participantProfile).not.toBeNull();
    expect(result.organizerProfile).toBeNull();
  });

  it('UT-4-011-03: should return mapped ReturnUserDto when user exists with only organizer profile', async () => {
    const input = { userId: MOCK_USER_ID_3 };
    const mockFoundUser = {
      id: MOCK_USER_ID_3,
      email: 'chaiwat@cmu.ac.th',
      currentRole: Role.ORGANIZER,
      isVerified: true,
      universityId: MOCK_UNIVERSITY_ID,
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      participantProfile: null,
      organizerProfile: mockFullOrganizerProfile,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser);

    const result = await service.getUserById(input.userId);

    // console.log('[UT-4-011-03] Input :', input);
    // console.log('[UT-4-011-03] Expected :', mockFoundUser);
    // console.log('[UT-4-011-03] Actual result:', result);

    expect(result.participantProfile).toBeNull();
    expect(result.organizerProfile).not.toBeNull();
  });

  it('UT-4-011-04: should return mapped ReturnUserDto when user exists with no profiles', async () => {
    const input = { userId: 'u4000000-0000-0000-0000-000000000004' };
    const mockFoundUser = {
      id: input.userId,
      email: 'newuser@cmu.ac.th',
      currentRole: null,
      isVerified: true,
      universityId: MOCK_UNIVERSITY_ID,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      participantProfile: null,
      organizerProfile: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockFoundUser);

    const result = await service.getUserById(input.userId);
    // console.log('[UT-4-011-04] Input :', input);
    // console.log('[UT-4-011-04] Expected currentRole: null | participantProfile: null | organizerProfile: null');
    // console.log('[UT-4-011-04] Expected result:', mockFoundUser);
    // console.log('[UT-4-011-04] Actual result:', result);

    expect(result.currentRole).toBeNull();
    expect(result.participantProfile).toBeNull();
    expect(result.organizerProfile).toBeNull();
  });

  it('UT-4-011-05: should throw UserNotFoundException when user not found', async () => {
    const input = { userId: 'u9999999-9999-9999-9999-999999999999' };
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const result = service.getUserById(input.userId);

    await expect(result).rejects.toThrow(UserNotFoundException);
    await expect(result).rejects.toThrow('User not found.');
  });
});

describe('UserCrudService - updateUserRole', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-012-01: should return user when updating role to PARTICIPANT', async () => {
    const input = { userId: MOCK_USER_ID_1, role: Role.PARTICIPANT };
    const expected = {
      id: input.userId,
      currentRole: Role.PARTICIPANT
    };
    mockPrisma.user.update.mockResolvedValue(expected);

    const result = await service.updateUserRole(input.userId, input.role);
    
    expect(result).toEqual(expected);

    // console.log('[UT-4-012-01] Input :', input);
    // console.log('[UT-4-012-01] Expected:', expected);
    // console.log('[UT-4-012-01] Actual :', result);
  });

  it('UT-4-012-02: should return user when updating role to ORGANIZER', async () => {
    const input = { userId: MOCK_USER_ID_2, role: Role.ORGANIZER };
    const expected = {
      id: input.userId,
      currentRole: Role.ORGANIZER,
    };
    mockPrisma.user.update.mockResolvedValue(expected);

    const result = await service.updateUserRole(input.userId, input.role);
    expect(result).toEqual(expected);

    // console.log('[UT-4-012-02] Input :', input);
    // console.log('[UT-4-012-02] Expected:', expected);
    // console.log('[UT-4-012-02] Actual :', result );
  });

  it('UT-4-012-03: should return user when updating role to null', async () => {
    const input = { userId: MOCK_USER_ID_1, role: null as any };
    const expected = {
      id: input.userId,
      currentRole: null
    };
    mockPrisma.user.update.mockResolvedValue(expected);

    const result = await service.updateUserRole(input.userId, input.role);
    expect(result).toEqual(expected);
  });

  it('UT-4-012-04: should throw SaveProfileException when prisma update fails', async () => {
    const input = { userId: MOCK_USER_ID_1, role: Role.PARTICIPANT };
    mockPrisma.user.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.user.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.updateUserRole(input.userId, input.role),
    ).rejects.toThrow(SaveProfileException);
    await expect(
      service.updateUserRole(input.userId, input.role),
    ).rejects.toThrow('Failed to update user role. Please try again.');
  });
});

describe('UserCrudService - getParticipantProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-013-01: should return mapped ReturnParticipantProfileDto when profile exists with all fields', async () => {
    const input = { userId: MOCK_USER_ID_1 };
    const expected = {
      id: MOCK_PARTICIPANT_PROFILE_ID_1,
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'susu@cmu.ac.th',
      contactPhone: '0812345678',
      contactLineId: 'susu_line',
      imageUrl: mockFullParticipantProfile.imageUrl,
      preferences: mockFullParticipantProfile.preferences,
      createdAt: mockFullParticipantProfile.createdAt,
    };
    mockPrisma.participantProfile.findUnique.mockResolvedValue(
      mockFullParticipantProfile,
    );

    const result = await service.getParticipantProfile(input.userId);

    // console.log('[UT-4-013-01] Input :', input);
    // console.log('[UT-4-013-01] Expected :', expected);
    // console.log('[UT-4-013-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.participantProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: input.userId },
    });
    expect(mockPrisma.participantProfile.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-4-013-02: should return mapped dto with defaults when profile has null optional fields', async () => {
    const input = { userId: MOCK_USER_ID_2 };
    const expected = {
      id: mockMinimalParticipantProfile.id,
      firstName: 'Napat',
      lastName: '',
      nickname: '',
      studentId: '',
      major: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      imageUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
      preferences: DEFAULT_PREFERENCES,
      createdAt: mockMinimalParticipantProfile.createdAt,
    };
    mockPrisma.participantProfile.findUnique.mockResolvedValue(
      mockMinimalParticipantProfile,
    );

    const result = await service.getParticipantProfile(input.userId);

    // console.log('[UT-4-013-02] Input :', input);
    // console.log('[UT-4-013-02] Expected :', expected);
    // console.log('[UT-4-013-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.lastName).toBe('');
    expect(result.imageUrl).toBe(DEFAULT_PARTICIPANT_IMAGE_URL);
    expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('UT-4-013-03: should throw ProfileNotFoundException when participant profile not found', async () => {
    const input = { userId: 'u9999999-9999-9999-9999-999999999999' };
    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce(null);

    const result = service.getParticipantProfile(input.userId);

    await expect(result).rejects.toThrow(ProfileNotFoundException);
    await expect(result).rejects.toThrow('Participant profile not found.');
  });
});

describe('UserCrudService - createParticipantProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-014-01: should create and return mapped ReturnParticipantProfileDto with full dto', async () => {
    const input = {
      userId: 'u5000000-0000-0000-0000-000000000005',
      dto: createParticipantDto(),
    };
    const mockCreated = {
      id: 'p3000000-0000-0000-0000-000000000003',
      userId: input.userId,
      ...input.dto,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    };
    const expected = {
      id: mockCreated.id,
      firstName: 'Arisa',
      lastName: 'Tanaka',
      nickname: 'Ari',
      studentId: '662115520',
      major: 'Computer Science',
      contactEmail: 'arisa@cmu.ac.th',
      contactPhone: '0823456789',
      contactLineId: 'arisa_line',
      imageUrl: input.dto.imageUrl,
      preferences: input.dto.preferences,
      createdAt: mockCreated.createdAt,
    };
    mockPrisma.participantProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createParticipantProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-014-01] Input :', input);
    // console.log('[UT-4-014-01] Expected :', expected);
    // console.log('[UT-4-014-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.participantProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: input.userId,
          firstName: 'Arisa',
        }),
      }),
    );
    expect(mockPrisma.participantProfile.create).toHaveBeenCalledTimes(1);
  });

  it('UT-4-014-02: should create participant profile with defaults when only firstName provided', async () => {
    const input = {
      userId: 'u6000000-0000-0000-0000-000000000006',
      dto: { firstName: 'Somsak' },
    };
    const mockCreated = {
      id: 'p4000000-0000-0000-0000-000000000004',
      userId: input.userId,
      firstName: 'Somsak',
      lastName: null,
      nickname: null,
      studentId: null,
      major: null,
      contactEmail: null,
      contactPhone: null,
      contactLineId: null,
      imageUrl: null,
      preferences: null,
      createdAt: new Date('2026-03-02T00:00:00.000Z'),
    };
    const expected = {
      id: mockCreated.id,
      firstName: 'Somsak',
      lastName: '',
      nickname: '',
      studentId: '',
      major: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      imageUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
      preferences: DEFAULT_PREFERENCES,
      createdAt: mockCreated.createdAt,
    };
    mockPrisma.participantProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createParticipantProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-014-02] Input :', input);
    // console.log('[UT-4-014-02] Expected :', expected);
    // console.log('[UT-4-014-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.imageUrl).toBe(DEFAULT_PARTICIPANT_IMAGE_URL);
    expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('UT-4-014-03: should throw SaveProfileException when prisma create fails', async () => {
    const input = {
      userId: 'u7000000-0000-0000-0000-000000000007',
      dto: { firstName: 'Thanida' },
    };
    mockPrisma.participantProfile.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.participantProfile.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.createParticipantProfile(input.userId, input.dto as any),
    ).rejects.toThrow(SaveProfileException);
    await expect(
      service.createParticipantProfile(input.userId, input.dto as any),
    ).rejects.toThrow(
      'Failed to create participant profile. Please try again.',
    );
  });
});

describe('UserCrudService - updateParticipantProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-015-01: should update and return mapped ReturnParticipantProfileDto with full dto', async () => {
    const input = {
      userId: MOCK_USER_ID_1,
      dto: {
        firstName: 'Min Thant',
        lastName: 'Ko',
        nickname: 'Min',
        studentId: '662115510',
        major: 'Software Engineering',
        contactEmail: 'min@cmu.ac.th',
        contactPhone: '0811111111',
        contactLineId: 'min_line',
      },
    };
    const mockUpdated = {
      id: MOCK_PARTICIPANT_PROFILE_ID_1,
      userId: MOCK_USER_ID_1,
      ...input.dto,
      imageUrl: null,
      preferences: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const expected = {
      id: MOCK_PARTICIPANT_PROFILE_ID_1,
      firstName: 'Min Thant',
      lastName: 'Ko',
      nickname: 'Min',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'min@cmu.ac.th',
      contactPhone: '0811111111',
      contactLineId: 'min_line',
      imageUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
      preferences: DEFAULT_PREFERENCES,
      createdAt: mockUpdated.createdAt,
    };
    mockPrisma.participantProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateParticipantProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-015-01] Input :', input);
    // console.log('[UT-4-015-01] Expected :', expected);
    // console.log('[UT-4-015-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: input.userId },
        data: expect.objectContaining({ firstName: 'Min Thant' }),
      }),
    );
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledTimes(1);
  });

  it('UT-4-015-02: should update with partial dto and only send provided fields to prisma', async () => {
    const input = {
      userId: MOCK_USER_ID_2,
      dto: { firstName: 'Updated Name' },
    };
    const mockUpdated = {
      ...mockFullParticipantProfile,
      userId: MOCK_USER_ID_2,
      firstName: 'Updated Name',
    };
    mockPrisma.participantProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateParticipantProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-015-02] Input :', input);
    // console.log('[UT-4-015-02] Expected firstName: Updated Name');
    // console.log('[UT-4-015-02] Actual firstName:', result.firstName);

    expect(result.firstName).toBe('Updated Name');
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledWith({
      where: { userId: input.userId },
      data: { firstName: 'Updated Name' },
    });
  });

  it('UT-4-015-03: should update with empty string fields and persist them', async () => {
    const input = {
      userId: MOCK_USER_ID_3,
      dto: { lastName: '', nickname: '' },
    };
    const mockUpdated = {
      ...mockFullParticipantProfile,
      userId: MOCK_USER_ID_3,
      lastName: '',
      nickname: '',
    };
    const expected = {
      id: mockUpdated.id,
      firstName: mockUpdated.firstName,
      lastName: '',
      nickname: '',
      studentId: mockUpdated.studentId,
      major: mockUpdated.major,
      contactEmail: mockUpdated.contactEmail,
      contactPhone: mockUpdated.contactPhone,
      contactLineId: mockUpdated.contactLineId,
      imageUrl: mockUpdated.imageUrl,
      preferences: mockUpdated.preferences,
      createdAt: mockUpdated.createdAt,
    };
    mockPrisma.participantProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateParticipantProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-015-03] Input :', input);
    // console.log('[UT-4-015-03] Expected :', expected);
    // console.log('[UT-4-015-03] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.lastName).toBe('');
    expect(result.nickname).toBe('');
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledWith({
      where: { userId: input.userId },
      data: { lastName: '', nickname: '' },
    });
  });

  it('UT-4-015-04: should throw SaveProfileException when prisma update fails', async () => {
    const input = { userId: MOCK_USER_ID_1, dto: { firstName: 'Fail Test' } };
    mockPrisma.participantProfile.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.participantProfile.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.updateParticipantProfile(input.userId, input.dto as any),
    ).rejects.toThrow(SaveProfileException);
    await expect(
      service.updateParticipantProfile(input.userId, input.dto as any),
    ).rejects.toThrow(
      'Failed to update participant profile. Please try again.',
    );
  });
});

describe('UserCrudService - getOrganizerProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-016-01: should return mapped ReturnOrganizerProfileDto when profile exists with all fields', async () => {
    const input = { userId: MOCK_USER_ID_3 };
    const expected = {
      id: MOCK_ORGANIZER_PROFILE_ID_1,
      name: 'CAMT Student Club',
      bio: 'We organize events for CAMT students.',
      contactEmail: 'club@cmu.ac.th',
      contactPhone: '0898765432',
      contactLineId: 'camt_club',
      imageUrl: mockFullOrganizerProfile.imageUrl,
      externalUrl: 'https://camt.cmu.ac.th',
      createdAt: mockFullOrganizerProfile.createdAt,
    };
    mockPrisma.organizerProfile.findUnique.mockResolvedValue(
      mockFullOrganizerProfile,
    );

    const result = await service.getOrganizerProfile(input.userId);

    // console.log('[UT-4-016-01] Input :', input);
    // console.log('[UT-4-016-01] Expected :', expected);
    // console.log('[UT-4-016-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.organizerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: input.userId },
    });
    expect(mockPrisma.organizerProfile.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-4-016-02: should return mapped dto with defaults when profile has null optional fields', async () => {
    const input = { userId: MOCK_USER_ID_2 };
    const expected = {
      id: mockMinimalOrganizerProfile.id,
      name: 'SE Department',
      bio: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      imageUrl: DEFAULT_ORGANIZER_IMAGE_URL,
      externalUrl: '',
      createdAt: mockMinimalOrganizerProfile.createdAt,
    };
    mockPrisma.organizerProfile.findUnique.mockResolvedValue(
      mockMinimalOrganizerProfile,
    );

    const result = await service.getOrganizerProfile(input.userId);

    // console.log('[UT-4-016-02] Input :', input);
    // console.log('[UT-4-016-02] Expected :', expected);
    // console.log('[UT-4-016-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.bio).toBe('');
    expect(result.imageUrl).toBe(DEFAULT_ORGANIZER_IMAGE_URL);
  });

  it('UT-4-016-03: should throw ProfileNotFoundException when organizer profile not found', async () => {
    const input = { userId: 'u9999999-9999-9999-9999-999999999998' };
    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce(null);

    const result = service.getOrganizerProfile(input.userId);

    await expect(result).rejects.toThrow(ProfileNotFoundException);
    await expect(result).rejects.toThrow('Organizer profile not found.');
  });
});

describe('UserCrudService - createOrganizerProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-017-01: should create and return mapped ReturnOrganizerProfileDto with full dto', async () => {
    const input = {
      userId: 'u5000000-0000-0000-0000-000000000005',
      dto: createOrganizerDto(),
    };
    const mockCreated = {
      id: 'o3000000-0000-0000-0000-000000000003',
      userId: input.userId,
      ...input.dto,
      createdAt: new Date('2026-03-05T00:00:00.000Z'),
    };
    const expected = {
      id: mockCreated.id,
      name: 'Engineering Faculty Club',
      bio: 'Organizing tech events for engineers.',
      contactEmail: 'eng@cmu.ac.th',
      contactPhone: '0844444444',
      contactLineId: 'eng_club',
      imageUrl: input.dto.imageUrl,
      externalUrl: 'https://eng.cmu.ac.th',
      createdAt: mockCreated.createdAt,
    };
    mockPrisma.organizerProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createOrganizerProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-017-01] Input :', input);
    // console.log('[UT-4-017-01] Expected :', expected);
    // console.log('[UT-4-017-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.organizerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: input.userId,
          name: 'Engineering Faculty Club',
        }),
      }),
    );
    expect(mockPrisma.organizerProfile.create).toHaveBeenCalledTimes(1);
  });

  it('UT-4-017-02: should create organizer profile with defaults when only name provided', async () => {
    const input = {
      userId: 'u6000000-0000-0000-0000-000000000006',
      dto: { name: 'Science Society' },
    };
    const mockCreated = {
      id: 'o4000000-0000-0000-0000-000000000004',
      userId: input.userId,
      name: 'Science Society',
      bio: null,
      contactEmail: null,
      contactPhone: null,
      contactLineId: null,
      imageUrl: null,
      externalUrl: null,
      createdAt: new Date('2026-03-06T00:00:00.000Z'),
    };
    const expected = {
      id: mockCreated.id,
      name: 'Science Society',
      bio: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      imageUrl: DEFAULT_ORGANIZER_IMAGE_URL,
      externalUrl: '',
      createdAt: mockCreated.createdAt,
    };
    mockPrisma.organizerProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createOrganizerProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-017-02] Input :', input);
    // console.log('[UT-4-017-02] Expected :', expected);
    // console.log('[UT-4-017-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.bio).toBe('');
    expect(result.imageUrl).toBe(DEFAULT_ORGANIZER_IMAGE_URL);
  });

  it('UT-4-017-03: should throw SaveProfileException when prisma create fails', async () => {
    const input = {
      userId: 'u9000000-0000-0000-0000-000000000009',
      dto: { name: 'Duplicate Club' },
    };
    mockPrisma.organizerProfile.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.organizerProfile.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.createOrganizerProfile(input.userId, input.dto as any),
    ).rejects.toThrow(SaveProfileException);
    await expect(
      service.createOrganizerProfile(input.userId, input.dto as any),
    ).rejects.toThrow('Failed to create organizer profile. Please try again.');
  });
});

describe('UserCrudService - updateOrganizerProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-018-01: should update and return mapped ReturnOrganizerProfileDto with full dto', async () => {
    const input = {
      userId: MOCK_USER_ID_3,
      dto: {
        name: 'Updated CAMT Club',
        bio: 'Updated bio.',
        contactEmail: 'updated@cmu.ac.th',
        contactPhone: '0855555555',
        contactLineId: 'updated_line',
        externalUrl: 'https://updated.cmu.ac.th',
      },
    };
    const mockUpdated = {
      id: MOCK_ORGANIZER_PROFILE_ID_1,
      userId: MOCK_USER_ID_3,
      ...input.dto,
      imageUrl: null,
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
    };
    const expected = {
      id: MOCK_ORGANIZER_PROFILE_ID_1,
      name: 'Updated CAMT Club',
      bio: 'Updated bio.',
      contactEmail: 'updated@cmu.ac.th',
      contactPhone: '0855555555',
      contactLineId: 'updated_line',
      imageUrl: DEFAULT_ORGANIZER_IMAGE_URL,
      externalUrl: 'https://updated.cmu.ac.th',
      createdAt: mockUpdated.createdAt,
    };
    mockPrisma.organizerProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateOrganizerProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-018-01] Input :', input);
    // console.log('[UT-4-018-01] Expected :', expected);
    // console.log('[UT-4-018-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.organizerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: input.userId },
        data: expect.objectContaining({ name: 'Updated CAMT Club' }),
      }),
    );
    expect(mockPrisma.organizerProfile.update).toHaveBeenCalledTimes(1);
  });

  it('UT-4-018-02: should update with partial dto and only send provided fields to prisma', async () => {
    const input = {
      userId: MOCK_USER_ID_2,
      dto: { name: 'Renamed Department' },
    };
    const mockUpdated = {
      ...mockFullOrganizerProfile,
      userId: MOCK_USER_ID_2,
      name: 'Renamed Department',
    };
    mockPrisma.organizerProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateOrganizerProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-018-02] Input :', input);
    // console.log('[UT-4-018-02] Expected name: Renamed Department');
    // console.log('[UT-4-018-02] Actual name:', result.name);

    expect(result.name).toBe('Renamed Department');
    expect(mockPrisma.organizerProfile.update).toHaveBeenCalledWith({
      where: { userId: input.userId },
      data: { name: 'Renamed Department' },
    });
  });

  it('UT-4-018-03: should update with empty string fields and persist them', async () => {
    const input = {
      userId: MOCK_USER_ID_3,
      dto: { bio: '', contactEmail: '' },
    };
    const mockUpdated = {
      ...mockFullOrganizerProfile,
      userId: MOCK_USER_ID_3,
      bio: '',
      contactEmail: '',
    };
    const expected = {
      id: mockUpdated.id,
      name: mockUpdated.name,
      bio: '',
      contactEmail: '',
      contactPhone: mockUpdated.contactPhone,
      contactLineId: mockUpdated.contactLineId,
      imageUrl: mockUpdated.imageUrl,
      externalUrl: mockUpdated.externalUrl,
      createdAt: mockUpdated.createdAt,
    };
    mockPrisma.organizerProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateOrganizerProfile(
      input.userId,
      input.dto as any,
    );

    // console.log('[UT-4-018-03] Input :', input);
    // console.log('[UT-4-018-03] Expected :', expected);
    // console.log('[UT-4-018-03] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.bio).toBe('');
    expect(result.contactEmail).toBe('');
    expect(mockPrisma.organizerProfile.update).toHaveBeenCalledWith({
      where: { userId: input.userId },
      data: { bio: '', contactEmail: '' },
    });
  });

  it('UT-4-018-04: should throw SaveProfileException when prisma update fails', async () => {
    const input = { userId: MOCK_USER_ID_1, dto: { name: 'Fail Test' } };
    mockPrisma.organizerProfile.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.organizerProfile.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.updateOrganizerProfile(input.userId, input.dto as any),
    ).rejects.toThrow(SaveProfileException);
    await expect(
      service.updateOrganizerProfile(input.userId, input.dto as any),
    ).rejects.toThrow('Failed to update organizer profile. Please try again.');
  });
});

describe('UserCrudService - mapToReturnParticipantProfileDto', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-019-01: should return fully mapped dto when all fields are present', () => {
    const input = mockFullParticipantProfile;
    const expected = {
      id: MOCK_PARTICIPANT_PROFILE_ID_1,
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'susu@cmu.ac.th',
      contactPhone: '0812345678',
      contactLineId: 'susu_line',
      imageUrl: mockFullParticipantProfile.imageUrl,
      preferences: mockFullParticipantProfile.preferences,
      createdAt: mockFullParticipantProfile.createdAt,
    };

    const result = (service as any).mapToReturnParticipantProfileDto(input);

    // console.log('[UT-4-019-01] Input :', input);
    // console.log('[UT-4-019-01] Expected :', expected);
    // console.log('[UT-4-019-01] Actual :', result);

    expect(result).toEqual(expected);
  });

  it('UT-4-019-02: should apply defaults when optional fields are null', () => {
    const input = mockMinimalParticipantProfile;
    const expected = {
      id: mockMinimalParticipantProfile.id,
      firstName: 'Napat',
      lastName: '',
      nickname: '',
      studentId: '',
      major: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      imageUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
      preferences: DEFAULT_PREFERENCES,
      createdAt: mockMinimalParticipantProfile.createdAt,
    };

    const result = (service as any).mapToReturnParticipantProfileDto(input);

    // console.log('[UT-4-019-02] Input :', input);
    // console.log('[UT-4-019-02] Expected :', expected);
    // console.log('[UT-4-019-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.lastName).toBe('');
    expect(result.imageUrl).toBe(DEFAULT_PARTICIPANT_IMAGE_URL);
    expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('UserCrudService - mapToReturnOrganizerProfileDto', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-4-020-01: should return fully mapped dto when all fields are present', () => {
    const input = mockFullOrganizerProfile;
    const expected = {
      id: MOCK_ORGANIZER_PROFILE_ID_1,
      name: 'CAMT Student Club',
      bio: 'We organize events for CAMT students.',
      contactEmail: 'club@cmu.ac.th',
      contactPhone: '0898765432',
      contactLineId: 'camt_club',
      imageUrl: mockFullOrganizerProfile.imageUrl,
      externalUrl: 'https://camt.cmu.ac.th',
      createdAt: mockFullOrganizerProfile.createdAt,
    };

    const result = (service as any).mapToReturnOrganizerProfileDto(input);

    // console.log('[UT-4-020-01] Input :', input);
    // console.log('[UT-4-020-01] Expected :', expected);
    // console.log('[UT-4-020-01] Actual :', result);

    expect(result).toEqual(expected);
  });

  it('UT-4-020-02: should apply defaults when optional fields are null', () => {
    const input = mockMinimalOrganizerProfile;
    const expected = {
      id: mockMinimalOrganizerProfile.id,
      name: 'SE Department',
      bio: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      imageUrl: DEFAULT_ORGANIZER_IMAGE_URL,
      externalUrl: '',
      createdAt: mockMinimalOrganizerProfile.createdAt,
    };

    const result = (service as any).mapToReturnOrganizerProfileDto(input);

    // console.log('[UT-4-020-02] Input :', input);
    // console.log('[UT-4-020-02] Expected :', expected);
    // console.log('[UT-4-020-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.bio).toBe('');
    expect(result.imageUrl).toBe(DEFAULT_ORGANIZER_IMAGE_URL);
  });
});
