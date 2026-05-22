import { Test, TestingModule } from '@nestjs/testing';
import { EventCrudService } from './event-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';
import { NotFoundException } from '@nestjs/common';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { SaveEventException } from '../exceptions/save-event.exception';
import { v4 as uuidv4 } from 'uuid';
import { PublishEventDto } from '../dto/publish-event.dto';
import { PublishEventException } from '../exceptions/publish-event.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';
import { EventStatus } from '@prisma/client';

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
  status: 'DRAFT',
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

const createMockSportsDayEvent = () => ({
  title: { en: 'CAMT Sports Day 2026', th: 'กีฬาสี CAMT 2026' },
  description: {
    en: 'Annual sports day for CAMT students featuring fun activities and competitions',
    th: 'งานกีฬาสีประจำปีสำหรับนักศึกษา CAMT พร้อมกิจกรรมสนุกสนานและการแข่งขัน',
  },
  location: { en: 'CMU Sports Complex', th: 'สนามกีฬา มช.' },
  cateringDescription: {
    en: 'Free snacks and drinks for all participants',
    th: 'ของว่างและเครื่องดื่มฟรีสำหรับผู้เข้าร่วม',
  },
  remarks: { en: 'Wear comfortable sportswear', th: 'สวมชุดกีฬาที่สบาย' },
  agenda: [
    { time: '08:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    {
      time: '09:00',
      activity: { en: 'Sports Competitions', th: 'การแข่งขันกีฬา' },
    },
    {
      time: '12:00',
      activity: { en: 'Lunch Break', th: 'พักรับประทานอาหารกลางวัน' },
    },
    {
      time: '13:00',
      activity: { en: 'Fun Activities', th: 'กิจกรรมสนุกสนาน' },
    },
    { time: '16:00', activity: { en: 'Award Ceremony', th: 'พิธีมอบรางวัล' } },
  ],
  category: ['SPORT', 'CLUB_ACTIVITY'],
  isOnline: false,
  hasCatering: true,
  isCateringFree: true,
  mapLink: 'https://maps.app.goo.gl/camtsportscomplex',
  externalUrl: 'https://reg.camt.cmu.ac.th/sportsday2026',
  seatLimit: 200,
  contactName: 'CAMT Student Club',
  contactEmail: 'club@camt.cmu.ac.th',
  contactPhone: '053-942463',
  contactLineId: '@camtclub',
  startAt: new Date('2026-03-15T01:00:00.000Z'),
  endAt: new Date('2026-03-15T10:00:00.000Z'),
  bannerUrl:
    'https://mockproject.supabase.co/storage/v1/object/public/banners/uuid.jpg',
});

const createMockRoVCompetitionEvent = () => ({
  title: { en: 'RoV Game Competition 2026', th: 'การแข่งขัน RoV 2026' },
  description: {
    en: 'Annual RoV mobile game competition hosted by CAMT, open to all CMU students',
    th: 'การแข่งขันเกม RoV บนมือถือประจำปี จัดโดย CAMT เปิดรับนักศึกษา มช. ทุกคน',
  },
  location: { en: 'CAMT Building, Room 109', th: 'อาคาร CAMT ห้อง 109' },
  cateringDescription: {
    en: 'Snacks and drinks provided',
    th: 'มีของว่างและเครื่องดื่มบริการ',
  },
  remarks: {
    en: 'Bring your own mobile device and charger',
    th: 'นำมือถือและสายชาร์จมาเอง',
  },
  agenda: [
    {
      time: '09:00',
      activity: {
        en: 'Registration and Device Check',
        th: 'ลงทะเบียนและตรวจอุปกรณ์',
      },
    },
    {
      time: '10:00',
      activity: { en: 'Group Stage Matches', th: 'รอบแบ่งกลุ่ม' },
    },
    {
      time: '13:00',
      activity: { en: 'Lunch Break', th: 'พักรับประทานอาหารกลางวัน' },
    },
    {
      time: '14:00',
      activity: { en: 'Semifinal Matches', th: 'รอบรองชนะเลิศ' },
    },
    {
      time: '16:00',
      activity: {
        en: 'Grand Final and Award Ceremony',
        th: 'รอบชิงชนะเลิศและพิธีมอบรางวัล',
      },
    },
  ],
  category: ['COMPETITION', 'CLUB_ACTIVITY'],
  isOnline: false,
  hasCatering: true,
  isCateringFree: true,
  mapLink: 'https://maps.app.goo.gl/camtbuilding',
  externalUrl: 'https://reg.camt.cmu.ac.th/rov2026',
  seatLimit: 64,
  contactName: 'CAMT Game Club',
  contactEmail: 'gameclub@camt.cmu.ac.th',
  contactPhone: '053-942464',
  contactLineId: '@camtgameclub',
  startAt: new Date('2026-05-15T02:00:00.000Z'),
  endAt: new Date('2026-05-15T11:00:00.000Z'),
  bannerUrl:
    'https://mockproject.supabase.co/storage/v1/object/public/banners/rov-uuid.jpg',
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

describe('EventCrudService - getEvents', () => {
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

  it('UT-M025-01: should return all events ordered by createdAt desc when no status provided', async () => {
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent2, mockEvent]);

    const result = await service.getEvents();

    expect(result).toEqual([mockEvent2, mockEvent]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M025-02: should return only published events when status PUBLISHED provided', async () => {
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent]);

    const result = await service.getEvents(EventStatus.PUBLISHED);

    expect(result).toEqual([mockEvent]);
    expect(result[0].status).toBe(EventStatus.PUBLISHED);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { status: EventStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M025-03: should return only draft events when status DRAFT provided', async () => {
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent2]);

    const result = await service.getEvents(EventStatus.DRAFT);

    expect(result).toEqual([mockEvent2]);
    expect(result[0].status).toBe(EventStatus.DRAFT);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { status: EventStatus.DRAFT },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M025-04: should return empty array when no events exist', async () => {
    mockPrisma.event.findMany.mockResolvedValueOnce([]);

    const result = await service.getEvents();

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

describe('EventCrudService - saveEventAsDraft', () => {
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

  it('UT-M022-01: should create new draft event and return created event when no eventId provided', async () => {
    const dto = createMockSportsDayEvent();
    const newEventId = uuidv4();
    const expectedEvent = { ...dto, id: newEventId, status: 'DRAFT' };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockResolvedValueOnce(expectedEvent);

    const result = await service.saveEventAsDraft(dto as SaveDraftDto);

    expect(result).toEqual(expectedEvent);
    expect(result.id).toBeDefined();
    expect(result.id).toBe(newEventId);
    expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      }),
    );
    expect(mockPrisma.event.update).not.toHaveBeenCalled();
  });

  it('UT-M022-02: should update existing draft event and return updated event when eventId provided', async () => {
    const dto = { ...createMockSportsDayEvent(), id: uuidv4() };
    const expectedEvent = { ...dto, status: 'DRAFT' };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });
    mockPrisma.event.update.mockResolvedValueOnce(expectedEvent);

    const result = await service.saveEventAsDraft(
      dto as SaveDraftDto,
      dto.id,
    );

    expect(result).toEqual(expectedEvent);
    expect(result.id).toBe(dto.id);
    expect(result.bannerUrl).toBe(dto.bannerUrl);
    
    expect(mockPrisma.event.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: dto.id },
        data: expect.objectContaining({ status: 'DRAFT' }),
      }),
    );
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  it('UT-M022-03: should throw NotFoundException when eventId provided but event not found', async () => {
    const dto = {...createMockSportsDayEvent(), id: uuidv4() };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.saveEventAsDraft(dto as SaveDraftDto, dto.id),
    ).rejects.toThrow(NotFoundException);

    mockPrisma.event.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.saveEventAsDraft(dto as SaveDraftDto, dto.id),
    ).rejects.toThrow('Event not found.');
  });

  it('UT-M022-04: should throw SaveEventException when Prisma create fails', async () => {
    const dto = createMockSportsDayEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    await expect(service.saveEventAsDraft(dto as SaveDraftDto)).rejects.toThrow(
      SaveEventException,
    );

    mockPrisma.event.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    await expect(service.saveEventAsDraft(dto as SaveDraftDto)).rejects.toThrow(
      'Failed to save event. Please try again.',
    );
  });

  it('UT-M022-05: should throw SaveEventException when Prisma update fails', async () => {
    const dto = {...createMockSportsDayEvent(), id: uuidv4() };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });
    mockPrisma.event.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.saveEventAsDraft(dto as SaveDraftDto, dto.id),
    ).rejects.toThrow(SaveEventException);

    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });
    mockPrisma.event.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    await expect(
      service.saveEventAsDraft(dto as SaveDraftDto, dto.id),
    ).rejects.toThrow('Failed to save event. Please try again.');
  });
});

describe('EventCrudService - publishEvent', () => {
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

  it('UT-M017-01: should create new published event and return created event when no eventId provided', async () => {
    const dto = createMockRoVCompetitionEvent();
    const newEventId = uuidv4();
    const now = new Date();
    const expectedEvent = { ...dto, id: newEventId, status: 'PUBLISHED', publishedAt: now };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockResolvedValueOnce(expectedEvent);

    const result = await service.publishEvent(dto as PublishEventDto);

    expect(result).toEqual(expectedEvent);
    expect(result.id).toBe(newEventId);
    expect(result.status).toBe('PUBLISHED');
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(result.publishedAt).toEqual(now);

    expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockPrisma.event.update).not.toHaveBeenCalled();
  });

  it('UT-M017-02: should update existing event as published and return updated event when eventId provided', async () => {
    const dto = { ...createMockRoVCompetitionEvent(), id: uuidv4() };
    const now = new Date();
    const expectedEvent = { ...dto, status: 'PUBLISHED', publishedAt: now };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });
    mockPrisma.event.update.mockResolvedValueOnce(expectedEvent);

    const result = await service.publishEvent(dto as PublishEventDto, dto.id);

    expect(result).toEqual(expectedEvent);
    expect(result.id).toBe(dto.id);
    expect(result.status).toBe('PUBLISHED');
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(result.publishedAt).toEqual(now);
    expect(result.bannerUrl).toBe(dto.bannerUrl);

    expect(mockPrisma.event.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: dto.id },
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  it('UT-M017-03: should throw NotFoundException when eventId provided but event not found', async () => {
    const dto = { ...createMockRoVCompetitionEvent(), id: uuidv4() };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.publishEvent(dto as PublishEventDto, dto.id),
    ).rejects.toThrow(NotFoundException);

    mockPrisma.event.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.publishEvent(dto as PublishEventDto, dto.id),
    ).rejects.toThrow('Event not found.');
  });

  it('UT-M017-04: should throw InvalidDateRangeException when startAt is greater than or equal to endAt', async () => {
    const dto = {
      ...createMockRoVCompetitionEvent(),
      startAt: new Date('2026-05-15T11:00:00.000Z'),
      endAt: new Date('2026-05-15T02:00:00.000Z'),
    };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockValidationService.validatePublishDateRange.mockImplementationOnce(
      () => {
        throw new InvalidDateRangeException();
      },
    );

    await expect(service.publishEvent(dto as PublishEventDto)).rejects.toThrow(
      InvalidDateRangeException,
    );

    mockValidationService.validatePublishDateRange.mockImplementationOnce(
      () => {
        throw new InvalidDateRangeException();
      },
    );
    await expect(service.publishEvent(dto as PublishEventDto)).rejects.toThrow(
      'Start date must be before end date.',
    );
  });

  it('UT-M017-05: should throw PublishEventException when Prisma create fails', async () => {
    const dto = createMockRoVCompetitionEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(service.publishEvent(dto as PublishEventDto)).rejects.toThrow(
      PublishEventException,
    );

    mockPrisma.event.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    await expect(service.publishEvent(dto as PublishEventDto)).rejects.toThrow(
      'Failed to publish event. Please try again.',
    );
  });

  it('UT-M017-06: should throw PublishEventException when Prisma update fails', async () => {
    const dto = { ...createMockRoVCompetitionEvent(), id: uuidv4() };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });
    mockPrisma.event.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.publishEvent(dto as PublishEventDto, dto.id),
    ).rejects.toThrow(PublishEventException);

    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });
    mockPrisma.event.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    await expect(
      service.publishEvent(dto as PublishEventDto, dto.id),
    ).rejects.toThrow('Failed to publish event. Please try again.');
  });
});

describe('EventCrudService - deleteOrphanBannerIfReplaced', () => {
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

  const existingEventId = uuidv4();
  const nonExistingEventId = 'non-existent-id';
  const oldBannerUrl =
    `https://mockproject.supabase.co/storage/v1/object/public/banners/${uuidv4()}.jpg`;
  const newBannerUrl =
    `https://mockproject.supabase.co/storage/v1/object/public/banners/${uuidv4()}.jpg`;

  it('UT-M019-01: should call deleteBannerFromStorage when old and new bannerUrl differ and old is not default', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: oldBannerUrl,
    });
    await (service as any).deleteOrphanBannerIfReplaced(
      existingEventId,
      newBannerUrl,
    );

    expect(mockStorageService.deleteBannerFromStorage).toHaveBeenCalledWith(
      oldBannerUrl,
    );
    expect(mockStorageService.deleteBannerFromStorage).toHaveBeenCalledTimes(1);
  });

  it('UT-M019-02: should not call deleteBannerFromStorage when old and new bannerUrl are the same', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: newBannerUrl,
    });

    await (service as any).deleteOrphanBannerIfReplaced(
      existingEventId,
      newBannerUrl,
    );

    expect(mockStorageService.deleteBannerFromStorage).not.toHaveBeenCalled();
  });

  it('UT-M019-03: should not call deleteBannerFromStorage when old bannerUrl is DEFAULT_BANNER_URL', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: DEFAULT_BANNER_URL,
    });

    await (service as any).deleteOrphanBannerIfReplaced(
      existingEventId,
      newBannerUrl,
    );

    expect(mockStorageService.deleteBannerFromStorage).not.toHaveBeenCalled();
  });

  it('UT-M019-04: should throw NotFoundException when event not found', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    await expect(
      (service as any).deleteOrphanBannerIfReplaced(
        nonExistingEventId,
        newBannerUrl,
      ),
    ).rejects.toThrow(NotFoundException);

    mockPrisma.event.findUnique.mockResolvedValueOnce(null);
    await expect(
      (service as any).deleteOrphanBannerIfReplaced(
        nonExistingEventId,
        newBannerUrl,
      ),
    ).rejects.toThrow('Event not found.');
  });
});