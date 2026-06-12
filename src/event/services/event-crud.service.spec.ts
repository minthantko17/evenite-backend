import { Test, TestingModule } from '@nestjs/testing';
import { EventCrudService } from './event-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStorageService } from './event-storage.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';
import { SaveDraftDto } from '../dto/save-draft.dto';
import { PublishEventDto } from '../dto/publish-event.dto';
import { SaveEventException } from '../exceptions/save-event.exception';
import { EventNotFoundException } from '../exceptions/event-not-found.exception';
import { EventStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const MOCK_SUPABASE_BASE_URL =
  'https://mockproject.supabase.co/storage/v1/object/public/evenite-images';

const mockPrisma = {
  event: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  eventRegistration: {
    findMany: jest.fn(),
  },
};

const mockStorageService = {
  resolveBannerUrl: jest.fn((url) => url ?? DEFAULT_BANNER_URL),
  deleteBannerFromStorage: jest.fn(),
  uploadBannerToStorage: jest.fn(),
};

const mockUtils = {
  sanitizeBilingualField: jest.fn((f) => f ?? { en: '', th: '' }),
  sanitizeAgendaItems: jest.fn((a) => a ?? []),
};

const mockEvent = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  organizerId: 'mock-org-uuid-1234',
  universityId: 'mock-university-uuid-1234',
  title: {
    en: 'CMU New Student Orientation 2026',
    th: 'งานปฐมนิเทศนักศึกษาใหม่ มช. 2026',
  },
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
  cateringDescription: {
    en: 'Light refreshments provided',
    th: 'มีอาหารว่างบริการ',
  },
  agenda: [],
  contactName: 'CMU Student Affairs',
  contactEmail: 'studentaffairs@cmu.ac.th',
  contactPhone: '053-943660',
  contactLineId: '@cmustudentaffairs',
  externalUrl: '',
  remarks: { en: '', th: '' },
  bannerUrl: DEFAULT_BANNER_URL,
  status: EventStatus.PUBLISHED,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  publishedAt: new Date('2026-07-01T00:00:00.000Z'),
  forms: [],
};

const mockEvent2 = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  organizerId: 'mock-org-uuid-1234',
  universityId: 'mock-university-uuid-1234',
  title: { en: 'Loy Krathong Workshop 2026', th: 'เวิร์กช็อปทำกระทง 2026' },
  description: {
    en: 'Learn how to make traditional Krathong',
    th: 'เรียนรู้การทำกระทงแบบดั้งเดิม',
  },
  category: ['WORKSHOP', 'CULTURAL'],
  location: {
    en: 'VIP Room 1, CMU Office Building',
    th: 'ห้อง VIP 1 อาคารสำนักงานมหาวิทยาลัย มช.',
  },
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
  ],
  contactName: 'CMU Cultural Club',
  contactEmail: 'cultural@cmu.ac.th',
  contactPhone: '053-943661',
  contactLineId: '@cmucultural',
  externalUrl: 'https://reg.cmu.ac.th/loykrathong2026',
  remarks: { en: 'All materials provided', th: 'มีวัสดุอุปกรณ์ให้ครบ' },
  bannerUrl: `${MOCK_SUPABASE_BASE_URL}/banners/loykrathong-uuid.jpg`,
  status: EventStatus.DRAFT,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  publishedAt: null,
  forms: [{ id: 'form-uuid-1', type: 'REGISTRATION' }],
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
  bannerUrl: `${MOCK_SUPABASE_BASE_URL}/banners/orientation-uuid.jpg`,
});

const createMockSportsDayEvent = () => ({
  title: { en: 'CAMT Sports Day 2026', th: 'กีฬาสี CAMT 2026' },
  description: {
    en: 'Annual sports day for CAMT students',
    th: 'งานกีฬาสีประจำปีสำหรับนักศึกษา CAMT',
  },
  location: { en: 'CMU Sports Complex', th: 'สนามกีฬา มช.' },
  cateringDescription: {
    en: 'Free snacks and drinks',
    th: 'ของว่างและเครื่องดื่มฟรี',
  },
  remarks: { en: 'Wear comfortable sportswear', th: 'สวมชุดกีฬาที่สบาย' },
  agenda: [
    { time: '08:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    {
      time: '09:00',
      activity: { en: 'Sports Competitions', th: 'การแข่งขันกีฬา' },
    },
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
  bannerUrl: `${MOCK_SUPABASE_BASE_URL}/banners/sportsday-uuid.jpg`,
});

const createMockRoVCompetitionEvent = () => ({
  title: { en: 'RoV Game Competition 2026', th: 'การแข่งขัน RoV 2026' },
  description: {
    en: 'Annual RoV mobile game competition hosted by CAMT',
    th: 'การแข่งขันเกม RoV บนมือถือประจำปี จัดโดย CAMT',
  },
  location: { en: 'CAMT Building, Room 109', th: 'อาคาร CAMT ห้อง 109' },
  cateringDescription: {
    en: 'Snacks and drinks provided',
    th: 'มีของว่างและเครื่องดื่มบริการ',
  },
  remarks: { en: 'Bring your own mobile device', th: 'นำมือถือมาเอง' },
  agenda: [
    { time: '09:00', activity: { en: 'Registration', th: 'ลงทะเบียน' } },
    { time: '10:00', activity: { en: 'Group Stage', th: 'รอบแบ่งกลุ่ม' } },
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
  bannerUrl: `${MOCK_SUPABASE_BASE_URL}/banners/rov-uuid.jpg`,
});

const mockMarathonEventDto = {
  title: { en: 'CMU Marathon 2026', th: 'มาราธอน มช. 2026' },
  description: {
    en: 'Annual marathon event at Chiang Mai University open to all students and staff',
    th: 'งานมาราธอนประจำปีของมหาวิทยาลัยเชียงใหม่ เปิดรับนักศึกษาและบุคลากร',
  },
  location: { en: 'CMU Main Stadium', th: 'สนามกีฬากลาง มช.' },
  cateringDescription: {
    en: 'Water and energy drinks provided at every checkpoint',
    th: 'มีน้ำและเครื่องดื่มชูกำลังที่ทุกจุด',
  },
  remarks: {
    en: 'Bring your student ID and running shoes',
    th: 'นำบัตรนักศึกษาและรองเท้าวิ่งมาด้วย',
  },
  agenda: [
    {
      time: '05:00',
      activity: { en: 'Assembly at Starting Point', th: 'รวมพลที่จุดสตาร์ท' },
    },
    {
      time: '06:00',
      activity: { en: 'Marathon Start', th: 'เริ่มการแข่งขัน' },
    },
    { time: '09:00', activity: { en: 'Award Ceremony', th: 'พิธีมอบรางวัล' } },
  ],
  category: ['SPORT'],
  isOnline: false,
  hasCatering: true,
  isCateringFree: true,
  mapLink: 'https://maps.app.goo.gl/cmustadium',
  externalUrl: 'https://reg.cmu.ac.th/marathon2026',
  seatLimit: 500,
  contactName: 'CMU Sports Club',
  contactEmail: 'sports@cmu.ac.th',
  contactPhone: '053-943000',
  contactLineId: '@cmusports',
  startAt: new Date('2026-12-01T23:00:00.000Z'),
  endAt: new Date('2026-12-02T05:00:00.000Z'),
  bannerUrl: `${MOCK_SUPABASE_BASE_URL}/banners/marathon-uuid.jpg`,
};

const mockMarathonDbEvent = {
  id: 'marathon-event-uuid-1234',
  organizerId: 'mock-org-uuid-1234',
  universityId: 'mock-university-uuid-1234',
  ...mockMarathonEventDto,
  status: EventStatus.PUBLISHED,
  publishedAt: new Date('2026-11-01T00:00:00.000Z'),
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  forms: [{ id: 'mock-form-uuid-1', type: 'REGISTRATION' }],
};

const mockMarathonRegistration = {
  id: 'mock-registration-uuid-1234',
  participantId: 'mock-participant-uuid-1234',
  eventId: 'marathon-event-uuid-1234',
  createdAt: new Date('2026-11-15T00:00:00.000Z'),
  updatedAt: new Date('2026-11-15T00:00:00.000Z'),
  event: mockMarathonDbEvent,
};

describe('EventCrudService - sanitizeEventData', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M018-01: should return sanitized object when all fields are present', () => {
    const dto = createMockOrientationEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    const result = service.sanitizeEventData(dto as any);
    // console.log('[UT-M018-01] Input:', dto);
    // console.log('[UT-M018-01] Expected:', dto);
    // console.log('[UT-M018-01] Actual', result);

    expect(result.title).toEqual(dto.title);
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
    expect(result).toEqual(dto);
  });

  it('UT-M018-02: should apply defaults when fields are missing', () => {
    mockStorageService.resolveBannerUrl.mockReturnValue(DEFAULT_BANNER_URL);
    const expected = {
      title: { en: '', th: '' },
      description: { en: '', th: '' },
      location: { en: '', th: '' },
      cateringDescription: { en: '', th: '' },
      remarks: { en: '', th: '' },
      agenda: [],
      bannerUrl: DEFAULT_BANNER_URL,
      category: [],
      startAt: undefined,
      endAt: undefined,
      isOnline: false,
      hasCatering: false,
      isCateringFree: false,
      mapLink: '',
      seatLimit: undefined,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      externalUrl: '',
    };

    const result = service.sanitizeEventData({} as any);
    // console.log('[UT-M018-02] Input dto:', '{}');
    // console.log('[UT-M018-02] Expected result:', expected);
    // console.log('[UT-M018-02] Actual result:', result);

    expect(result).toEqual(expected);
  });

  it('UT-M018-03: should call resolveBannerUrl with undefined and return DEFAULT_BANNER_URL when no bannerUrl provided', () => {
    mockStorageService.resolveBannerUrl.mockReturnValue(DEFAULT_BANNER_URL);

    const result = service.sanitizeEventData({} as any);
    // console.log('[UT-M018-03] Input :', {});
    // console.log('[UT-M018-03] Expected result.bannerUrl:', DEFAULT_BANNER_URL);
    // console.log('[UT-M018-03] Actual result.bannerUrl:', result.bannerUrl);

    expect(mockStorageService.resolveBannerUrl).toHaveBeenCalledWith(undefined);
    expect(result.bannerUrl).toBe(DEFAULT_BANNER_URL);
  });

  it('UT-M018-04: should call resolveBannerUrl with provided URL and return it when bannerUrl is valid', () => {
    const dto = createMockOrientationEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    const result = service.sanitizeEventData(dto as any);
    // console.log('[UT-M018-04] Input:', dto);
    // console.log('[UT-M018-04] Expected:', dto);
    // console.log('[UT-M018-04] Actual result:', result);

    // Assert
    expect(mockStorageService.resolveBannerUrl).toHaveBeenCalledWith(
      dto.bannerUrl,
    );
    expect(result.bannerUrl).toBe(dto.bannerUrl);
  });

  it('UT-M018-05: should call sanitizeBilingualField for all 5 bilingual fields', () => {
    const dto = createMockRoVCompetitionEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    service.sanitizeEventData(dto as any);
    // console.log('[UT-M018-05] Expected: sanitizeBilingualField called 5 times');
    // console.log('[UT-M018-05] Actual:   call count =', mockUtils.sanitizeBilingualField.mock.calls.length);

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

  it('UT-M018-06: should call sanitizeAgendaItems once with agenda field', () => {
    const dto = createMockSportsDayEvent();
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    service.sanitizeEventData(dto as any);
    // console.log('[UT-M018-06] Expected: sanitizeAgendaItems called 1 time with dto.agenda');
    // console.log('[UT-M018-06] Actual:   call count =', mockUtils.sanitizeAgendaItems.mock.calls.length);

    expect(mockUtils.sanitizeAgendaItems).toHaveBeenCalledWith(dto.agenda);
    expect(mockUtils.sanitizeAgendaItems).toHaveBeenCalledTimes(1);
  });

  it('UT-M018-07: should pass through startAt and endAt as-is when provided', () => {
    const dto = { ...mockMarathonEventDto };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    const result = service.sanitizeEventData(dto as any);
    // console.log('[UT-M018-07] Input:', dto);
    // console.log('[UT-M018-07] Expected :', dto);
    // console.log('[UT-M018-07] Actual :' , result);

    expect(result.startAt).toEqual(dto.startAt);
    expect(result.endAt).toEqual(dto.endAt);
  });

  it('UT-M018-08: should pass through seatLimit as-is when provided', () => {
    const dto = { ...mockMarathonEventDto };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);

    const result = service.sanitizeEventData(dto as any);
    // console.log('[UT-M018-08] Input:', dto);
    // console.log('[UT-M018-08] Expected:', dto);
    // console.log('[UT-M018-08] Actual:', result);

    expect(result.seatLimit).toBe(dto.seatLimit);
  });
});

describe('EventCrudService - saveEvent', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M019-01: should call prisma.event.create with correct data and return created event when no eventId provided and status is DRAFT', async () => {
    const dto = { ...mockMarathonEventDto };
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.DRAFT;
    const expectedCreatedEvent = {
      ...mockMarathonDbEvent,
      status: EventStatus.DRAFT,
      publishedAt: null,
    };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockResolvedValueOnce(expectedCreatedEvent);

    const result = await service.saveEvent(
      dto as SaveDraftDto,
      organizerProfileId,
      universityId,
      status,
    );
    // console.log('[UT-M019-01] Input dto', dto);
    // console.log('[UT-M019-01] Input organizerProfileId:', organizerProfileId);
    // console.log('[UT-M019-01] Input universityId:', universityId);
    // console.log('[UT-M019-01] Input status:', status);
    // console.log('[UT-M019-01] Expected :', expectedCreatedEvent);
    // console.log('[UT-M019-01] Actual :', result);

    expect(result).toEqual(expectedCreatedEvent);
    expect(result.status).toBe(EventStatus.DRAFT);
    expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.create).toHaveBeenCalledWith({
      data: {
        organizerId: organizerProfileId,
        universityId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        location: dto.location,
        mapLink: dto.mapLink,
        isOnline: dto.isOnline,
        startAt: dto.startAt,
        endAt: dto.endAt,
        seatLimit: dto.seatLimit,
        hasCatering: dto.hasCatering,
        isCateringFree: dto.isCateringFree,
        cateringDescription: dto.cateringDescription,
        agenda: dto.agenda,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactLineId: dto.contactLineId,
        externalUrl: dto.externalUrl,
        remarks: dto.remarks,
        bannerUrl: dto.bannerUrl,
        status: EventStatus.DRAFT,
      },
    });
    expect(mockPrisma.event.update).not.toHaveBeenCalled();
  });

  it('UT-M019-02: should call prisma.event.create with publishedAt set and return created event when no eventId provided and status is PUBLISHED', async () => {
    const dto = { ...mockMarathonEventDto };
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.PUBLISHED;
    const expectedCreatedEvent = {
      ...mockMarathonDbEvent,
      status: EventStatus.PUBLISHED,
    };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockResolvedValueOnce(expectedCreatedEvent);

    const result = await service.saveEvent(
      dto as PublishEventDto,
      organizerProfileId,
      universityId,
      status,
    );
    // console.log('[UT-M019-02] Input dto:', dto);
    // console.log('[UT-M019-02] Input organizerProfileId:', organizerProfileId);
    // console.log('[UT-M019-02] Input universityId:', universityId);
    // console.log('[UT-M019-02] Expected :', expectedCreatedEvent);
    // console.log('[UT-M019-02] Actual :', result);

    expect(result).toEqual(expectedCreatedEvent);
    expect(result.status).toBe(EventStatus.PUBLISHED);
    expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: EventStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      }),
    });
    expect(mockPrisma.event.update).not.toHaveBeenCalled();
  });

  it('UT-M019-03: should call prisma.event.update with correct data and return updated event when eventId provided and status is DRAFT', async () => {
    const existingEventId = 'marathon-event-uuid-1234';
    const dto = { ...mockMarathonEventDto, eventId: existingEventId };
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.DRAFT;
    const expectedUpdatedEvent = {
      ...mockMarathonDbEvent,
      status: EventStatus.DRAFT,
      publishedAt: null,
    };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.update.mockResolvedValueOnce(expectedUpdatedEvent);

    const result = await service.saveEvent(
      dto as SaveDraftDto,
      organizerProfileId,
      universityId,
      status,
      existingEventId,
    );
    // console.log('[UT-M019-03] Input eventId:', existingEventId);
    // console.log('[UT-M019-03] Input status:', status);
    // console.log('[UT-M019-03] Input dto:', dto);
    // console.log('[UT-M019-03] Input organizerProfileId:', organizerProfileId);
    // console.log('[UT-M019-03] Expected result:', expectedUpdatedEvent);
    // console.log('[UT-M019-03] Actual result:', result);

    // Assert
    expect(result).toEqual(expectedUpdatedEvent);
    expect(result.status).toBe(EventStatus.DRAFT);
    expect(mockPrisma.event.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.update).toHaveBeenCalledWith({
      where: { id: existingEventId },
      data: {
        organizerId: organizerProfileId,
        universityId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        location: dto.location,
        mapLink: dto.mapLink,
        isOnline: dto.isOnline,
        startAt: dto.startAt,
        endAt: dto.endAt,
        seatLimit: dto.seatLimit,
        hasCatering: dto.hasCatering,
        isCateringFree: dto.isCateringFree,
        cateringDescription: dto.cateringDescription,
        agenda: dto.agenda,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactLineId: dto.contactLineId,
        externalUrl: dto.externalUrl,
        remarks: dto.remarks,
        bannerUrl: dto.bannerUrl,
        status: EventStatus.DRAFT,
      },
    });
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  it('UT-M019-04: should call prisma.event.update with publishedAt set and return updated event when eventId provided and status is PUBLISHED', async () => {
    const existingEventId = 'marathon-event-uuid-1234';
    const dto = { ...mockMarathonEventDto, eventId: existingEventId };
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.PUBLISHED;
    const expectedUpdatedEvent = {
      ...mockMarathonDbEvent,
      status: EventStatus.PUBLISHED,
    };
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.update.mockResolvedValueOnce(expectedUpdatedEvent);

    // Act
    const result = await service.saveEvent(
      dto as PublishEventDto,
      organizerProfileId,
      universityId,
      status,
      existingEventId,
    );
    // console.log('[UT-M019-04] Input eventId:', existingEventId);
    // console.log('[UT-M019-04] Input status:', status);
    // console.log('[UT-M019-04] Input dto:', dto);
    // console.log('[UT-M019-04] Input organizerProfileId:', organizerProfileId);
    // console.log('[UI-M019-04] UniversityId:', universityId);
    // console.log('[UT-M019-04] Expected result:', expectedUpdatedEvent);
    // console.log('[UT-M019-04] Actual result:', result);

    // Assert
    expect(result).toEqual(expectedUpdatedEvent);
    expect(mockPrisma.event.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.update).toHaveBeenCalledWith({
      where: { id: existingEventId },
      data: expect.objectContaining({
        status: EventStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      }),
    });
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  it('UT-M019-05: should throw SaveEventException when prisma.event.create fails', async () => {
    const dto = { ...mockMarathonEventDto };
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.DRAFT;
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.event.create.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.saveEvent(
        dto as SaveDraftDto,
        organizerProfileId,
        universityId,
        status,
      ),
    ).rejects.toThrow(SaveEventException);
    await expect(
      service.saveEvent(
        dto as SaveDraftDto,
        organizerProfileId,
        universityId,
        status,
      ),
    ).rejects.toThrow('Failed to save event. Please try again.');
  });

  it('UT-M019-06: should throw SaveEventException when prisma.event.update fails', async () => {
    const existingEventId = 'marathon-event-uuid-1234';
    const dto = { ...mockMarathonEventDto };
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.DRAFT;
    mockStorageService.resolveBannerUrl.mockReturnValue(dto.bannerUrl);
    mockPrisma.event.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    mockPrisma.event.update.mockRejectedValueOnce(
      new Error('DB connection failed'),
    );

    await expect(
      service.saveEvent(
        dto as SaveDraftDto,
        organizerProfileId,
        universityId,
        status,
        existingEventId,
      ),
    ).rejects.toThrow(SaveEventException);
    await expect(
      service.saveEvent(
        dto as SaveDraftDto,
        organizerProfileId,
        universityId,
        status,
        existingEventId,
      ),
    ).rejects.toThrow('Failed to save event. Please try again.');
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
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-MX001-01: should return all events ordered by createdAt desc when no status provided', async () => {
    const universityId = 'mock-university-uuid-1234';
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent2, mockEvent]);

    const result = await service.getEvents(universityId);
    // console.log('[UT-MX001-01] Input universityId:', universityId);
    // console.log('[UT-MX001-01] Input status: undefined');
    // console.log('[UT-MX001-01] Expected', [mockEvent2, mockEvent]);
    // console.log('[UT-MX001-01] Actual', result);

    expect(result).toEqual([mockEvent2, mockEvent]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { universityId },
      orderBy: { createdAt: 'desc' },
      include: { forms: { select: { id: true, type: true } } },
    });
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-MX001-02: should return only PUBLISHED events when single status PUBLISHED provided', async () => {
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.PUBLISHED;
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent]);

    const result = await service.getEvents(universityId, status);
    // console.log('[UT-MX001-02] Input universityId:', universityId, '| status:', status);
    // console.log('[UT-MX001-02] Expected result:', [mockEvent]);
    // console.log('[UT-MX001-02] Actual result:', result);

    expect(result).toEqual([mockEvent]);
    expect(result[0].status).toBe(EventStatus.PUBLISHED);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { universityId, status },
      orderBy: { createdAt: 'desc' },
      include: { forms: { select: { id: true, type: true } } },
    });
  });

  it('UT-MX001-03: should return only DRAFT events when single status DRAFT provided', async () => {
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.DRAFT;
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent2]);

    const result = await service.getEvents(universityId, status);
    // console.log('[UT-MX001-03] Input universityId:', universityId, '| status:', status);
    // console.log('[UT-MX001-03] Expected result', [mockEvent2]);
    // console.log('[UT-MX001-03] Actual result', result);

    expect(result).toEqual([mockEvent2]);
    expect(result[0].status).toBe(EventStatus.DRAFT);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { universityId, status },
      orderBy: { createdAt: 'desc' },
      include: { forms: { select: { id: true, type: true } } },
    });
  });

  it('UT-MX001-04: should return empty array when no events exist', async () => {
    const universityId = 'mock-university-uuid-1234';
    mockPrisma.event.findMany.mockResolvedValueOnce([]);

    const result = await service.getEvents(universityId);
    // console.log('[UT-MX001-04] Input universityId:', universityId, '| status: undefined');
    // console.log('[UT-MX001-04] Expected result:', []);
    // console.log('[UT-MX001-04] Actual result:', result);

    // Assert
    expect(result).toEqual([]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-MX001-05: should use filter and return matching events when array of statuses provided', async () => {
    const universityId = 'mock-university-uuid-1234';
    const status = [
      EventStatus.PUBLISHED,
      EventStatus.ONGOING,
      EventStatus.CONCLUDED,
    ];
    mockPrisma.event.findMany.mockResolvedValueOnce([mockEvent]);

    const result = await service.getEvents(universityId, status);
    // console.log('[UT-MX001-05] Input universityId:', universityId);
    // console.log('[UT-MX001-05] Input status array:', status);
    // console.log('[UT-MX001-05] Expected where.status:', JSON.stringify({ in: status }));
    // console.log('[UT-MX001-05] Expected result:', [mockEvent]);
    // console.log('[UT-MX001-05] Actual result:', result);

    // Assert
    expect(result).toEqual([mockEvent]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { universityId, status: { in: status } },
      orderBy: { createdAt: 'desc' },
      include: { forms: { select: { id: true, type: true } } },
    });
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
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M020-01: should return mapped EventResponseDto when event exists', async () => {
    const eventId = mockEvent.id;
    mockPrisma.event.findUnique.mockResolvedValueOnce(mockEvent);

    const result = await service.getEventById(eventId);
    // console.log('[UT-M020-01] Input eventId:', eventId);
    // console.log('[UT-M020-01] Expected: ', mockEvent);
    // console.log('[UT-M020-01] Actual', result);

    expect(result).toEqual(mockEvent);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      include: { forms: { select: { id: true, type: true } } },
    });
    expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-M020-02: should return event with forms array mapped correctly when event has forms', async () => {
    const eventId = mockEvent2.id;
    mockPrisma.event.findUnique.mockResolvedValueOnce(mockEvent2);

    const result = await service.getEventById(eventId);
    // console.log('[UT-M020-02] Input eventId:', eventId);
    // console.log('[UT-M020-02] Expected result:', mockEvent2);
    // console.log('[UT-M020-02] Actual result:', result);

    // Assert
    expect(result.forms).toEqual([{ id: 'form-uuid-1', type: 'REGISTRATION' }]);
  });

  it('UT-M020-03: should throw EventNotFoundException when event does not exist', async () => {
    const eventId = 'non-existent-uuid-9999';
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    const result = service.getEventById(eventId);
    await expect(result).rejects.toThrow(EventNotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      include: { forms: { select: { id: true, type: true } } },
    });
  });
});

describe('EventCrudService - getEventsByOrganizerId', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M021-01: should return all events for the organizer when no status filter provided', async () => {
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    mockPrisma.event.findMany.mockResolvedValueOnce([
      mockMarathonDbEvent,
      mockEvent,
    ]);

    const result = await service.getEventsByOrganizerId(
      organizerProfileId,
      universityId,
    );
    // console.log('[UT-M021-01] Input organizerProfileId:', organizerProfileId, '| universityId:', universityId);
    // console.log('[UT-M021-01] Expected result:', [mockMarathonDbEvent, mockEvent]);
    // console.log('[UT-M021-01] Actual result:', result);

    // Assert
    expect(result).toEqual([mockMarathonDbEvent, mockEvent]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { organizerId: organizerProfileId, universityId },
      orderBy: { createdAt: 'desc' },
      include: { forms: { select: { id: true, type: true } } },
    });
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M021-02: should return only events matching the given status when status filter provided', async () => {
    const organizerProfileId = 'mock-org-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.PUBLISHED;
    mockPrisma.event.findMany.mockResolvedValueOnce([mockMarathonDbEvent]);

    const result = await service.getEventsByOrganizerId(
      organizerProfileId,
      universityId,
      status,
    );
    // console.log('[UT-M021-02] Input organizerProfileId:', organizerProfileId, 'universityId:', universityId, '| status:', status);
    // console.log('[UT-M021-02] Expected result:', [mockMarathonDbEvent]);
    // console.log('[UT-M021-02] Actual result: ', result);

    expect(result).toEqual([mockMarathonDbEvent]);
    expect(result[0].status).toBe(EventStatus.PUBLISHED);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
      where: { organizerId: organizerProfileId, universityId, status },
      orderBy: { createdAt: 'desc' },
      include: { forms: { select: { id: true, type: true } } },
    });
  });

  it('UT-M021-03: should return empty array when organizer has no events', async () => {
    const organizerProfileId = 'mock-org-uuid-no-events';
    const universityId = 'mock-university-uuid-1234';
    mockPrisma.event.findMany.mockResolvedValueOnce([]);

    const result = await service.getEventsByOrganizerId(
      organizerProfileId,
      universityId,
    );
    // console.log('[UT-M021-03] Input organizerProfileId:', organizerProfileId);
    // console.log('[UT-M021-03] Input universityId:', universityId);
    // console.log('[UT-M021-03] Expected result:', []);
    // console.log('[UT-M021-03] Actual result:', result);

    // Assert
    expect(result).toEqual([]);
    expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('EventCrudService - getRegisteredEventsByParticipantId', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M022-01: should return registrations with nested event data when no status filter provided', async () => {
    const participantProfileId = 'mock-participant-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    mockPrisma.eventRegistration.findMany.mockResolvedValueOnce([
      mockMarathonRegistration,
    ]);

    const result = await service.getRegisteredEventsByParticipantId(
      participantProfileId,
      universityId,
    );
    // console.log('[UT-M022-01] Input participantProfileId:', participantProfileId, '| universityId:', universityId);
    // console.log('[UT-M022-01] Expected result:', [mockMarathonRegistration]);
    // console.log('[UT-M022-01] Actual result:', result);

    expect(result).toEqual([mockMarathonRegistration]);
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledWith({
      where: {
        participantId: participantProfileId,
        event: { universityId },
      },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M022-02: should filter by event status when status provided', async () => {
    const participantProfileId = 'mock-participant-uuid-1234';
    const universityId = 'mock-university-uuid-1234';
    const status = EventStatus.PUBLISHED;
    mockPrisma.eventRegistration.findMany.mockResolvedValueOnce([
      mockMarathonRegistration,
    ]);

    const result = await service.getRegisteredEventsByParticipantId(
      participantProfileId,
      universityId,
      status,
    );
    // console.log('[UT-M022-02] Input participantProfileId:', participantProfileId, '| status:', status);
    // console.log('[UT-M022-02] Input universityId:', universityId);
    // console.log('[UT-M022-02] Expected where.event.status:', status);
    // console.log('[UT-M022-02] Expected result: ', [mockMarathonRegistration]);
    // console.log('[UT-M022-02] Actual result: ', result);

    expect(result).toEqual([mockMarathonRegistration]);
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledWith({
      where: {
        participantId: participantProfileId,
        event: { universityId, status },
      },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('UT-M022-03: should return empty array when participant has no registrations', async () => {
    const participantProfileId = 'mock-participant-uuid-no-events';
    const universityId = 'mock-university-uuid-1234';
    mockPrisma.eventRegistration.findMany.mockResolvedValueOnce([]);

    const result = await service.getRegisteredEventsByParticipantId(
      participantProfileId,
      universityId,
    );
    // console.log('[UT-M022-03] Input participantProfileId:', participantProfileId);
    // console.log('[UT-M022-03] Input universityId:', universityId);
    // console.log('[UT-M022-03] Expected result:', []);
    // console.log('[UT-M022-03] Actual result:', result);

    // Assert
    expect(result).toEqual([]);
    expect(mockPrisma.eventRegistration.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('EventCrudService - getBannerUrl', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M023-01: should return banner URL string when event exists and has a banner', async () => {
    const eventId = 'marathon-event-uuid-1234';
    const mockBannerUrl = `${MOCK_SUPABASE_BASE_URL}/banners/marathon-uuid.jpg`;
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      bannerUrl: mockBannerUrl,
    });

    const result = await service.getBannerUrl(eventId);
    // console.log('[UT-M023-01] Input eventId:', eventId);
    // console.log('[UT-M023-01] Expected result:', mockBannerUrl);
    // console.log('[UT-M023-01] Actual result:', result);

    expect(result).toBe(mockBannerUrl);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      select: { bannerUrl: true },
    });
    expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-M023-02: should return null when event exists but bannerUrl is null', async () => {
    const eventId = 'marathon-event-uuid-1234';
    mockPrisma.event.findUnique.mockResolvedValueOnce({ bannerUrl: null });

    const result = await service.getBannerUrl(eventId);
    // console.log('[UT-M023-02] Input eventId:', eventId);
    // console.log('[UT-M023-02] Expected result:', null);
    // console.log('[UT-M023-02] Actual result:', result);

    expect(result).toBeNull();
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      select: { bannerUrl: true },
    });
  });

  it('UT-M023-03: should throw EventNotFoundException when event does not exist', async () => {
    const eventId = 'non-existent-uuid-9999';
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);

    const result = service.getBannerUrl(eventId);
    await expect(result).rejects.toThrow(EventNotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
    expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      select: { bannerUrl: true },
    });
  });
});

describe('EventCrudService - mapToEventResponseDto', () => {
  let service: EventCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCrudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventStorageService, useValue: mockStorageService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventCrudService>(EventCrudService);
    jest.clearAllMocks();
  });

  it('UT-M024-01: should return fully mapped EventResponseDto when full event object is provided', () => {
    const rawEvent = { ...mockMarathonDbEvent };

    const expectedDto = {
      id: rawEvent.id,
      organizerId: rawEvent.organizerId,
      universityId: rawEvent.universityId,
      title: rawEvent.title,
      description: rawEvent.description,
      category: rawEvent.category,
      location: rawEvent.location,
      mapLink: rawEvent.mapLink,
      isOnline: rawEvent.isOnline,
      startAt: rawEvent.startAt,
      endAt: rawEvent.endAt,
      seatLimit: rawEvent.seatLimit,
      hasCatering: rawEvent.hasCatering,
      isCateringFree: rawEvent.isCateringFree,
      cateringDescription: rawEvent.cateringDescription,
      agenda: rawEvent.agenda,
      contactName: rawEvent.contactName,
      contactEmail: rawEvent.contactEmail,
      contactPhone: rawEvent.contactPhone,
      contactLineId: rawEvent.contactLineId,
      externalUrl: rawEvent.externalUrl,
      remarks: rawEvent.remarks,
      bannerUrl: rawEvent.bannerUrl,
      status: rawEvent.status,
      publishedAt: rawEvent.publishedAt,
      createdAt: rawEvent.createdAt,
      updatedAt: rawEvent.updatedAt,
      forms: [{ id: 'mock-form-uuid-1', type: 'REGISTRATION' }],
    };

    const result = (service as any).mapToEventResponseDto(rawEvent);
    // console.log('[UT-M024-01] Input:', rawEvent);
    // console.log('[UT-M024-01] Expected result:', expectedDto);
    // console.log('[UT-M024-01] Actual result:', result);

    // Assert
    expect(result).toEqual(expectedDto);
  });

  it('UT-M024-02: should apply defaults for null optional fields', () => {
    const rawEvent = {
      ...mockMarathonDbEvent,
      mapLink: null,
      seatLimit: null,
      publishedAt: null,
      externalUrl: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      contactLineId: null,
      isOnline: null,
      hasCatering: null,
      isCateringFree: null,
      bannerUrl: null,
      category: null,
      agenda: null,
    };

    const expectedDto = {
      id: 'marathon-event-uuid-1234',
      organizerId: 'mock-org-uuid-1234',
      universityId: 'mock-university-uuid-1234',
      title: { en: 'CMU Marathon 2026', th: 'มาราธอน มช. 2026' },
      description: {
        en: 'Annual marathon event at Chiang Mai University open to all students and staff',
        th: 'งานมาราธอนประจำปีของมหาวิทยาลัยเชียงใหม่ เปิดรับนักศึกษาและบุคลากร',
      },
      category: [],
      location: { en: 'CMU Main Stadium', th: 'สนามกีฬากลาง มช.' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-12-01T23:00:00.000Z'),
      endAt: new Date('2026-12-02T05:00:00.000Z'),
      seatLimit: null,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: {
        en: 'Water and energy drinks provided at every checkpoint',
        th: 'มีน้ำและเครื่องดื่มชูกำลังที่ทุกจุด',
      },
      agenda: [],
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      externalUrl: '',
      remarks: {
        en: 'Bring your student ID and running shoes',
        th: 'นำบัตรนักศึกษาและรองเท้าวิ่งมาด้วย',
      },
      bannerUrl: '',
      status: 'PUBLISHED',
      publishedAt: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      forms: [{ id: 'mock-form-uuid-1', type: 'REGISTRATION' }],
    };

    const result = (service as any).mapToEventResponseDto(rawEvent);
    // console.log('[UT-M024-02] Input: ', rawEvent);
    // console.log('[UT-M024-02] Expected result: ', expectedDto);
    // console.log('[UT-M024-02] Actual result: ', result);

    expect(result.mapLink).toBe('');
    expect(result.seatLimit).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.externalUrl).toBe('');
    expect(result.contactName).toBe('');
    expect(result.contactEmail).toBe('');
    expect(result.contactPhone).toBe('');
    expect(result.contactLineId).toBe('');
    expect(result.isOnline).toBe(false);
    expect(result.hasCatering).toBe(false);
    expect(result.isCateringFree).toBe(false);
    expect(result.bannerUrl).toBe('');
    expect(result.category).toEqual([]);
    expect(result.agenda).toEqual([]);
  });

  it('UT-M024-03: should return empty forms array when event has no forms', () => {
    const rawEvent = { ...mockMarathonDbEvent, forms: [] };

    const expectedDto = {
      ...rawEvent,
    };
    const result = (service as any).mapToEventResponseDto(rawEvent);
    // console.log('[UT-M024-03] Input rawEvent:', rawEvent);
    // console.log('[UT-M024-03] Expected result', expectedDto);
    // console.log('[UT-M024-03] Actual result:', result);

    expect(result.forms).toEqual([]);
  });
});
