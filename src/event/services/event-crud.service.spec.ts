import { Test, TestingModule } from '@nestjs/testing';
import { EventCrudService } from './event-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  event: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockStorageService = {
  resolveBannerUrl: jest.fn(),
  deleteBannerFromStorage: jest.fn(),
  uploadBannerToStorage: jest.fn(),
};

const mockValidationService = {
  validatePublishDateRange: jest.fn(),
};

const mockUtils = {
  sanitizeBilingualField: jest.fn((f) => f ?? { en: '', th: '' }),
  sanitizeAgendaItems: jest.fn((a) => a ?? []),
  sanitizeDateRange: jest.fn((s, e) => ({ startAt: s, endAt: e })),
  isValidUrl: jest.fn((url: string) => true),
};

const mockEvent = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  title: { en: 'CMU New Student Orientation 2026', th: 'งานปฐมนิเทศนักศึกษาใหม่ มช. 2026' },
  description: {
    en: 'Welcome orientation for all new students at Chiang Mai University',
    th: 'งานต้อนรับนักศึกษาใหม่มหาวิทยาลัยเชียงใหม่',
  },
  category: ['ORIENTATION'],
  location: { en: 'CMU Main Auditorium', th: 'หอประชุมใหญ่ มช.' },
  mapLink: '',
  isOnline: false,
  startAt: new Date('2026-07-01T02:00:00.000Z'),
  endAt: new Date('2026-07-01T08:00:00.000Z'),
  seatLimit: 500,
  hasCatering: true,
  isCateringFree: true,
  cateringDescription: { en: 'Light refreshments provided', th: 'มีอาหารว่างบริการ' },
  agenda: [],
  contactName: 'CMU Student Affairs',
  contactEmail: 'studentaffairs@cmu.ac.th',
  contactPhone: '053-943660',
  contactLineId: '@cmustudentaffairs',
  externalUrl: '',
  remarks: { en: '', th: '' },
  bannerUrl: DEFAULT_BANNER_URL,
  status: 'PUBLISHED',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  publishedAt: new Date('2026-07-01T00:00:00.000Z'),
};

const mockEvent2 = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  title: { en: 'Loy Krathong Workshop 2026', th: 'เวิร์กช็อปทำกระทง 2026' },
  description: {
    en: 'Learn how to make traditional Krathong and celebrate Loy Krathong festival together',
    th: 'เรียนรู้การทำกระทงแบบดั้งเดิมและร่วมเฉลิมฉลองเทศกาลลอยกระทงด้วยกัน',
  },
  category: ['WORKSHOP', 'CULTURAL'],
  location: { en: 'VIP Room 1, CMU Office Building', th: 'ห้อง VIP 1 อาคารสำนักงานมหาวิทยาลัย มช.' },
  mapLink: 'https://maps.app.goo.gl/cmuoffice',
  isOnline: false,
  startAt: new Date('2026-11-07T02:00:00.000Z'),
  endAt: new Date('2026-11-07T05:00:00.000Z'),
  seatLimit: 30,
  hasCatering: false,
  isCateringFree: false,
  cateringDescription: { en: '', th: '' },
  agenda: [
    { time: '09:00', activity: { en: 'Registration', th: 'ลงทะเบียน' } },
    { time: '09:30', activity: { en: 'Krathong Making', th: 'ทำกระทง' } },
    { time: '11:30', activity: { en: 'Loy Krathong Ceremony', th: 'พิธีลอยกระทง' } },
  ],
  contactName: 'CMU Cultural Club',
  contactEmail: 'cultural@cmu.ac.th',
  contactPhone: '053-943661',
  contactLineId: '@cmucultural',
  externalUrl: 'https://reg.cmu.ac.th/loykrathong2026',
  remarks: { en: 'All materials provided', th: 'มีวัสดุอุปกรณ์ให้ครบ' },
  bannerUrl: 'https://mockproject.supabase.co/storage/v1/object/public/banners/loykrathong-uuid.jpg',
  status: 'PUBLISHED',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  publishedAt: new Date('2026-10-01T00:00:00.000Z'),
};

const createMockOrientationEvent = () => ({
  title: {
    en: 'CMU New Student Orientation 2026',
    th: 'งานปฐมนิเทศนักศึกษาใหม่ มช. 2026',
  },
  description: {
    en: 'Welcome orientation for all new students at Chiang Mai University',
    th: 'งานต้อนรับนักศึกษาใหม่มหาวิทยาลัยเชียงใหม่',
  },
  location: {
    en: 'CMU Main Auditorium',
    th: 'หอประชุมใหญ่ มหาวิทยาลัยเชียงใหม่',
  },
  cateringDescription: {
    en: 'Light refreshments provided',
    th: 'มีอาหารว่างบริการ',
  },
  remarks: { en: 'Bring your student ID card', th: 'นำบัตรนักศึกษามาด้วย' },
  agenda: [
    { time: '08:00', activity: { en: 'Registration', th: 'ลงทะเบียน' } },
    { time: '09:00', activity: { en: 'Welcome Speech', th: 'กล่าวต้อนรับ' } },
  ],
  category: ['ORIENTATION'],
  isOnline: false,
  hasCatering: true,
  isCateringFree: true,
  mapLink: 'https://maps.app.goo.gl/cmuauditorium',
  externalUrl: 'https://reg.cmu.ac.th/orientation2026',
  seatLimit: 500,
  contactName: 'CMU Student Affairs',
  contactEmail: 'studentaffairs@cmu.ac.th',
  contactPhone: '053-943660',
  contactLineId: '@cmustudentaffairs',
  startAt: new Date('2026-07-01T02:00:00.000Z'),
  endAt: new Date('2026-07-01T08:00:00.000Z'),
  bannerUrl:
    'https://mockproject.supabase.co/storage/v1/object/public/banners/uuid.jpg',
});

// testing
describe('EventCrudService - sanitizeEventData', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventValidationService, useValue: mockValidationService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M021-01: should return sanitized object when all fields are present', () => {
    const dto = createMockOrientationEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    const result = service.sanitizeEventData(dto as any);

    expect(result.category).toEqual(['ORIENTATION']);
    expect(result.isOnline).toBe(false);
    expect(result.hasCatering).toBe(true);
    expect(result.isCateringFree).toBe(true);
    expect(result.mapLink).toBe('https://maps.app.goo.gl/cmuauditorium');
    expect(result.contactName).toBe('CMU Student Affairs');
    expect(result.contactEmail).toBe('studentaffairs@cmu.ac.th');
    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalled();
    expect(mockUtils.sanitizeAgendaItems).toHaveBeenCalled();
    expect(mockStorageService.resolveBannerUrl).toHaveBeenCalled();
  });

  it('UT-M021-02: should apply defaults when optional fields are missing', () => {
    mockStorageService.resolveBannerUrl.mockReturnValue(DEFAULT_BANNER_URL);

    const result = service.sanitizeEventData({} as any);

    expect(result.category).toEqual([]);
    expect(result.isOnline).toBe(false);
    expect(result.hasCatering).toBe(false);
    expect(result.isCateringFree).toBe(false);
    expect(result.mapLink).toBe('');
    expect(result.contactName).toBe('');
    expect(result.contactEmail).toBe('');
    expect(result.contactPhone).toBe('');
    expect(result.contactLineId).toBe('');
    expect(result.externalUrl).toBe('');
  });

  it('UT-M021-03: should call resolveBannerUrl and return DEFAULT_BANNER_URL when no bannerUrl provided', () => {
    mockStorageService.resolveBannerUrl.mockReturnValue(DEFAULT_BANNER_URL);

    const result = service.sanitizeEventData({} as any);

    expect(mockStorageService.resolveBannerUrl).toHaveBeenCalledWith(undefined);
    expect(result.bannerUrl).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M021-04: should call resolveBannerUrl and return provided URL when bannerUrl is valid', () => {
    const dto = createMockOrientationEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    const result = service.sanitizeEventData(dto as any);

    expect(mockStorageService.resolveBannerUrl).toHaveBeenCalledWith(
      dto.bannerUrl,
    );
    expect(result.bannerUrl).toBe(dto.bannerUrl);
  });

  it('UT-M021-05: should call sanitizeBilingualField for all bilingual fields', () => {
    const dto = createMockOrientationEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(DEFAULT_BANNER_URL);

    service.sanitizeEventData(dto as any);

    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalledWith(dto.title);
    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalledWith(
      dto.description,
    );
    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalledWith(dto.location);
    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalledWith(
      dto.cateringDescription,
    );
    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalledWith(dto.remarks);
    expect(mockUtils.sanitizeBilingualField).toHaveBeenCalledTimes(5);
  });

  it('UT-M021-06: should call sanitizeAgendaItems for agenda field', () => {
    const dto = createMockOrientationEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(DEFAULT_BANNER_URL);

    service.sanitizeEventData(dto as any);

    expect(mockUtils.sanitizeAgendaItems).toHaveBeenCalledWith(dto.agenda);
    expect(mockUtils.sanitizeAgendaItems).toHaveBeenCalledTimes(1);
  });
});

describe('EventCrudService - getAllEvents', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventValidationService, useValue: mockValidationService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M025-01: should return array of events and call with ordered by createdAt desc when events exist', async () => {
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent2, mockEvent]);

    const result = await service.getAllEvents();

    expect(result).toEqual([mockEvent2, mockEvent]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M025-02: should return empty array when no events exist', async () => {
    mockPrisma.event.findMany.mockResolvedValueOnce([]);

    const result = await service.getAllEvents();

    expect(result).toEqual([]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('EventCrudService - getEventById', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventValidationService, useValue: mockValidationService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M026-01: should return event when event exists', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce(mockEvent);

    const result = await service.getEventById(mockEvent.id);

    expect(result).toEqual(mockEvent);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: mockEvent.id },
    });
    expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-M026-02: should throw NotFoundException when event does not exist', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);
    await expect(service.getEventById('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );

    mockPrisma.event.findUnique.mockResolvedValueOnce(null);
    await expect(service.getEventById('non-existent-id')).rejects.toThrow(
      'Event not found.',
    );
  });
});
