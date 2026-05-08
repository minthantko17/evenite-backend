import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventAiService } from './event-ai.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import { AiTranslationException } from '../exceptions/ai-translation.exception';
import { TranslateBilingualFieldsDto } from '../dto/translate-bilingual-fields.dto';
import * as fs from 'fs';
import * as path from 'path';

const mockGenerateContent = jest.fn();
let service: EventAiService;

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent, // controllable fake function
    },
  })),
}));

const mockValidationService = {
  validatePromptText: jest.fn(),
  validateImageFile: jest.fn(),
  validateBannerFile: jest.fn(),
  validatePublishDateRange: jest.fn(),
};
const mockUtils = {
  sanitizeBilingualField: jest.fn((f) => f ?? { en: '', th: '' }),
  sanitizeAgendaItems: jest.fn((a) => a ?? []),
  sanitizeDateRange: jest.fn((s, e) => ({ startAt: s, endAt: e })),
  isValidUrl: jest.fn(() => true),
};

const fixturesPath = path.join(__dirname, '../../../test/fixtures/images');

const createMockImageFile = (
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

const valid_all_field_present_image_file: Express.Multer.File = createMockImageFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
  'image/jpeg',
  'small_image_jpg.jpg',
);

const valid_some_field_missing_image_file: Express.Multer.File = createMockImageFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_png.png')),
  'image/png',
  'small_image_png.png',
);

const onlyEnDto: TranslateBilingualFieldsDto = {
  title: { en: 'CAMT Study Trip to Bangkok', th: '' },
  description: {
    en: 'A study trip for CAMT students to visit tech companies in Bangkok',
    th: '',
  },
  location: { en: 'Bangkok, Thailand', th: '' },
  cateringDescription: { en: 'Lunch provided on day 1', th: '' },
  remarks: { en: 'Bring your student ID card', th: '' },
  agenda: [
    { time: '07:00', activity: { en: 'Depart from CMU', th: '' } },
    { time: '13:00', activity: { en: 'Visit SCB Tech X', th: '' } },
  ],
};

const onlyThDto: TranslateBilingualFieldsDto = {
  title: { en: '', th: 'งานกีฬาสี มหาวิทยาลัยเชียงใหม่' },
  description: {
    en: '',
    th: 'งานกีฬาสีประจำปีของมหาวิทยาลัยเชียงใหม่ พบกับการแข่งขันกีฬาหลากหลายประเภท',
  },
  location: { en: '', th: 'สนามกีฬากลาง มหาวิทยาลัยเชียงใหม่' },
  cateringDescription: { en: '', th: 'มีอาหารและเครื่องดื่มจำหน่ายภายในงาน' },
  remarks: { en: '', th: 'สวมเสื้อสีประจำคณะ' },
  agenda: [
    { time: '08:00', activity: { en: '', th: 'พิธีเปิดงานกีฬาสี' } },
    { time: '09:00', activity: { en: '', th: 'การแข่งขันกีฬา' } },
  ],
};

const bothExistDto: TranslateBilingualFieldsDto = {
  title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
  description: {
    en: 'Annual Halloween party for CAMT students',
    th: 'งานปาร์ตี้ฮาโลวีนประจำปีสำหรับนักศึกษา CAMT',
  },
  location: {
    en: 'CAMT Building, Chiang Mai University',
    th: 'อาคาร CAMT มหาวิทยาลัยเชียงใหม่',
  },
  cateringDescription: {
    en: 'Free snacks and drinks',
    th: 'ของว่างและเครื่องดื่มฟรี',
  },
  remarks: { en: 'Costume is encouraged', th: 'แนะนำให้แต่งชุดแฟนซี' },
  agenda: [
    { time: '18:00', activity: { en: 'Registration', th: 'ลงทะเบียน' } },
    {
      time: '19:00',
      activity: { en: 'Halloween Costume Contest', th: 'ประกวดชุดแฟนซี' },
    },
  ],
};

const bothEmptyDto: TranslateBilingualFieldsDto = {
  title: { en: '', th: '' },
  description: { en: '', th: '' },
  location: { en: '', th: '' },
  cateringDescription: { en: '', th: '' },
  remarks: { en: '', th: '' },
  agenda: [{ time: '09:00', activity: { en: '', th: '' } }],
};

const errorDto: TranslateBilingualFieldsDto = {
  title: { en: 'CAMT Study Trip to Bangkok', th: '' },
  description: { en: 'A study trip for CAMT students', th: '' },
  location: { en: 'Bangkok, Thailand', th: '' },
  cateringDescription: { en: '', th: '' },
  remarks: { en: '', th: '' },
  agenda: [],
};

// Mock Gemini Responses
const allFieldPresentGeminiResponse = {
  title: {
    en: 'SEED x CMU Trip to Chiang Rai',
    th: 'ทริปเชียงราย SEED x CMU',
  },
  description: {
    en: 'Join SEED and Chiang Mai University on a meaningful trip to Chiang Rai. Explore local culture, visit social enterprises, and contribute to community development.',
    th: 'ร่วมเดินทางกับ SEED และมหาวิทยาลัยเชียงใหม่ ไปยังจังหวัดเชียงราย เรียนรู้วัฒนธรรมท้องถิ่น เยี่ยมชมองค์กรเพื่อสังคม และร่วมพัฒนาชุมชน',
  },
  category: ['COMMUNITY', 'LEARNING', 'CULTURE'],
  location: {
    en: 'Chiang Rai Province, Thailand',
    th: 'จังหวัดเชียงราย ประเทศไทย',
  },
  mapLink: 'https://maps.app.goo.gl/8uX8z9kLw7fZp5z36',
  isOnline: false,
  startAt: '2025-06-07T00:00:00.000Z',
  endAt: '2025-06-08T11:00:00.000Z',
  seatLimit: 40,
  hasCatering: true,
  isCateringFree: false,
  cateringDescription: {
    en: '3 meals, snacks, and drinking water provided. Vegetarian options available.',
    th: 'มีอาหาร 3 มื้อ ของว่าง และน้ำดื่ม พร้อมตัวเลือกอาหารมังสวิรัติ',
  },
  agenda: [
    {
      time: '07:00',
      activity: {
        en: 'Meeting at CMU Main Entrance',
        th: 'พบกันที่ทางเข้าหลัก มช.',
      },
    },
    {
      time: '07:30',
      activity: { en: 'Departure to Chiang Rai', th: 'ออกเดินทางไปเชียงราย' },
    },
    {
      time: '11:00',
      activity: {
        en: 'Visit Doi Tung Development Project',
        th: 'เยี่ยมชมโครงการพัฒนาดอยตุง',
      },
    },
    { time: '12:30', activity: { en: 'Lunch', th: 'รับประทานอาหารกลางวัน' } },
    {
      time: '14:00',
      activity: {
        en: 'Community Service Activity',
        th: 'กิจกรรมจิตอาสาในชุมชน',
      },
    },
    {
      time: '17:30',
      activity: {
        en: 'Check-in & Free Time',
        th: 'เช็คอินและพักผ่อนตามอัธยาศัย',
      },
    },
    {
      time: '19:00',
      activity: {
        en: 'Dinner & Sharing Circle',
        th: 'รับประทานอาหารเย็นและแลกเปลี่ยนประสบการณ์',
      },
    },
    { time: '07:00', activity: { en: 'Breakfast', th: 'รับประทานอาหารเช้า' } },
    {
      time: '08:00',
      activity: {
        en: 'Visit Social Enterprise / Local Market',
        th: 'เยี่ยมชมกิจการเพื่อสังคมหรือตลาดท้องถิ่น',
      },
    },
    {
      time: '11:30',
      activity: {
        en: 'Reflection & Group Discussion',
        th: 'สะท้อนการเรียนรู้และอภิปรายกลุ่ม',
      },
    },
    { time: '12:30', activity: { en: 'Lunch', th: 'รับประทานอาหารกลางวัน' } },
    {
      time: '14:00',
      activity: {
        en: 'Visit Wat Rong Khun (White Temple)',
        th: 'เยี่ยมชมวัดร่องขุ่น',
      },
    },
    {
      time: '16:30',
      activity: { en: 'Departure to Chiang Mai', th: 'เดินทางกลับเชียงใหม่' },
    },
    {
      time: '18:00',
      activity: { en: 'Arrive at CMU', th: 'เดินทางถึงมหาวิทยาลัยเชียงใหม่' },
    },
  ],
  contactName: 'Kantaya (Nana)',
  contactEmail: 'seed.cmu@gmail.com',
  contactPhone: '0961234567',
  contactLineId: '@seedcmu',
  externalUrl: 'https://www.seedcmu.com',
  remarks: {
    en: 'Open to all CMU students. Please register in advance by 30 May 2025.',
    th: 'เปิดรับนักศึกษามหาวิทยาลัยเชียงใหม่ทุกคน กรุณาลงทะเบียนล่วงหน้าภายในวันที่ 30 พฤษภาคม 2568',
  },
};

const someFieldMissingGeminiResponse = {
  title: {
    en: 'Loy Krathong Workshop',
    th: 'เวิร์กช็อปลอยกระทง',
  },
  description: {
    en: 'Create your own Krathong at our workshop! Let your creativity flow with us.',
    th: 'สร้างกระทงของคุณเองที่เวิร์คช็อปของเรา! ปล่อยให้ความคิดสร้างสรรค์ของคุณไหลลื่นไปกับเรา',
  },
  category: ['WORKSHOP'],
  location: {
    en: 'VIP Room 1, Office of the University, CMU',
    th: 'ห้อง VIP 1 สำนักงานมหาวิทยาลัย มหาวิทยาลัยเชียงใหม่',
  },
  mapLink: '',
  isOnline: false,
  startAt: '2024-11-15T02:00:00.000Z',
  endAt: '2024-11-15T05:00:00.000Z',
  seatLimit: 30,
  hasCatering: false,
  isCateringFree: false,
  cateringDescription: {
    en: '',
    th: '',
  },
  agenda: [
    {
      time: '09:00',
      activity: {
        en: 'Registration',
        th: 'ลงทะเบียน',
      },
    },
    {
      time: '09:30',
      activity: {
        en: 'Opening Ceremony',
        th: 'พิธีเปิด',
      },
    },
    {
      time: '09:45',
      activity: {
        en: 'Krathong Workshop',
        th: 'เวิร์กช็อปทำกระทง',
      },
    },
    {
      time: '12:00',
      activity: {
        en: 'Evaluation',
        th: 'ประเมินผล',
      },
    },
  ],
  contactName: '',
  contactEmail: 'irdcmu@cmu.ac.th',
  contactPhone: '053-943661',
  contactLineId: '',
  externalUrl: '',
  remarks: {
    en: 'Please register by 14 November 2024, 04:00 PM.',
    th: 'กรุณาลงทะเบียนภายในวันที่ 14 พฤศจิกายน 2567 เวลา 16:00 น.',
  },
};

const translatedToThResponse = {
  title: {
    en: 'CAMT Study Trip to Bangkok',
    th: 'ทัศนศึกษา CAMT ที่กรุงเทพฯ',
  },
  description: {
    en: 'A study trip for CAMT students to visit tech companies in Bangkok',
    th: 'ทริปทัศนศึกษาสำหรับนักศึกษา CAMT เพื่อเยี่ยมชมบริษัทเทคโนโลยีในกรุงเทพฯ',
  },
  location: {
    en: 'Bangkok, Thailand',
    th: 'กรุงเทพฯ ประเทศไทย',
  },
  cateringDescription: {
    en: 'Lunch provided on day 1',
    th: 'มีอาหารกลางวันจัดให้ในวันที่ 1',
  },
  remarks: {
    en: 'Bring your student ID card',
    th: 'นำบัตรประจำตัวนักศึกษามาด้วย',
  },
  agenda: [
    {
      time: '07:00',
      activity: {
        en: 'Depart from CMU',
        th: 'ออกเดินทางจาก มช.',
      },
    },
    {
      time: '13:00',
      activity: {
        en: 'Visit SCB Tech X',
        th: 'เยี่ยมชม SCB Tech X',
      },
    },
  ],
};

const translatedToEnResponse = {
  title: {
    en: 'Chiang Mai University Sports Day',
    th: 'งานกีฬาสี มหาวิทยาลัยเชียงใหม่',
  },
  description: {
    en: 'Annual sports day of Chiang Mai University. Experience various sports competitions.',
    th: 'งานกีฬาสีประจำปีของมหาวิทยาลัยเชียงใหม่ พบกับการแข่งขันกีฬาหลากหลายประเภท',
  },
  location: {
    en: 'Chiang Mai University Main Stadium',
    th: 'สนามกีฬากลาง มหาวิทยาลัยเชียงใหม่',
  },
  cateringDescription: {
    en: 'Food and beverages available for sale at the event.',
    th: 'มีอาหารและเครื่องดื่มจำหน่ายภายในงาน',
  },
  remarks: {
    en: 'Wear faculty-specific color shirts.',
    th: 'สวมเสื้อสีประจำคณะ',
  },
  agenda: [
    {
      time: '08:00',
      activity: {
        en: 'Sports Day Opening Ceremony',
        th: 'พิธีเปิดงานกีฬาสี',
      },
    },
    {
      time: '09:00',
      activity: {
        en: 'Sports Competitions',
        th: 'การแข่งขันกีฬา',
      },
    },
  ],
};

// Test Suite
describe('EventAiService - callGeminiWithImage', () => {
  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAiService,
        // inject mock object instead of real service and utils
        { provide: EventValidationService, useValue: mockValidationService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventAiService>(EventAiService);

    // Reset all mock call counts and return values before each test
    // Without this, call counts would accumulate across tests
    jest.clearAllMocks();
  });

  it('UT-M023-01: should return parsed JSON object when Gemini returns valid response with all fields', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(allFieldPresentGeminiResponse),
    });
    const result = await service.callGeminiWithImage(
      valid_all_field_present_image_file,
    );
    // console.log('Parsed Gemini Response:', result);
    expect(result).toEqual(allFieldPresentGeminiResponse);
  });

  it('UT-M023-02: should return parsed JSON with default values when Gemini returns response with missing optional fields', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(someFieldMissingGeminiResponse),
    });
    const result = await service.callGeminiWithImage(
      valid_some_field_missing_image_file,
    );
    // console.log('Parsed Gemini Response with Missing Fields:', result);

    expect(result).toEqual(someFieldMissingGeminiResponse);
    expect(result.title).toEqual({
      en: 'Loy Krathong Workshop',
      th: 'เวิร์กช็อปลอยกระทง',
    });
    expect(result.mapLink).toBe("");
    expect(result.category).toEqual(["WORKSHOP"]);
    expect(result.seatLimit).toBe(30);
    expect(result.hasCatering).toBe(false);
  });

  // TODO: update test UT-M023-03 and UT-M023-04 to align as un-reporducible issue test plan.
  // (bad comment detected xD)
  it('UT-M023-03: should throw AiGenerationException when Gemini API call fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('API connection failed'),
    );
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file),
    ).rejects.toThrow(AiGenerationException);

    mockGenerateContent.mockRejectedValueOnce(
      new Error('API connection failed'),
    );
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file),
    ).rejects.toThrow(
      'There was an error in creating an event, try creating manually.',
    );
  });

  it('UT-M023-04: should throw AiResponseParseException when Gemini returns malformed JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'this is not { valid } json !!!',
    });
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file),
    ).rejects.toThrow(AiResponseParseException);

    mockGenerateContent.mockResolvedValueOnce({
      text: 'this is not { valid } json !!!',
    });
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file),
    ).rejects.toThrow(
      'There was an error processing the AI response. Please try again.',
    );
  });
});


describe('EventAiService - callGeminiForTranslation', () => {
  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAiService,
        { provide: EventValidationService, useValue: mockValidationService },
        { provide: EventDataUtils, useValue: mockUtils },
      ],
    }).compile();

    service = module.get<EventAiService>(EventAiService);
    jest.clearAllMocks();
  });

  it('UT-M011-01: should return parsed JSON with th translated when only en exists', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(translatedToThResponse),
    });
    const result = await (service as any).callGeminiForTranslation(onlyEnDto);

    expect(result).toEqual(translatedToThResponse);
    expect(result.title.th).toBe('ทัศนศึกษา CAMT ที่กรุงเทพฯ');
    expect(result.agenda[0].activity.th).toBe('ออกเดินทางจาก มช.');
  });

  it('UT-M011-02: should return parsed JSON with en translated when only th exists', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(translatedToEnResponse),
    });
    const result = await (service as any).callGeminiForTranslation(onlyThDto);

    expect(result).toEqual(translatedToEnResponse);
    expect(result.title.en).toBe('Chiang Mai University Sports Day');
    expect(result.agenda[0].activity.en).toBe('Sports Day Opening Ceremony');
  });

  it('UT-M011-03: should return both fields unchanged when both en and th exist', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(bothExistDto),
    });
    const result = await (service as any).callGeminiForTranslation(
      bothExistDto,
    );

    expect(result).toEqual(bothExistDto);
    expect(result.title.en).toBe('CAMT Halloween Night 2026');
    expect(result.title.th).toBe('คืนฮาโลวีน CAMT 2026');
  });

  it('UT-M011-04: should return both fields empty when both en and th are empty', async () => {
    // ARRANGE — Gemini returns both empty
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(bothEmptyDto),
    });
    const result = await (service as any).callGeminiForTranslation(
      bothEmptyDto,
    );

    expect(result).toEqual(bothEmptyDto);
    expect(result.title.en).toBe('');
    expect(result.title.th).toBe('');
  });

  // TODO: need to adjust this, since current tests are not able to reproduce error scenario
  it('UT-M011-05: should throw AiTranslationException when Gemini API call fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('API connection failed'),
    );
    await expect(
      (service as any).callGeminiForTranslation(errorDto),
    ).rejects.toThrow(AiTranslationException);

    mockGenerateContent.mockRejectedValueOnce(
      new Error('API connection failed'),
    );
    await expect(
      (service as any).callGeminiForTranslation(errorDto),
    ).rejects.toThrow(
      'There was an error translating the event fields. Please try again.',
    );
  });

  it('UT-M011-06: should throw AiResponseParseException when Gemini returns malformed JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'not valid json {{{',
    });
    await expect(
      (service as any).callGeminiForTranslation(errorDto),
    ).rejects.toThrow(AiResponseParseException);

    mockGenerateContent.mockResolvedValueOnce({
      text: 'not valid json {{{',
    });
    await expect(
      (service as any).callGeminiForTranslation(errorDto),
    ).rejects.toThrow(
      'There was an error processing the AI response. Please try again.',
    );
  });
});