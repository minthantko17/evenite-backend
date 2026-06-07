import { Test, TestingModule } from '@nestjs/testing';
import { EventStatus, Role } from '@prisma/client';
import { UserCrudService } from './user-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';
import { CreateParticipantProfileDto } from '../dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from '../dto/update-participant-profile.dto';

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
  event: {
    findMany: jest.fn(),
  },
  eventRegistration: {
    findMany: jest.fn(),
  },
};

describe('UserCrudService - getUserById', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M062-01: should return UserWithProfiles when user exists with both profiles', async () => {
    const mockUser = {
      id: 'u1000000-0000-0000-0000-000000000001',
      email: 'minthant@cmu.ac.th',
      currentRole: Role.PARTICIPANT,
      isVerified: true,
      universityId: 'univ0001-0000-0000-0000-000000000001',
      participantProfile: {
        id: 'p1000000-0000-0000-0000-000000000001',
        firstName: 'Min',
      },
      organizerProfile: {
        id: 'o1000000-0000-0000-0000-000000000001',
        name: 'CAMT Club',
      },
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getUserById(
      'u1000000-0000-0000-0000-000000000001',
    );

    expect(result).toEqual(mockUser);
    expect(result.participantProfile).not.toBeNull();
    expect(result.organizerProfile).not.toBeNull();
  });

  it('UT-M062-02: should return UserWithProfiles when user exists with only participant profile', async () => {
    const mockUser = {
      id: 'u2000000-0000-0000-0000-000000000002',
      email: 'rory@cmu.ac.th',
      currentRole: Role.PARTICIPANT,
      isVerified: true,
      universityId: 'univ0001-0000-0000-0000-000000000001',
      participantProfile: {
        id: 'p2000000-0000-0000-0000-000000000002',
        firstName: 'Rory',
      },
      organizerProfile: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getUserById(
      'u2000000-0000-0000-0000-000000000002',
    );

    expect(result).toEqual(mockUser);
    expect(result.participantProfile).not.toBeNull();
    expect(result.organizerProfile).toBeNull();
  });

  it('UT-M062-03: should return UserWithProfiles when user exists with only organizer profile', async () => {
    const mockUser = {
      id: 'u3000000-0000-0000-0000-000000000003',
      email: 'chaiwat@cmu.ac.th',
      currentRole: Role.ORGANIZER,
      isVerified: true,
      universityId: 'univ0001-0000-0000-0000-000000000001',
      participantProfile: null,
      organizerProfile: {
        id: 'o2000000-0000-0000-0000-000000000002',
        name: 'SE Department',
      },
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getUserById(
      'u3000000-0000-0000-0000-000000000003',
    );

    expect(result).toEqual(mockUser);
    expect(result.participantProfile).toBeNull();
    expect(result.organizerProfile).not.toBeNull();
  });

  it('UT-M062-04: should return UserWithProfiles when user exists with no profiles', async () => {
    const mockUser = {
      id: 'u4000000-0000-0000-0000-000000000004',
      email: 'newuser@cmu.ac.th',
      currentRole: null,
      isVerified: true,
      universityId: 'univ0001-0000-0000-0000-000000000001',
      participantProfile: null,
      organizerProfile: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getUserById(
      'u4000000-0000-0000-0000-000000000004',
    );

    expect(result).toEqual(mockUser);
    expect(result.participantProfile).toBeNull();
    expect(result.organizerProfile).toBeNull();
  });

  it('UT-M062-05: should throw UserNotFoundException when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const result = service.getUserById('u9999999-9999-9999-9999-999999999999');

    await expect(result).rejects.toThrow(UserNotFoundException);
    await expect(result).rejects.toThrow('User not found.');
  });
});

describe('UserCrudService - getParticipantProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M063-01: should return ParticipantProfile when profile exists with all fields', async () => {
    const mockProfile = {
      id: 'p1000000-0000-0000-0000-000000000001',
      userId: 'u1000000-0000-0000-0000-000000000001',
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'susu@cmu.ac.th',
      contactPhone: '0812345678',
      contactLineId: 'susu_line',
      imageUrl: 'https://storage.example.com/participant/abc.jpg',
      preferences: {
        personal: ['MUSIC'],
        event: ['SEMINAR'],
        language: ['en'],
      },
      createdAt: new Date('2026-01-01'),
    };
    mockPrisma.participantProfile.findUnique.mockResolvedValue(mockProfile);

    const result = await service.getParticipantProfile(
      'u1000000-0000-0000-0000-000000000001',
    );

    expect(result).toEqual(mockProfile);
  });

  it('UT-M063-02: should return ParticipantProfile when profile exists with only required fields', async () => {
    const mockProfile = {
      id: 'p2000000-0000-0000-0000-000000000002',
      userId: 'u2000000-0000-0000-0000-000000000002',
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
      createdAt: new Date('2026-02-01'),
    };
    mockPrisma.participantProfile.findUnique.mockResolvedValue(mockProfile);

    const result = await service.getParticipantProfile(
      'u2000000-0000-0000-0000-000000000002',
    );

    expect(result).toEqual(mockProfile);
    expect(result.lastName).toBeNull();
    expect(result.preferences).toBeNull();
  });

  it('UT-M063-03: should throw ProfileNotFoundException with message when participant profile not found', async () => {
    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce(null);

    const result = service.getParticipantProfile(
      'u9999999-9999-9999-9999-999999999999',
    );

    await expect(result).rejects.toThrow(ProfileNotFoundException);
    await expect(result).rejects.toThrow('Participant profile not found.');
  });
});

describe('UserCrudService - getOrganizerProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M064-01: should return OrganizerProfile when profile exists with all fields', async () => {
    const mockProfile = {
      id: 'o1000000-0000-0000-0000-000000000001',
      userId: 'u3000000-0000-0000-0000-000000000003',
      name: 'CAMT Student Club',
      bio: 'We organize events for CAMT students.',
      contactEmail: 'club@cmu.ac.th',
      contactPhone: '0898765432',
      contactLineId: 'camt_club',
      imageUrl: 'https://storage.example.com/organizer/xyz.png',
      externalUrl: 'https://camt.cmu.ac.th',
      createdAt: new Date('2026-01-15'),
    };
    mockPrisma.organizerProfile.findUnique.mockResolvedValue(mockProfile);

    const result = await service.getOrganizerProfile(
      'u3000000-0000-0000-0000-000000000003',
    );

    expect(result).toEqual(mockProfile);
  });

  it('UT-M064-02: should return OrganizerProfile when profile exists with only required fields', async () => {
    const mockProfile = {
      id: 'o2000000-0000-0000-0000-000000000002',
      userId: 'u4000000-0000-0000-0000-000000000004',
      name: 'SE Department',
      bio: null,
      contactEmail: null,
      contactPhone: null,
      contactLineId: null,
      imageUrl: null,
      externalUrl: null,
      createdAt: new Date('2026-02-15'),
    };
    mockPrisma.organizerProfile.findUnique.mockResolvedValue(mockProfile);

    const result = await service.getOrganizerProfile(
      'u4000000-0000-0000-0000-000000000004',
    );

    expect(result).toEqual(mockProfile);
    expect(result.bio).toBeNull();
    expect(result.externalUrl).toBeNull();
  });

  it('UT-M064-03: should throw ProfileNotFoundException with message when organizer profile not found', async () => {
    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce(null);

    const result = service.getOrganizerProfile(
      'u9999999-9999-9999-9999-999999999998',
    );

    await expect(result).rejects.toThrow(ProfileNotFoundException);
    await expect(result).rejects.toThrow('Organizer profile not found.');
  });
});

describe('UserCrudService - createParticipantProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M065-01: should create and return participant profile with full dto', async () => {
    const userId = 'u5000000-0000-0000-0000-000000000005';
    const dto = {
      firstName: 'Arisa',
      lastName: 'Tanaka',
      nickname: 'Ari',
      studentId: '662115520',
      major: 'Computer Science',
      contactEmail: 'arisa@cmu.ac.th',
      contactPhone: '0823456789',
      contactLineId: 'arisa_line',
      imageUrl: 'https://storage.example.com/participant/arisa.jpg',
      preferences: {
        personal: ['MUSIC'],
        event: ['WORKSHOP'],
        language: ['en', 'th'],
      },
    };
    const mockCreated = {
      id: 'p3000000-0000-0000-0000-000000000003',
      userId,
      ...dto,
      createdAt: new Date('2026-03-01'),
    };
    mockPrisma.participantProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createParticipantProfile(userId, dto as CreateParticipantProfileDto);

    expect(result).toEqual(mockCreated);
    expect(mockPrisma.participantProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId, firstName: 'Arisa' }),
      }),
    );
  });

  it('UT-M065-02: should create participant profile with minimal dto (firstName only)', async () => {
    const userId = 'u6000000-0000-0000-0000-000000000006';
    const dto = { firstName: 'Somsak' };
    const mockCreated = {
      id: 'p4000000-0000-0000-0000-000000000004',
      userId,
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
      createdAt: new Date('2026-03-02'),
    };
    mockPrisma.participantProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createParticipantProfile(userId, dto);

    expect(result).toEqual(mockCreated);
    expect(result.lastName).toBeNull();
    expect(result.preferences).toBeNull();
  });

  it('UT-M065-03: should propagate error when prisma throws', async () => {
    mockPrisma.participantProfile.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.createParticipantProfile('u7000000-0000-0000-0000-000000000007', {
        firstName: 'Thanida',
      }),
    ).rejects.toThrow('DB connection failed');
  });
});

describe('UserCrudService - updateParticipantProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M066-01: should update and return participant profile with full dto', async () => {
    const userId = 'u1000000-0000-0000-0000-000000000001';
    const dto = {
      firstName: 'Min Thant',
      lastName: 'Ko',
      nickname: 'Min',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'min@cmu.ac.th',
      contactPhone: '0811111111',
      contactLineId: 'min_line',
    };
    const mockUpdated = {
      id: 'p1000000-0000-0000-0000-000000000001',
      userId,
      ...dto,
      imageUrl: null,
      preferences: null,
      createdAt: new Date('2026-01-01'),
    };
    mockPrisma.participantProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateParticipantProfile(userId, dto as UpdateParticipantProfileDto);

    expect(result).toEqual(mockUpdated);
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: expect.objectContaining({ firstName: 'Min Thant' }),
      }),
    );
  });

  it('UT-M066-02: should update participant profile with partial dto (firstName only)', async () => {
    const userId = 'u2000000-0000-0000-0000-000000000002';
    const dto = { firstName: 'Updated Name' };
    const mockUpdated = {
      id: 'p2000000-0000-0000-0000-000000000002',
      userId,
      firstName: 'Updated Name',
      lastName: 'Existing',
      nickname: 'existing nickname',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'existingmail@cmu.ac.th',
      contactPhone: '0811111111',
      contactLineId: 'existing_line',
      imageUrl: null,
      preferences: null,
      createdAt: new Date('2026-01-02'),
    };
    mockPrisma.participantProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateParticipantProfile(userId, dto as UpdateParticipantProfileDto);

    expect(result).toEqual(mockUpdated);
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { firstName: 'Updated Name' },
    }
    );
  });

  it('UT-M066-03: should update participant profile with empty string fields', async () => {
    const userId = 'u3000000-0000-0000-0000-000000000003';
    const dto = { lastName: '', nickname: '' };
    const mockUpdated = {
      id: 'p5000000-0000-0000-0000-000000000005',
      userId,
      firstName: 'Wanchai',
      lastName: '',
      nickname: '',
      studentId: '662115514',
      major: 'Software Engineering',
      contactEmail: 'existingmail@cmu.ac.th',
      contactPhone: '0811111111',
      contactLineId: 'existing_line',
      imageUrl: null,
      preferences: null,
      createdAt: new Date('2026-01-03'),
    };
    mockPrisma.participantProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateParticipantProfile(userId, dto);

    expect(result).toEqual(mockUpdated);
    expect(result.lastName).toBe('');
    expect(result.nickname).toBe('');
    expect(mockPrisma.participantProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { lastName: '', nickname: '' },
    });
  });
});

describe('UserCrudService - createOrganizerProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M067-01: should create and return organizer profile with full dto', async () => {
    const userId = 'u5000000-0000-0000-0000-000000000005';
    const dto = {
      name: 'Engineering Faculty Club',
      bio: 'Organizing tech events for engineers.',
      contactEmail: 'eng@cmu.ac.th',
      contactPhone: '0844444444',
      contactLineId: 'eng_club',
      imageUrl: 'https://storage.example.com/organizer/eng.jpg',
      externalUrl: 'https://eng.cmu.ac.th',
    };
    const mockCreated = {
      id: 'o3000000-0000-0000-0000-000000000003',
      userId,
      ...dto,
      createdAt: new Date('2026-03-05'),
    };
    mockPrisma.organizerProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createOrganizerProfile(userId, dto);

    expect(result).toEqual(mockCreated);
    expect(mockPrisma.organizerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          name: 'Engineering Faculty Club',
        }),
      }),
    );
  });

  it('UT-M067-02: should create organizer profile with minimal dto (name only)', async () => {
    const userId = 'u6000000-0000-0000-0000-000000000006';
    const dto = { name: 'Science Society' };
    const mockCreated = {
      id: 'o4000000-0000-0000-0000-000000000004',
      userId,
      name: 'Science Society',
      bio: null,
      contactEmail: null,
      contactPhone: null,
      contactLineId: null,
      imageUrl: null,
      externalUrl: null,
      createdAt: new Date('2026-03-06'),
    };
    mockPrisma.organizerProfile.create.mockResolvedValue(mockCreated);

    const result = await service.createOrganizerProfile(userId, dto);

    expect(result).toEqual(mockCreated);
    expect(result.bio).toBeNull();
    expect(result.externalUrl).toBeNull();
  });

  it('UT-M067-03: should propagate error when prisma throws', async () => {
    mockPrisma.organizerProfile.create.mockRejectedValueOnce(
      new Error('DB connection failed.'),
    );

    await expect(
      service.createOrganizerProfile('u9000000-0000-0000-0000-000000000009', {
        name: 'Duplicate Club',
      }),
    ).rejects.toThrow('DB connection failed.');
  });
});

describe('UserCrudService - updateOrganizerProfile', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M068-01: should update and return organizer profile with full dto', async () => {
    const userId = 'u3000000-0000-0000-0000-000000000003';
    const dto = {
      name: 'Updated CAMT Club',
      bio: 'Updated bio for CAMT Club.',
      contactEmail: 'updated@cmu.ac.th',
      contactPhone: '0855555555',
      contactLineId: 'updated_line',
      externalUrl: 'https://updated.cmu.ac.th',
    };
    const mockUpdated = {
      id: 'o1000000-0000-0000-0000-000000000001',
      userId,
      ...dto,
      imageUrl: null,
      createdAt: new Date('2026-01-15'),
    };
    mockPrisma.organizerProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateOrganizerProfile(userId, dto);

    expect(result).toEqual(mockUpdated);
    expect(mockPrisma.organizerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: expect.objectContaining({ name: 'Updated CAMT Club' }),
      }),
    );
  });

  it('UT-M068-02: should update organizer profile with partial dto (name only)', async () => {
    const userId = 'u4000000-0000-0000-0000-000000000004';
    const dto = { name: 'Renamed Department' };
    const mockUpdated = {
      id: 'o2000000-0000-0000-0000-000000000002',
      userId,
      name: 'Renamed Department',
      bio: 'Existing bio',
      contactEmail: 'existing@cmu.ac.th',
      contactPhone: '0866666666',
      contactLineId: 'existing_line',
      imageUrl: null,
      externalUrl: null,
      createdAt: new Date('2026-02-15'),
    };
    mockPrisma.organizerProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateOrganizerProfile(userId, dto);

    expect(result.name).toBe('Renamed Department');
    expect(mockPrisma.organizerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });

  it('UT-M068-03: should update organizer profile with empty string fields', async () => {
    const userId = 'u5000000-0000-0000-0000-000000000005';
    const dto = { bio: '', contactEmail: '' };
    const mockUpdated = {
      id: 'o3000000-0000-0000-0000-000000000003',
      userId,
      name: 'Art Society',
      bio: '',
      contactEmail: '',
      contactPhone: '0866666666',
      contactLineId: 'existing_line',
      imageUrl: null,
      externalUrl: null,
      createdAt: new Date('2026-03-05'),
    };
    mockPrisma.organizerProfile.update.mockResolvedValue(mockUpdated);

    const result = await service.updateOrganizerProfile(userId, dto);

    expect(result.bio).toBe('');
    expect(result.contactEmail).toBe('');
  });
});

describe('UserCrudService - updateUserRole', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M069-01: should update user role to PARTICIPANT', async () => {
    const userId = 'u1000000-0000-0000-0000-000000000001';
    mockPrisma.user.update.mockResolvedValue({
      id: userId,
      currentRole: Role.PARTICIPANT,
    });

    await service.updateUserRole(userId, Role.PARTICIPANT);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { currentRole: Role.PARTICIPANT },
    });
  });

  it('UT-M069-02: should update user role to ORGANIZER', async () => {
    const userId = 'u2000000-0000-0000-0000-000000000002';
    mockPrisma.user.update.mockResolvedValue({
      id: userId,
      currentRole: Role.ORGANIZER,
    });

    await service.updateUserRole(userId, Role.ORGANIZER);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { currentRole: Role.ORGANIZER },
    });
  });
});

describe('UserCrudService - getCreatedEvents', () => {
  let service: UserCrudService;

  const organizerProfileId = 'o1000000-0000-0000-0000-000000000001';
  const universityId = 'univ0001-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M070-01: should return events filtered by DRAFT status', async () => {
    const mockEvents = [
      {
        id: 'ev100000-0000-0000-0000-000000000001',
        status: EventStatus.DRAFT,
        organizerId: organizerProfileId,
        universityId,
        title: { en: 'Draft Event', th: 'กิจกรรมฉบับร่าง' },
        createdAt: new Date('2026-04-01'),
      },
    ];
    mockPrisma.event.findMany.mockResolvedValue(mockEvents);

    const result = await service.getCreatedEvents(
      organizerProfileId,
      universityId,
      EventStatus.DRAFT,
    );

    expect(result).toEqual(mockEvents);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizerId: organizerProfileId,
          universityId,
          status: EventStatus.DRAFT,
        }),
      }),
    );
  });

  it('UT-M070-02: should return all events when no status provided', async () => {
    const mockEvents = [
      {
        id: 'ev200000-0000-0000-0000-000000000002',
        status: EventStatus.PUBLISHED,
        organizerId: organizerProfileId,
        universityId,
        createdAt: new Date('2026-04-02'),
      },
      {
        id: 'ev300000-0000-0000-0000-000000000003',
        status: EventStatus.DRAFT,
        organizerId: organizerProfileId,
        universityId,
        createdAt: new Date('2026-04-01'),
      },
    ];
    mockPrisma.event.findMany.mockResolvedValue(mockEvents);

    const result = await service.getCreatedEvents(
      organizerProfileId,
      universityId,
    );

    expect(result).toEqual(mockEvents);
    const calledWith = mockPrisma.event.findMany.mock.calls[0][0];
    expect(calledWith.where.status).toBeUndefined();
  });

  it('UT-M070-03: should return empty array when no events exist', async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await service.getCreatedEvents(
      'o9999999-9999-9999-9999-999999999999',
      universityId,
    );

    expect(result).toEqual([]);
  });

  it('UT-M070-04: should return events filtered by PUBLISHED status', async () => {
    const mockEvents = [
      {
        id: 'ev400000-0000-0000-0000-000000000004',
        status: EventStatus.PUBLISHED,
        organizerId: organizerProfileId,
        universityId,
        createdAt: new Date('2026-05-01'),
      },
    ];
    mockPrisma.event.findMany.mockResolvedValue(mockEvents);

    const result = await service.getCreatedEvents(
      organizerProfileId,
      universityId,
      EventStatus.PUBLISHED,
    );

    expect(result).toEqual(mockEvents);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EventStatus.PUBLISHED,
        }),
      }),
    );
  });

  it('UT-M070-05: should return empty array when filtering by CONCLUDED with no matches', async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await service.getCreatedEvents(
      organizerProfileId,
      universityId,
      EventStatus.CONCLUDED,
    );

    expect(result).toEqual([]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EventStatus.CONCLUDED,
        }),
      }),
    );
  });
});

describe('UserCrudService - getRegisteredEvents', () => {
  let service: UserCrudService;

  const participantProfileId = 'p1000000-0000-0000-0000-000000000001';
  const universityId = 'univ0001-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserCrudService>(UserCrudService);
    jest.clearAllMocks();
  });

  it('UT-M071-01: should return registrations filtered by PUBLISHED event status', async () => {
    const mockRegistrations = [
      {
        id: 'reg10000-0000-0000-0000-000000000001',
        participantId: participantProfileId,
        eventId: 'ev100000-0000-0000-0000-000000000001',
        status: 'CONFIRMED',
        createdAt: new Date('2026-05-01'),
        event: {
          id: 'ev100000-0000-0000-0000-000000000001',
          status: EventStatus.PUBLISHED,
          universityId,
          title: { en: 'Published Event', th: 'กิจกรรมที่เผยแพร่' },
        },
      },
    ];
    mockPrisma.eventRegistration.findMany.mockResolvedValue(mockRegistrations);

    const result = await service.getRegisteredEvents(
      participantProfileId,
      universityId,
      EventStatus.PUBLISHED,
    );

    expect(result).toEqual(mockRegistrations);
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participantId: participantProfileId,
          event: expect.objectContaining({
            universityId,
            status: EventStatus.PUBLISHED,
          }),
        }),
      }),
    );
  });

  it('UT-M071-02: should return all registrations when no status provided', async () => {
    const mockRegistrations = [
      {
        id: 'reg20000-0000-0000-0000-000000000002',
        participantId: participantProfileId,
        status: 'CONFIRMED',
        createdAt: new Date('2026-05-02'),
        event: {
          id: 'ev200000-0000-0000-0000-000000000002',
          status: EventStatus.ONGOING,
        },
      },
      {
        id: 'reg30000-0000-0000-0000-000000000003',
        participantId: participantProfileId,
        status: 'CONFIRMED',
        createdAt: new Date('2026-04-01'),
        event: {
          id: 'ev300000-0000-0000-0000-000000000003',
          status: EventStatus.CONCLUDED,
        },
      },
    ];
    mockPrisma.eventRegistration.findMany.mockResolvedValue(mockRegistrations);

    const result = await service.getRegisteredEvents(
      participantProfileId,
      universityId,
    );

    expect(result).toEqual(mockRegistrations);
    const calledWith = mockPrisma.eventRegistration.findMany.mock.calls[0][0];
    expect(calledWith.where.event?.status).toBeUndefined();
  });

  it('UT-M071-03: should return empty array when no registrations exist', async () => {
    mockPrisma.eventRegistration.findMany.mockResolvedValue([]);

    const result = await service.getRegisteredEvents(
      'p9999999-9999-9999-9999-999999999999',
      universityId,
    );

    expect(result).toEqual([]);
  });

  it('UT-M071-04: should return registrations filtered by ONGOING event status', async () => {
    const mockRegistrations = [
      {
        id: 'reg40000-0000-0000-0000-000000000004',
        participantId: participantProfileId,
        status: 'CONFIRMED',
        createdAt: new Date('2026-05-10'),
        event: { status: EventStatus.ONGOING, universityId },
      },
    ];
    mockPrisma.eventRegistration.findMany.mockResolvedValue(mockRegistrations);

    const result = await service.getRegisteredEvents(
      participantProfileId,
      universityId,
      EventStatus.ONGOING,
    );

    expect(result).toEqual(mockRegistrations);
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({ status: EventStatus.ONGOING }),
        }),
      }),
    );
  });

  it('UT-M071-05: should return registrations filtered by CONCLUDED event status', async () => {
    const mockRegistrations = [
      {
        id: 'reg50000-0000-0000-0000-000000000005',
        participantId: participantProfileId,
        status: 'CONFIRMED',
        createdAt: new Date('2026-03-01'),
        event: { status: EventStatus.CONCLUDED, universityId },
      },
      {
        id: 'reg60000-0000-0000-0000-000000000006',
        participantId: participantProfileId,
        status: 'CONFIRMED',
        createdAt: new Date('2026-02-01'),
        event: { status: EventStatus.CONCLUDED, universityId },
      },
    ];
    mockPrisma.eventRegistration.findMany.mockResolvedValue(mockRegistrations);

    const result = await service.getRegisteredEvents(
      participantProfileId,
      universityId,
      EventStatus.CONCLUDED,
    );

    expect(result).toHaveLength(2);
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({ status: EventStatus.CONCLUDED }),
        }),
      }),
    );
  });
});
