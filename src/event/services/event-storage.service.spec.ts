import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { BannerUploadException } from '../exceptions/banner-upload.exception';
import { InvalidImageException } from '../exceptions/invalid-image.exception';
import * as fs from 'fs';
import * as path from 'path';


jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockStorageFrom = {
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

// got error without beforeAll because of hoisting issue.
beforeAll(() => {
  (createClient as jest.Mock).mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue(mockStorageFrom),
    },
  });
});

const mockValidationService = {
  validateBannerFile: jest.fn(),
};

const fixturesPath = path.join(__dirname, '../../../test/fixtures/images');

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

const invalid_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'christmas-party.gif')),
  'image/gif',
  'christmas-party.gif',
);

// real buffer but override size to simulate >5MB — no need to store actual 6MB file
const large_jpg_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
  'image/jpeg',
  'large_image.jpeg'
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
    const expectedUrl = 'https://supabase.co/storage/v1/object/public/banners/uuid.jpg';
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
    const expectedUrl = 'https://supabase.co/storage/v1/object/public/banners/uuid.png';
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
    const expectedUrl = 'https://supabase.co/storage/v1/object/public/banners/uuid.webp';
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
      service.uploadBannerToStorage(invalid_file)
    ).rejects.toThrow(InvalidImageException);

    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('Unsupported image format');
    });
    await expect(
      service.uploadBannerToStorage(invalid_file)
    ).rejects.toThrow('Unsupported image format');

    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it('UT-M015-05: should throw InvalidImageException for file exceeding 5MB', async () => {
    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('File size must not exceed 5MB.');
    });
    await expect(
      service.uploadBannerToStorage(large_jpg_file)
    ).rejects.toThrow(InvalidImageException);

    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('File size must not exceed 5MB.');
    });
    await expect(
      service.uploadBannerToStorage(large_jpg_file)
    ).rejects.toThrow('File size must not exceed 5MB.');

    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it('UT-M015-06: should throw BannerUploadException when Supabase upload fails', async () => {
    // validation passes — jest.fn() does nothing by default
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