import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { UserStorageService } from './user-storage.service';
import { ImageUploadException } from '../exceptions/image-upload.exception';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from '../constants/user-images.constant';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockStorageFrom = {
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

beforeAll(() => {
  (createClient as jest.Mock).mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue(mockStorageFrom),
    },
  });
});

const mockPrisma = {
  participantProfile: { findUnique: jest.fn() },
  organizerProfile: { findUnique: jest.fn() },
};

const fixturesPath = path.join(__dirname, '../../../test/fixtures/images');
const MOCK_SUPABASE_BASE_URL =
  'https://mockproject.supabase.co/storage/v1/object/public/evenite-images';

const createMockFile = (
  buffer: Buffer,
  mimetype: string,
  originalname: string,
  size?: number,
): Express.Multer.File => ({
  buffer,
  mimetype,
  originalname,
  size: size ?? buffer.length,
  fieldname: 'image',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
});

const small_jpg_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
  'image/jpeg',
  'profile_photo.jpg',
);

const small_png_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_png.png')),
  'image/png',
  'avatar.png',
);

const small_webp_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_webp.webp')),
  'image/webp',
  'organizer_logo.webp',
);


// this is just a clone of event test uploadBannerToStorage
// Need to refactor common methods and refactor later...rn..let it be xD
describe('UserStorageService - uploadImageToStorage', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStorageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M072-01: should upload JPEG file to participant folder and return public URL', async () => {
    const mockUuid = uuidv4();
    const expectedUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${mockUuid}.jpg`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: expectedUrl },
    });

    const result = await service.uploadImageToStorage(
      small_jpg_file,
      'participant',
    );

    expect(result).toBe(expectedUrl);
    const uploadedPath = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedPath).toMatch(/^participant\/.+\.jpg$/);
  });

  it('UT-M072-02: should upload PNG file to organizer folder and return public URL', async () => {
    const mockUuid = uuidv4();
    const expectedUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${mockUuid}.png`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: expectedUrl },
    });

    const result = await service.uploadImageToStorage(
      small_png_file,
      'organizer',
    );

    expect(result).toBe(expectedUrl);
    const uploadedPath = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedPath).toMatch(/^organizer\/.+\.png$/);
  });

  it('UT-M072-03: should upload WEBP file to participant folder and return public URL', async () => {
    const mockUuid = uuidv4();
    const expectedUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${mockUuid}.webp`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: expectedUrl },
    });

    const result = await service.uploadImageToStorage(
      small_webp_file,
      'participant',
    );

    expect(result).toBe(expectedUrl);
    const uploadedPath = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedPath).toMatch(/^participant\/.+\.webp$/);
  });

  it('UT-M072-04: should throw ImageUploadException when Supabase upload fails', async () => {
    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Bucket not found' },
    });

    await expect(
      service.uploadImageToStorage(small_jpg_file, 'participant'),
    ).rejects.toThrow(ImageUploadException);

    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Bucket not found' },
    });

    await expect(
      service.uploadImageToStorage(small_jpg_file, 'participant'),
    ).rejects.toThrow('Failed to upload image. Please try again.');

    expect(mockStorageFrom.getPublicUrl).not.toHaveBeenCalled();
  });

  it('UT-M072-05: should throw ImageUploadException when uploading to organizer folder fails', async () => {
    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Permission denied' },
    });

    await expect(
      service.uploadImageToStorage(small_png_file, 'organizer'),
    ).rejects.toThrow(ImageUploadException);
  });
});

describe('UserStorageService - resolveImageUrl', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStorageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M073-01: should return provided URL when valid participant image URL is given', () => {
    const mockUuid = 'mock-participant-uuid-1234';
    const validUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${mockUuid}.jpg`;
    expect(
      service.resolveImageUrl(validUrl, DEFAULT_PARTICIPANT_IMAGE_URL),
    ).toBe(validUrl);
  });

  it('UT-M073-02: should return provided URL when valid organizer image URL is given', () => {
    const mockUuid = 'mock-organizer-uuid-1234';
    const validUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${mockUuid}.png`;
    expect(
      service.resolveImageUrl(validUrl, DEFAULT_ORGANIZER_IMAGE_URL),
    ).toBe(validUrl);
  });

  it('UT-M073-03: should return DEFAULT_PARTICIPANT_IMAGE_URL when input is undefined', () => {
    expect(
      service.resolveImageUrl(undefined, DEFAULT_PARTICIPANT_IMAGE_URL),
    ).toBe(DEFAULT_PARTICIPANT_IMAGE_URL);
  });

  it('UT-M073-04: should return DEFAULT_ORGANIZER_IMAGE_URL when input is undefined', () => {
    expect(
      service.resolveImageUrl(undefined, DEFAULT_ORGANIZER_IMAGE_URL),
    ).toBe(DEFAULT_ORGANIZER_IMAGE_URL);
  });

  it('UT-M073-05: should return DEFAULT_PARTICIPANT_IMAGE_URL when input is empty string', () => {
    expect(
      service.resolveImageUrl('', DEFAULT_PARTICIPANT_IMAGE_URL),
    ).toBe(DEFAULT_PARTICIPANT_IMAGE_URL);
  });

  it('UT-M073-06: should return DEFAULT_ORGANIZER_IMAGE_URL when input is whitespace only', () => {
    expect(
      service.resolveImageUrl('   ', DEFAULT_ORGANIZER_IMAGE_URL),
    ).toBe(DEFAULT_ORGANIZER_IMAGE_URL);
  });
});

describe('UserStorageService - deleteOrphanParticipantImageIfReplaced', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStorageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M074-01: should call remove when old participant image URL differs from new URL', async () => {
    const oldUuid = 'mock-participant-uuid-1234';
    const newUuid = 'mock-participant-uuid-5678';
    const oldUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${oldUuid}.jpg`;
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${newUuid}.png`;

    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce({
      imageUrl: oldUrl,
    });
    mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

    await service.deleteOrphanParticipantImageIfReplaced(
      'u1000000-0000-0000-0000-000000000001',
      newUrl,
    );

    expect(mockStorageFrom.remove).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom.remove).toHaveBeenCalledWith([
      `participant/${oldUuid}.jpg`,
    ]);
  });

  it('UT-M074-02: should not call remove when old URL is same as new URL', async () => {
    const mockUuid = 'mock-participant-uuid-1234';
    const sameUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${mockUuid}.jpg`;

    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce({
      imageUrl: sameUrl,
    });

    await service.deleteOrphanParticipantImageIfReplaced(
      'u2000000-0000-0000-0000-000000000002',
      sameUrl,
    );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M074-03: should not call remove when old URL is DEFAULT_PARTICIPANT_IMAGE_URL', async () => {
    const newUuid = 'mock-participant-uuid-5678';
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${newUuid}.webp`;

    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce({
      imageUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    });

    await service.deleteOrphanParticipantImageIfReplaced(
      'u3000000-0000-0000-0000-000000000003',
      newUrl,
    );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M074-04: should not call remove when old URL is null', async () => {
    const newUuid = 'mock-participant-uuid-5678';
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${newUuid}.jpg`;

    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce({
      imageUrl: null,
    });

    await service.deleteOrphanParticipantImageIfReplaced(
      'u4000000-0000-0000-0000-000000000004',
      newUrl,
    );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M074-05: should throw ProfileNotFoundException when participant profile does not exist', async () => {
    const newUuid = 'mock-participant-uuid-5678';
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${newUuid}.png`;

    mockPrisma.participantProfile.findUnique.mockResolvedValueOnce(null);

    const result = service.deleteOrphanParticipantImageIfReplaced(
        'u5000000-0000-0000-0000-000000000005',
        newUrl,
    );
    await expect(result).rejects.toThrow(ProfileNotFoundException);
    await expect(result).rejects.toThrow('Participant profile not found.');
  });
});

describe('UserStorageService - deleteOrphanOrganizerImageIfReplaced', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStorageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M075-01: should call remove when old organizer image URL differs from new URL', async () => {
    const oldUuid = 'mock-organizer-uuid-1234';
    const newUuid = 'mock-organizer-uuid-5678';
    const oldUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${oldUuid}.png`;
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${newUuid}.jpg`;

    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce({
      imageUrl: oldUrl,
    });
    mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

    await service.deleteOrphanOrganizerImageIfReplaced(
      'u5000000-0000-0000-0000-000000000005',
      newUrl,
    );

    expect(mockStorageFrom.remove).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom.remove).toHaveBeenCalledWith([
      `organizer/${oldUuid}.png`,
    ]);
  });

  it('UT-M075-02: should not call remove when old organizer URL is same as new URL', async () => {
    const mockUuid = 'mock-organizer-uuid-1234';
    const sameUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${mockUuid}.png`;

    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce({
      imageUrl: sameUrl,
    });

    await service.deleteOrphanOrganizerImageIfReplaced(
      'u6000000-0000-0000-0000-000000000006',
      sameUrl,
    );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M075-03: should not call remove when old URL is DEFAULT_ORGANIZER_IMAGE_URL', async () => {
    const newUuid = 'mock-organizer-uuid-5678';
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${newUuid}.webp`;

    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce({
      imageUrl: DEFAULT_ORGANIZER_IMAGE_URL,
    });

    await service.deleteOrphanOrganizerImageIfReplaced(
      'u7000000-0000-0000-0000-000000000007',
      newUrl,
    );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M075-04: should not call remove when old organizer URL is null', async () => {
    const newUuid = 'mock-organizer-uuid-5678';
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${newUuid}.png`;

    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce({
      imageUrl: null,
    });

    await service.deleteOrphanOrganizerImageIfReplaced(
      'u8000000-0000-0000-0000-000000000008',
      newUrl,
    );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M075-05: should throw ProfileNotFoundException when organizer profile does not exist', async () => {
    const newUuid = 'mock-organizer-uuid-5678';
    const newUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${newUuid}.jpg`;

    mockPrisma.organizerProfile.findUnique.mockResolvedValueOnce(null);

    const result = service.deleteOrphanOrganizerImageIfReplaced(
        'u9000000-0000-0000-0000-000000000009',
        newUrl,
    );
    await expect(result).rejects.toThrow(ProfileNotFoundException);
    await expect(result).rejects.toThrow('Organizer profile not found.');
  });
});