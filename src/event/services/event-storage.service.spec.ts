import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { BannerUploadException } from '../exceptions/banner-upload.exception';
import { InvalidImageException } from '../exceptions/invalid-image.exception';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';


jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockStorageFrom = {
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

const mockValidationService = {
  validateBannerFile: jest.fn(),
};

// got error without beforeAll because of hoisting issue.
beforeAll(() => {
  (createClient as jest.Mock).mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue(mockStorageFrom),
    },
  });
});

const fixturesPath = path.join(__dirname, '../../../test/fixtures/images');
const MOCK_SUPABASE_BASE_URL = 'https://mockproject.supabase.co/storage/v1/object/public/banners';

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
  fieldname: 'file',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
});

// Mock data files
const small_jpg_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
  'image/jpeg',
  'small_jpeg.jpg',
);

const small_png_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_png.png')),
  'image/png',
  'small_png.png',
);

const small_webp_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_webp.webp')),
  'image/webp',
  'small_webp.webp',
);

const invalid_format_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'christmas_party.gif')),
  'image/gif',
  'christmas_party.gif',
);

const large_image_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
  'image/jpeg',
  'large_image.jpeg',
  5 * 1024 * 1024 + 1
);


// test
describe('EventStorageService - uploadBannerToStorage', () => {
  let service: EventStorageService;
  
  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventStorageService,
        { provide: EventValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
    jest.clearAllMocks();
  });


  it('UT-M015-01: should upload JPEG file successfully and return public URL', async () => {
    const mockUuid = uuidv4();
    const expectedUrl = `${MOCK_SUPABASE_BASE_URL}/${mockUuid}.jpg`;
    // supabase return as no-error if success
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({ data: { publicUrl: expectedUrl } });

    const result = await service.uploadBannerToStorage(small_jpg_file);
    // console.log('Returned URL:', result);
    expect(result).toBe(expectedUrl);
    
    // sample mock.calls = [['uuid.jpg', buffer, { contentType: 'image/jpeg' }]]
    const uploadedFileName = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/\.jpg$/);

    expect(mockValidationService.validateBannerFile).toHaveBeenCalledWith(small_jpg_file);
    expect(mockValidationService.validateBannerFile).toHaveBeenCalledTimes(1);
  });

  it('UT-M015-02: should upload PNG file successfully and return public URL', async () => {
    const mockUuid = uuidv4();
    const expectedUrl = `${MOCK_SUPABASE_BASE_URL}/${mockUuid}.png`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({ data: { publicUrl: expectedUrl } });

    const result = await service.uploadBannerToStorage(small_png_file);
    expect(result).toBe(expectedUrl);

    const uploadedFileName = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/\.png$/);

    expect(mockValidationService.validateBannerFile).toHaveBeenCalledWith(small_png_file);
    expect(mockValidationService.validateBannerFile).toHaveBeenCalledTimes(1);
  });

  it('UT-M015-03: should upload WEBP file successfully and return public URL', async () => {
    const mockUuid = uuidv4();
    const expectedUrl = `${MOCK_SUPABASE_BASE_URL}/${mockUuid}.webp`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({ data: { publicUrl: expectedUrl } });

    const result = await service.uploadBannerToStorage(small_webp_file);
    expect(result).toBe(expectedUrl);

    const uploadedFileName = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/\.webp$/);

    expect(mockValidationService.validateBannerFile).toHaveBeenCalledWith(small_webp_file);
    expect(mockValidationService.validateBannerFile).toHaveBeenCalledTimes(1);
  });

  it('UT-M015-04: should throw InvalidImageException for unsupported file format', async () => {
    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('Unsupported image format');
    });
    await expect(
      service.uploadBannerToStorage(invalid_format_file)
    ).rejects.toThrow(InvalidImageException);

    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('Unsupported image format');
    });
    await expect(
      service.uploadBannerToStorage(invalid_format_file)
    ).rejects.toThrow('Unsupported image format');

    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it('UT-M015-05: should throw InvalidImageException for file exceeding 5MB', async () => {
    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('File size must not exceed 5MB.');
    });
    await expect(
      service.uploadBannerToStorage(large_image_file)
    ).rejects.toThrow(InvalidImageException);

    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('File size must not exceed 5MB.');
    });
    await expect(
      service.uploadBannerToStorage(large_image_file)
    ).rejects.toThrow('File size must not exceed 5MB.');

    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it('UT-M015-06: should throw BannerUploadException when Supabase upload fails', async () => {
    // mock as validation passes will be same as jest.fn() does nothing by default
    // Supabase returns error object as { error: {...} } without throwing
    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Storage bucket not found' },
    });
    await expect(
      service.uploadBannerToStorage(small_jpg_file)
    ).rejects.toThrow(BannerUploadException);


    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Storage bucket not found' },
    });
    await expect(
      service.uploadBannerToStorage(small_jpg_file)
    ).rejects.toThrow('Failed to upload banner image. Please try again.');

    expect(mockValidationService.validateBannerFile).toHaveBeenCalledWith(small_jpg_file);
    expect(mockStorageFrom.getPublicUrl).not.toHaveBeenCalled();
  });
});

describe('EventStorageService - resolveBannerUrl', () => {
  let service: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventStorageService,
        { provide: EventValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
    jest.clearAllMocks();
  });

  it('UT-M016-01: should return provided URL when valid URL is given', () => {
    const mockUuid = uuidv4();
    const validUrl = `${MOCK_SUPABASE_BASE_URL}/${mockUuid}.jpg`;
    expect(service.resolveBannerUrl(validUrl)).toBe(validUrl);
  });

  it('UT-M016-02: should return DEFAULT_BANNER_URL when input is undefined', () => {
    expect(service.resolveBannerUrl(undefined)).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M016-03: should return DEFAULT_BANNER_URL when input is empty string', () => {
    expect(service.resolveBannerUrl('')).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M016-04: should return DEFAULT_BANNER_URL when input is whitespace only', () => {
    expect(service.resolveBannerUrl('   ')).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M016-05: should return DEFAULT_BANNER_URL when input is null', () => {
    expect(service.resolveBannerUrl(null as any)).toBe(DEFAULT_BANNER_URL);
  });
});