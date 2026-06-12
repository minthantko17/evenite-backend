import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { EventStorageService } from './event-storage.service';
import { BannerUploadException } from '../exceptions/banner-upload.exception';
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

// got error without beforeAll because of hoisting issue.
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
  'small_image_jpg.jpg',
);

const small_png_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_png.png')),
  'image/png',
  'small_image_png.png',
);

const small_webp_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_webp.webp')),
  'image/webp',
  'small_image_webp.webp',
);

describe('EventStorageService - uploadBannerToStorage', () => {
  let service: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStorageService],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
    jest.clearAllMocks();
  });

  it('UT-M014-01: should return public URL with .jpg extension when JPEG file is uploaded successfully', async () => {
    const file = small_jpg_file; // mimetype: 'image/jpeg'
    const mockPublicUrl = `${MOCK_SUPABASE_BASE_URL}/banners/${uuidv4()}.jpg`;

    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: mockPublicUrl },
    });

    const result = await service.uploadBannerToStorage(file);
    // console.log('[UT-M014-01] Expected: ' + mockPublicUrl);
    // console.log('[UT-M014-01] Actual:   ' + result);

    expect(result).toBe(mockPublicUrl);
    const uploadedFileName: string = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/^banners\/.+\.jpg$/);
    expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom.getPublicUrl).toHaveBeenCalledTimes(1);
  });

  it('UT-M014-02: should return public URL with .png extension when PNG file is uploaded successfully', async () => {
    const file = small_png_file; // mimetype: 'image/png'
    const mockPublicUrl = `${MOCK_SUPABASE_BASE_URL}/banners/${uuidv4()}.png`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: mockPublicUrl },
    });

    const result = await service.uploadBannerToStorage(file);
    // console.log('[UT-M014-02] Expected: ' + mockPublicUrl);
    // console.log('[UT-M014-02] Actual:   ' + result);

    expect(result).toBe(mockPublicUrl);
    const uploadedFileName: string = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/^banners\/.+\.png$/);
    expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom.getPublicUrl).toHaveBeenCalledTimes(1);
  });

  it('UT-M014-03: should return public URL with .webp extension when WEBP file is uploaded successfully', async () => {
    const file = small_webp_file; // mimetype: 'image/webp'
    const mockPublicUrl = `${MOCK_SUPABASE_BASE_URL}/banners/${uuidv4()}.webp`;
    mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
    mockStorageFrom.getPublicUrl.mockReturnValueOnce({
      data: { publicUrl: mockPublicUrl },
    });

    const result = await service.uploadBannerToStorage(file);
    // console.log('[UT-M014-03] Expected: ' + mockPublicUrl);
    // console.log('[UT-M014-03] Actual:   ' + result);

    expect(result).toBe(mockPublicUrl);
    const uploadedFileName: string = mockStorageFrom.upload.mock.calls[0][0];
    expect(uploadedFileName).toMatch(/^banners\/.+\.webp$/);
    expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom.getPublicUrl).toHaveBeenCalledTimes(1);
  });

  it('UT-M014-04: should throw BannerUploadException and not call getPublicUrl when Supabase upload returns an error', async () => {
    const file = small_jpg_file; // mimetype: 'image/jpeg'
    const mockSupabaseError = { message: 'Storage bucket not found' };

    mockStorageFrom.upload.mockResolvedValueOnce({ error: mockSupabaseError });
    await expect(service.uploadBannerToStorage(file)).rejects.toThrow(
      BannerUploadException,
    );

    mockStorageFrom.upload.mockResolvedValueOnce({ error: mockSupabaseError });
    await expect(service.uploadBannerToStorage(file)).rejects.toThrow(
      'Failed to upload banner image. Please try again.',
    );
    expect(mockStorageFrom.getPublicUrl).not.toHaveBeenCalled();
  });
});

describe('EventStorageService - resolveBannerUrl', () => {
  let service: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStorageService],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
    jest.clearAllMocks();
  });

  it('UT-M015-01: should return the provided URL as-is when a valid banner URL is given', () => {
    const bannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/mock-uuid.jpg`;

    const result = service.resolveBannerUrl(bannerUrl);
    // console.log('[UT-M015-01] Expected: ' + bannerUrl);
    // console.log('[UT-M015-01] Actual:   ' + result);

    expect(result).toBe(bannerUrl);
  });

  it('UT-M015-02: should return DEFAULT_BANNER_URL when input is undefined', () => {
    const bannerUrl = undefined;

    const result = service.resolveBannerUrl(bannerUrl);
    // console.log('[UT-M015-02] Expected: ' + DEFAULT_BANNER_URL);
    // console.log('[UT-M015-02] Actual:   ' + result);

    expect(result).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M015-03: should return DEFAULT_BANNER_URL when input is empty string', () => {
    const bannerUrl = '';

    const result = service.resolveBannerUrl(bannerUrl);
    // console.log('[UT-M015-03] Expected: ' + DEFAULT_BANNER_URL);
    // console.log('[UT-M015-03] Actual:   ' + result);

    expect(result).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M015-04: should return DEFAULT_BANNER_URL when input is whitespace only', () => {
    const bannerUrl = '   ';

    const result = service.resolveBannerUrl(bannerUrl);
    // console.log('[UT-M015-04] Expected: ' + DEFAULT_BANNER_URL);
    // console.log('[UT-M015-04] Actual:   ' + result);

    expect(result).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M015-05: should return DEFAULT_BANNER_URL when input is null', () => {
    const bannerUrl = null as any;

    const result = service.resolveBannerUrl(bannerUrl);
    // console.log('[UT-M015-05] Expected: ' + DEFAULT_BANNER_URL);
    // console.log('[UT-M015-05] Actual:   ' + result);

    expect(result).toBe(DEFAULT_BANNER_URL);
  });
});

describe('EventStorageService - deleteOrphanBannerIfReplaced', () => {
  let service: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStorageService],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
    jest.clearAllMocks();
  });

  it('UT-M016-01: should call deleteBannerFromStorage with old URL when old and new URLs are different and old is not default', async () => {
    const oldBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/old-banner-uuid.jpg`;
    const newBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/new-banner-uuid.jpg`;
    const deleteSpy = jest
      .spyOn(service, 'deleteBannerFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanBannerIfReplaced(oldBannerUrl, newBannerUrl);
    // console.log('[UT-M016-01] Expected: deleteBannerFromStorage called with ' + oldBannerUrl);
    // console.log('[UT-M016-01] Actual:   called with ' + deleteSpy.mock.calls[0]?.[0] );

    expect(deleteSpy).toHaveBeenCalledWith(oldBannerUrl);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('UT-M016-02: should not call deleteBannerFromStorage when old and new URLs are the same', async () => {
    const oldBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/same-banner-uuid.jpg`;
    const newBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/same-banner-uuid.jpg`;
    const deleteSpy = jest
      .spyOn(service, 'deleteBannerFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanBannerIfReplaced(oldBannerUrl, newBannerUrl);
    // console.log('[UT-M016-02] Expected: deleteBannerFromStorage call count = 0');
    // console.log('[UT-M016-02] Actual:   call count = ' + deleteSpy.mock.calls.length );

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('UT-M016-03: should not call deleteBannerFromStorage when old URL is DEFAULT_BANNER_URL', async () => {
    const oldBannerUrl = DEFAULT_BANNER_URL; // 'https://placehold.co/600x400?text=No+Image'
    const newBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/new-banner-uuid.jpg`;
    const deleteSpy = jest
      .spyOn(service, 'deleteBannerFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanBannerIfReplaced(oldBannerUrl, newBannerUrl);
    // console.log('[UT-M016-03] Expected: deleteBannerFromStorage call count = 0');
    // console.log('[UT-M016-03] Actual:   call count = ' + deleteSpy.mock.calls.length );

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('UT-M016-04: should not call deleteBannerFromStorage when old URL is null', async () => {
    const oldBannerUrl = null;
    const newBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/new-banner-uuid.jpg`;
    const deleteSpy = jest
      .spyOn(service, 'deleteBannerFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanBannerIfReplaced(oldBannerUrl, newBannerUrl);
    // console.log('[UT-M016-04] Expected: deleteBannerFromStorage call count = 0');
    // console.log('[UT-M016-04] Actual:   call count = ' + deleteSpy.mock.calls.length );

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('UT-M016-05: should call deleteBannerFromStorage with old URL when new URL is undefined and old is not default', async () => {
    const oldBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/old-banner-uuid.jpg`;
    const newBannerUrl = undefined;

    const deleteSpy = jest
      .spyOn(service, 'deleteBannerFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanBannerIfReplaced(oldBannerUrl, newBannerUrl);
    // console.log('[UT-M016-05] Expected: deleteBannerFromStorage called with ' + oldBannerUrl );
    // console.log('[UT-M016-05] Actual:   called with ' + deleteSpy.mock.calls[0]?.[0] );

    expect(deleteSpy).toHaveBeenCalledWith(oldBannerUrl);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('UT-M016-06: should not call deleteBannerFromStorage when old URL is DEFAULT_BANNER_URL and new URL is undefined', async () => {
    const oldBannerUrl = DEFAULT_BANNER_URL; // 'https://placehold.co/600x400?text=No+Image'
    const newBannerUrl = undefined;
    const deleteSpy = jest
      .spyOn(service, 'deleteBannerFromStorage')
      .mockResolvedValueOnce(undefined);

    await service.deleteOrphanBannerIfReplaced(oldBannerUrl, newBannerUrl);
    // console.log('[UT-M016-06] Expected: deleteBannerFromStorage call count = 0');
    // console.log('[UT-M016-06] Actual:   call count = ' + deleteSpy.mock.calls.length );

    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe('EventStorageService - deleteBannerFromStorage', () => {
  let service: EventStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStorageService],
    }).compile();

    service = module.get<EventStorageService>(EventStorageService);
    jest.clearAllMocks();
  });

  it('UT-M017-01: should call Supabase remove with correct extracted file path when valid Supabase URL is given', async () => {
    const filePath = 'banners/mock-banner-uuid.jpg';
    const bannerUrl = `${MOCK_SUPABASE_BASE_URL}/${filePath}`;
    mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

    await service.deleteBannerFromStorage(bannerUrl);
    // console.log('[UT-M017-01] Expected: remove called with [' + filePath + ']');
    // console.log('[UT-M017-01] Actual:   remove called with ' + JSON.stringify(mockStorageFrom.remove.mock.calls[0]?.[0]));

    expect(mockStorageFrom.remove).toHaveBeenCalledWith([filePath]);
    expect(mockStorageFrom.remove).toHaveBeenCalledTimes(1);
  });

  it('UT-M017-02: should not call Supabase remove when input is not a valid URL', async () => {
    const bannerUrl = 'not-a-valid-url';

    await service.deleteBannerFromStorage(bannerUrl);
    // console.log('[UT-M017-02] Expected: remove call count = 0');
    // console.log('[UT-M017-02] Actual:   call count = ' + mockStorageFrom.remove.mock.calls.length );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('UT-M017-03: should not call Supabase remove when URL does not match Supabase storage pattern', async () => {
    const bannerUrl = 'https://www.cmu.ac.th/files/banner.jpg';

    await service.deleteBannerFromStorage(bannerUrl);
    // console.log('[UT-M017-03] Expected: remove call count = 0');
    // console.log('[UT-M017-03] Actual:   call count = ' + mockStorageFrom.remove.mock.calls.length );

    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });
});
