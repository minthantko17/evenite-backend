import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { BannerUploadException } from '../exceptions/banner-upload.exception';
import { InvalidImageException } from '../exceptions/invalid-image.exception';


jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockStorageFrom = {
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

// got error without before all because of hoisting issue.
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

let service: EventStorageService;


// Mock data files
const small_jpeg_file: Express.Multer.File = {
  buffer: Buffer.from('fake-jpeg-bytes'),
  mimetype: 'image/jpeg',
  originalname: 'small_image.jpeg',
  size: 1024,
  fieldname: 'banner',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

const small_png_file: Express.Multer.File = {
  buffer: Buffer.from('fake-png-bytes'),
  mimetype: 'image/png',
  originalname: 'small_image.png',
  size: 1024,
  fieldname: 'banner',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

const small_webp_file: Express.Multer.File = {
  buffer: Buffer.from('fake-webp-bytes'),
  mimetype: 'image/webp',
  originalname: 'small_image.webp',
  size: 1024,
  fieldname: 'banner',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

const gif_file: Express.Multer.File = {
  buffer: Buffer.from('fake-gif-bytes'),
  mimetype: 'image/gif',
  originalname: 'image.gif',
  size: 1024,
  fieldname: 'banner',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

const large_jpeg_file: Express.Multer.File = {
  buffer: Buffer.from('fake-large-bytes'),
  mimetype: 'image/jpeg',
  originalname: 'large_image.jpeg',
  size: 6 * 1024 * 1024, // larger than 5MB case
  fieldname: 'banner',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};


// test
describe('EventStorageService - uploadBannerToStorage', () => {
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


  it('UT-M024-01: should upload JPEG file successfully and return public URL', async () => {
    const expectedUrl = 'https://supabase.co/storage/v1/object/public/banners/uuid.jpg';
    // supabase return as no error if success
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({ data: { publicUrl: expectedUrl } });

    const result = await service.uploadBannerToStorage(small_jpeg_file);
    // console.log('Returned URL:', result);
    expect(result).toBe(expectedUrl);
    
    // sample mock.calls = [['uuid.jpg', buffer, { contentType: 'image/jpeg' }]]
    const uploadedFileName = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/\.jpg$/);

    expect(mockValidationService.validateBannerFile).toHaveBeenCalledWith(small_jpeg_file);
    expect(mockValidationService.validateBannerFile).toHaveBeenCalledTimes(1);
  });

  it('UT-M024-02: should upload PNG file successfully and return public URL', async () => {
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

  it('UT-M024-03: should upload WEBP file successfully and return public URL', async () => {
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

  it('UT-M024-04: should throw InvalidImageException for unsupported file format', async () => {
    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('Unsupported image format');
    });
    await expect(
      service.uploadBannerToStorage(gif_file)
    ).rejects.toThrow(InvalidImageException);

    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('Unsupported image format');
    });
    await expect(
      service.uploadBannerToStorage(gif_file)
    ).rejects.toThrow('Unsupported image format');

    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it('UT-M024-05: should throw InvalidImageException for file exceeding 5MB', async () => {
    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('File size must not exceed 5MB.');
    });
    await expect(
      service.uploadBannerToStorage(large_jpeg_file)
    ).rejects.toThrow(InvalidImageException);

    mockValidationService.validateBannerFile.mockImplementationOnce(() => {
      throw new InvalidImageException('File size must not exceed 5MB.');
    });
    await expect(
      service.uploadBannerToStorage(large_jpeg_file)
    ).rejects.toThrow('File size must not exceed 5MB.');

    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it('UT-M024-06: should throw BannerUploadException when Supabase upload fails', async () => {
    // validation passes — jest.fn() does nothing by default
    // Supabase returns error object as { error: {...} } without throwing
    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Storage bucket not found' },
    });
    await expect(
      service.uploadBannerToStorage(small_jpeg_file)
    ).rejects.toThrow(BannerUploadException);


    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Storage bucket not found' },
    });
    await expect(
      service.uploadBannerToStorage(small_jpeg_file)
    ).rejects.toThrow('Failed to upload banner image. Please try again.');

    expect(mockValidationService.validateBannerFile).toHaveBeenCalledWith(small_jpeg_file);
    expect(mockStorageFrom.getPublicUrl).not.toHaveBeenCalled();
  });
});