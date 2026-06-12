import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { UserStorageService } from './user-storage.service';
import { ImageUploadException } from '../exceptions/image-upload.exception';
import {
  DEFAULT_PARTICIPANT_IMAGE_URL,
  DEFAULT_ORGANIZER_IMAGE_URL,
} from '../constants/user-images.constant';
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

beforeAll(() => {
  (createClient as jest.Mock).mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue(mockStorageFrom),
    },
  });
});

const MOCK_SUPABASE_BASE_URL =
  'https://mockproject.supabase.co/storage/v1/object/public/evenite-images';

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

const buildModule = async (): Promise<TestingModule> =>
  Test.createTestingModule({
    providers: [UserStorageService],
  }).compile();


describe('UserStorageService - uploadImageToStorage', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M062-01: should return public URL with .jpg extension when JPEG file uploaded to participant folder', async () => {
    const input = { file: small_jpg_file, type: 'participant' as const };
    const mockPublicUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${uuidv4()}.jpg`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: mockPublicUrl },
    });

    const result = await service.uploadImageToStorage(input.file, input.type);

    // console.log('[UT-M062-01] Input :', { mimetype: input.file.mimetype, type: input.type });
    // console.log('[UT-M062-01] Expected :', mockPublicUrl);
    // console.log('[UT-M062-01] Actual :', result);

    expect(result).toBe(mockPublicUrl);
    const uploadedPath: string = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedPath).toMatch(/^participant\/.+\.jpg$/);
    expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom.getPublicUrl).toHaveBeenCalledTimes(1);
  });

  it('UT-M062-02: should return public URL with .png extension when PNG file uploaded to organizer folder', async () => {
    const input = { file: small_png_file, type: 'organizer' as const };
    const mockPublicUrl = `${MOCK_SUPABASE_BASE_URL}/organizer/${uuidv4()}.png`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: mockPublicUrl },
    });

    const result = await service.uploadImageToStorage(input.file, input.type);

    // console.log('[UT-M062-02] Input :', { mimetype: input.file.mimetype, type: input.type });
    // console.log('[UT-M062-02] Expected :', mockPublicUrl);
    // console.log('[UT-M062-02] Actual :', result);

    expect(result).toBe(mockPublicUrl);
    const uploadedPath: string = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedPath).toMatch(/^organizer\/.+\.png$/);
  });

  it('UT-M062-03: should return public URL with .webp extension when WEBP file uploaded to participant folder', async () => {
    const input = { file: small_webp_file, type: 'participant' as const };
    const mockPublicUrl = `${MOCK_SUPABASE_BASE_URL}/participant/${uuidv4()}.webp`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: mockPublicUrl },
    });

    const result = await service.uploadImageToStorage(input.file, input.type);

    // console.log('[UT-M062-03] Input :', { mimetype: input.file.mimetype, type: input.type });
    // console.log('[UT-M062-03] Expected :', mockPublicUrl);
    // console.log('[UT-M062-03] Actual :', result);

    expect(result).toBe(mockPublicUrl);
    const uploadedPath: string = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedPath).toMatch(/^participant\/.+\.webp$/);
  });

  it('UT-M062-04: should throw ImageUploadException and not call getPublicUrl when Supabase upload returns error', async () => {
    const input = { file: small_jpg_file, type: 'participant' as const };
    const mockSupabaseError = { message: 'Bucket not found' };
    mockStorageFrom.upload.mockResolvedValueOnce({ error: mockSupabaseError });
    mockStorageFrom.upload.mockResolvedValueOnce({ error: mockSupabaseError });

    await expect(
      service.uploadImageToStorage(input.file, input.type),
    ).rejects.toThrow(ImageUploadException);
    await expect(
      service.uploadImageToStorage(input.file, input.type),
    ).rejects.toThrow('Failed to upload image. Please try again.');
    expect(mockStorageFrom.getPublicUrl).not.toHaveBeenCalled();
  });

  it('UT-M062-05: should throw ImageUploadException when uploading to organizer folder fails', async () => {
    const input = { file: small_png_file, type: 'organizer' as const };
    mockStorageFrom.upload.mockResolvedValueOnce({
      error: { message: 'Permission denied' },
    });

    await expect(
      service.uploadImageToStorage(input.file, input.type),
    ).rejects.toThrow(ImageUploadException);
  });
});

describe('UserStorageService - resolveImageUrl', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M063-01: should return provided URL when valid participant image URL is given', () => {
    const input = {
      imageUrl: `${MOCK_SUPABASE_BASE_URL}/participant/mock-uuid.jpg`,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const expected = input.imageUrl;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-01] Input :', input);
    // console.log('[UT-M063-01] Expected :', expected);
    // console.log('[UT-M063-01] Actual :', result);

    expect(result).toBe(expected);
  });

  it('UT-M063-02: should return provided URL when valid organizer image URL is given', () => {
    const input = {
      imageUrl: `${MOCK_SUPABASE_BASE_URL}/organizer/mock-uuid.png`,
      defaultUrl: DEFAULT_ORGANIZER_IMAGE_URL,
    };
    const expected = input.imageUrl;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-02] Input :', input);
    // console.log('[UT-M063-02] Expected :', expected);
    // console.log('[UT-M063-02] Actual :', result);

    expect(result).toBe(expected);
  });

  it('UT-M063-03: should return DEFAULT_PARTICIPANT_IMAGE_URL when input is undefined', () => {
    const input = {
      imageUrl: undefined,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const expected = DEFAULT_PARTICIPANT_IMAGE_URL;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-03] Input :', input);
    // console.log('[UT-M063-03] Expected :', expected);
    // console.log('[UT-M063-03] Actual :', result);

    expect(result).toBe(expected);
  });

  it('UT-M063-04: should return DEFAULT_ORGANIZER_IMAGE_URL when input is undefined', () => {
    const input = {
      imageUrl: undefined,
      defaultUrl: DEFAULT_ORGANIZER_IMAGE_URL,
    };
    const expected = DEFAULT_ORGANIZER_IMAGE_URL;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-04] Input :', input);
    // console.log('[UT-M063-04] Expected :', expected);
    // console.log('[UT-M063-04] Actual :', result);

    expect(result).toBe(expected);
  });

  it('UT-M063-05: should return DEFAULT_PARTICIPANT_IMAGE_URL when input is empty string', () => {
    const input = { imageUrl: '', defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL };
    const expected = DEFAULT_PARTICIPANT_IMAGE_URL;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-05] Input :', input);
    // console.log('[UT-M063-05] Expected :', expected);
    // console.log('[UT-M063-05] Actual :', result);

    expect(result).toBe(expected);
  });

  it('UT-M063-06: should return DEFAULT_ORGANIZER_IMAGE_URL when input is whitespace only', () => {
    const input = { imageUrl: '   ', defaultUrl: DEFAULT_ORGANIZER_IMAGE_URL };
    const expected = DEFAULT_ORGANIZER_IMAGE_URL;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-06] Input :', input);
    // console.log('[UT-M063-06] Expected :', expected);
    // console.log('[UT-M063-06] Actual :', result);

    expect(result).toBe(expected);
  });

  it('UT-M063-07: should return DEFAULT_PARTICIPANT_IMAGE_URL when input is null', () => {
    const input = {
      imageUrl: null as any,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const expected = DEFAULT_PARTICIPANT_IMAGE_URL;

    const result = service.resolveImageUrl(input.imageUrl, input.defaultUrl);

    // console.log('[UT-M063-07] Input :', input);
    // console.log('[UT-M063-07] Expected :', expected);
    // console.log('[UT-M063-07] Actual :', result);

    expect(result).toBe(expected);
  });
});

describe('UserStorageService - deleteOrphanImageIfReplaced', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M064-01: should call deleteImageFromStorage with old URL when old and new participant URLs differ and old is not default', async () => {
    const input = {
      oldImageUrl: `${MOCK_SUPABASE_BASE_URL}/participant/old-uuid.jpg`,
      newImageUrl: `${MOCK_SUPABASE_BASE_URL}/participant/new-uuid.jpg`,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const deleteSpy = jest
      .spyOn(service, 'deleteImageFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanImageIfReplaced(
      input.oldImageUrl,
      input.newImageUrl,
      input.defaultUrl,
    );

    // console.log('[UT-M064-01] Input :', input);
    // console.log('[UT-M064-01] Expected : deleteImageFromStorage called with', input.oldImageUrl);
    // console.log('[UT-M064-01] Actual : called with', deleteSpy.mock.calls[0]?.[0]);

    expect(deleteSpy).toHaveBeenCalledWith(input.oldImageUrl);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('UT-M064-02: should call deleteImageFromStorage with old URL when old and new organizer URLs differ and old is not default', async () => {
    const input = {
      oldImageUrl: `${MOCK_SUPABASE_BASE_URL}/organizer/old-uuid.png`,
      newImageUrl: `${MOCK_SUPABASE_BASE_URL}/organizer/new-uuid.png`,
      defaultUrl: DEFAULT_ORGANIZER_IMAGE_URL,
    };
    const deleteSpy = jest
      .spyOn(service, 'deleteImageFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanImageIfReplaced(
      input.oldImageUrl,
      input.newImageUrl,
      input.defaultUrl,
    );

    // console.log('[UT-M064-02] Input :', input);
    // console.log('[UT-M064-02] Expected : deleteImageFromStorage called with', input.oldImageUrl);
    // console.log('[UT-M064-02] Actual : called with', deleteSpy.mock.calls[0]?.[0]);

    expect(deleteSpy).toHaveBeenCalledWith(input.oldImageUrl);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('UT-M064-03: should not call deleteImageFromStorage when old and new URLs are the same', async () => {
    const sameUrl = `${MOCK_SUPABASE_BASE_URL}/participant/same-uuid.jpg`;
    const input = {
      oldImageUrl: sameUrl,
      newImageUrl: sameUrl,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const deleteSpy = jest
      .spyOn(service, 'deleteImageFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanImageIfReplaced(
      input.oldImageUrl,
      input.newImageUrl,
      input.defaultUrl,
    );

    // console.log('[UT-M064-03] Input :', input);
    // console.log('[UT-M064-03] Expected : deleteImageFromStorage call count = 0');
    // console.log('[UT-M064-03] Actual : call count =', deleteSpy.mock.calls.length);

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('UT-M064-04: should not call deleteImageFromStorage when old URL is DEFAULT_PARTICIPANT_IMAGE_URL', async () => {
    const input = {
      oldImageUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
      newImageUrl: `${MOCK_SUPABASE_BASE_URL}/participant/new-uuid.jpg`,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const deleteSpy = jest
      .spyOn(service, 'deleteImageFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanImageIfReplaced(
      input.oldImageUrl,
      input.newImageUrl,
      input.defaultUrl,
    );

    // console.log('[UT-M064-04] Input :', input);
    // console.log('[UT-M064-04] Expected : deleteImageFromStorage call count = 0');
    // console.log('[UT-M064-04] Actual : call count =', deleteSpy.mock.calls.length);

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('UT-M064-05: should not call deleteImageFromStorage when old URL is DEFAULT_ORGANIZER_IMAGE_URL', async () => {
    const input = {
      oldImageUrl: DEFAULT_ORGANIZER_IMAGE_URL,
      newImageUrl: `${MOCK_SUPABASE_BASE_URL}/organizer/new-uuid.png`,
      defaultUrl: DEFAULT_ORGANIZER_IMAGE_URL,
    };
    const deleteSpy = jest
      .spyOn(service, 'deleteImageFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanImageIfReplaced(
      input.oldImageUrl,
      input.newImageUrl,
      input.defaultUrl,
    );

    // console.log('[UT-M064-05] Input :', input);
    // console.log('[UT-M064-05] Expected : deleteImageFromStorage call count = 0');
    // console.log('[UT-M064-05] Actual : call count =', deleteSpy.mock.calls.length);

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('UT-M064-06: should not call deleteImageFromStorage when old URL is null', async () => {
    const input = {
      oldImageUrl: null,
      newImageUrl: `${MOCK_SUPABASE_BASE_URL}/participant/new-uuid.jpg`,
      defaultUrl: DEFAULT_PARTICIPANT_IMAGE_URL,
    };
    const deleteSpy = jest
      .spyOn(service, 'deleteImageFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanImageIfReplaced(
      input.oldImageUrl,
      input.newImageUrl,
      input.defaultUrl,
    );

    // console.log('[UT-M064-06] Input :', input);
    // console.log('[UT-M064-06] Expected : deleteImageFromStorage call count = 0');
    // console.log('[UT-M064-06] Actual : call count =', deleteSpy.mock.calls.length);

    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe('UserStorageService - deleteImageFromStorage', () => {
  let service: UserStorageService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<UserStorageService>(UserStorageService);
    jest.clearAllMocks();
  });

  it('UT-M065-01: should call Supabase remove with correct extracted path when valid participant Supabase URL is given', async () => {
    const filePath = 'participant/mock-participant-uuid.jpg';
    const input = { imageUrl: `${MOCK_SUPABASE_BASE_URL}/${filePath}` };
    mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

    await service.deleteImageFromStorage(input.imageUrl);

    // console.log('[UT-M065-01] Input :', input);
    // console.log('[UT-M065-01] Expected : remove called with [' + filePath + ']');
    // console.log('[UT-M065-01] Actual : remove called with', mockStorageFrom.remove.mock.calls[0]?.[0]);

    expect(mockStorageFrom.remove).toHaveBeenCalledWith([filePath]);
    expect(mockStorageFrom.remove).toHaveBeenCalledTimes(1);
  });

  it('UT-M065-02: should call Supabase remove with correct extracted path when valid organizer Supabase URL is given', async () => {
    const filePath = 'organizer/mock-organizer-uuid.png';
    const input = { imageUrl: `${MOCK_SUPABASE_BASE_URL}/${filePath}` };
    mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

    await service.deleteImageFromStorage(input.imageUrl);

    // console.log('[UT-M065-02] Input :', input);
    // console.log('[UT-M065-02] Expected : remove called with [' + filePath + ']');
    // console.log('[UT-M065-02] Actual : remove called with', mockStorageFrom.remove.mock.calls[0]?.[0]);

    expect(mockStorageFrom.remove).toHaveBeenCalledWith([filePath]);
    expect(mockStorageFrom.remove).toHaveBeenCalledTimes(1);
  });

  it('UT-M065-03: should not call Supabase remove when input is not a valid URL', async () => {
    const input = { imageUrl: 'not-a-valid-url' };

    await service.deleteImageFromStorage(input.imageUrl);

    // console.log('[UT-M065-03] Input :', input);
    // console.log('[UT-M065-03] Expected : remove call count = 0');
    // console.log('[UT-M065-03] Actual : call count =', mockStorageFrom.remove.mock.calls.length);

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M065-04: should not call Supabase remove when URL does not match Supabase storage pattern', async () => {
    const input = { imageUrl: 'https://www.cmu.ac.th/profile/image.jpg' };

    await service.deleteImageFromStorage(input.imageUrl);

    // console.log('[UT-M065-04] Input :', input);
    // console.log('[UT-M065-04] Expected : remove call count = 0');
    // console.log('[UT-M065-04] Actual : call count =', mockStorageFrom.remove.mock.calls.length);

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });
});
