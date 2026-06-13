import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventAiService } from './event-ai.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import { AiTranslationException } from '../exceptions/ai-translation.exception';
import { TranslateBilingualFieldsDto } from '../dto/translate-bilingual-fields.dto';
import type { GeneratedEventDto } from '../dto/generated-event.dto';
import * as urlUtils from '../../common/utils/url.utils';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: jest.fn() },
  })),
}));

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: jest.fn() } },
    })),
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: jest.fn() } },
    })),
  };
});

jest.mock('groq-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: jest.fn() } },
    })),
  };
});

const mockUtils = {
  sanitizeBilingualField: jest.fn((f) => f ?? { en: '', th: '' }),
  sanitizeAgendaItems: jest.fn((a) => a ?? []),
  sanitizeDateRange: jest.fn((s, e) => ({ startAt: s, endAt: e })),
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

const event_test_png = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'event_test.png')),
  'image/png',
  'event_test.png',
);

//  Mock AI responses
const emptyAiResponse: GeneratedEventDto = {
  title: { en: '', th: '' },
  description: { en: '', th: '' },
  category: [],
  location: { en: '', th: '' },
  cateringDescription: { en: '', th: '' },
  remarks: { en: '', th: '' },
  agenda: [],
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

const allFieldPresentAiResponse = {
  title: { en: 'CMU Marathon 2026', th: 'มาราธอน มช. 2026' },
  description: {
    en: 'Annual marathon event at Chiang Mai University open to all students and staff',
    th: 'งานมาราธอนประจำปีของมหาวิทยาลัยเชียงใหม่ เปิดรับนักศึกษาและบุคลากร',
  },
  category: ['SPORT'],
  location: { en: 'CMU Main Stadium', th: 'สนามกีฬากลาง มช.' },
  mapLink: 'https://maps.app.goo.gl/cmustadium',
  isOnline: false,
  startAt: '2026-12-01T23:00:00.000Z',
  endAt: '2026-12-02T05:00:00.000Z',
  seatLimit: 500,
  hasCatering: true,
  isCateringFree: true,
  cateringDescription: {
    en: 'Water and energy drinks provided at every checkpoint',
    th: 'มีน้ำและเครื่องดื่มชูกำลังที่ทุกจุด',
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
  contactName: 'CMU Sports Club',
  contactEmail: 'sports@cmu.ac.th',
  contactPhone: '053-943000',
  contactLineId: '@cmusports',
  externalUrl: 'https://reg.cmu.ac.th/marathon2026',
  remarks: {
    en: 'Bring your student ID and running shoes',
    th: 'นำบัตรนักศึกษาและรองเท้าวิ่งมาด้วย',
  },
};

const someFieldMissingAiResponse = {
  title: { en: 'CMU Marathon 2026', th: 'มาราธอน มช. 2026' },
  description: { en: 'Annual marathon event', th: 'งานมาราธอนประจำปี' },
  category: ['SPORT'],
  location: { en: 'CMU Main Stadium', th: 'สนามกีฬากลาง มช.' },
  mapLink: '',
  isOnline: false,
  startAt: '2026-12-01T23:00:00.000Z',
  endAt: '2026-12-02T05:00:00.000Z',
  seatLimit: 30,
  hasCatering: false,
  isCateringFree: false,
  cateringDescription: { en: '', th: '' },
  agenda: [],
  contactName: '',
  contactEmail: 'sports@cmu.ac.th',
  contactPhone: '',
  contactLineId: '',
  externalUrl: '',
  remarks: { en: '', th: '' },
};

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

const createMockGeneratedEventDto = (): GeneratedEventDto => ({
  title: { en: 'CAMT Workshop', th: 'เวิร์กช็อป CAMT' },
  description: { en: 'A workshop', th: 'เวิร์กช็อป' },
  location: { en: 'CAMT Building', th: 'อาคาร CAMT' },
  cateringDescription: { en: '', th: '' },
  remarks: { en: '', th: '' },
  agenda: [],
  category: ['WORKSHOP'],
  isOnline: false,
  hasCatering: false,
  isCateringFree: false,
  mapLink: 'https://maps.google.com',
  externalUrl: 'https://forms.gle/example',
  seatLimit: 30,
  contactName: 'Jane',
  contactEmail: 'jane@cmu.ac.th',
  contactPhone: '0987654321',
  contactLineId: 'jane.cmu',
  startAt: new Date('2026-10-31T09:00:00.000Z'),
  endAt: new Date('2026-10-31T12:00:00.000Z'),
});

//  Helper to build service
const buildModule = async (): Promise<TestingModule> =>
  Test.createTestingModule({
    providers: [
      EventAiService,
      { provide: EventDataUtils, useValue: mockUtils },
    ],
  }).compile();

describe('EventAiService - callAiWithFallback', () => {
  let service: EventAiService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const module = await buildModule();
    service = module.get<EventAiService>(EventAiService);
    jest.clearAllMocks();
  });

  it('UT-2-008-01: should return Groq response and not call Zai when Groq succeeds', async () => {
    const prompt = 'CMU Marathon 2026, 2 Dec 2026, CMU Stadium, 500 seats';
    const mockGroqResponse = JSON.stringify(allFieldPresentAiResponse);
    const groqSpy = jest
      .spyOn(service as any, 'callGroq')
      .mockResolvedValueOnce(mockGroqResponse);
    const zaiSpy = jest
      .spyOn(service as any, 'callZai')
      .mockResolvedValueOnce('should not be called');

    const result = await (service as any).callAiWithFallback(
      prompt,
      'generation',
    );
    // console.log('[UT-2-008-01] Input prompt:', prompt);
    // console.log('[UT-2-008-01] Input context: generation');
    // console.log('[UT-2-008-01] Expected result:', mockGroqResponse);
    // console.log('[UT-2-008-01] Actual result:', result);

    // Assert
    expect(result).toBe(mockGroqResponse);
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(zaiSpy).not.toHaveBeenCalled();
  });

  it('UT-2-008-02: should call Zai and return Zai response when Groq fails', async () => {
    const prompt = 'CMU Marathon 2026, 2 Dec 2026, CMU Stadium, 500 seats';
    const mockZaiResponse = JSON.stringify(allFieldPresentAiResponse);
    const groqSpy = jest
      .spyOn(service as any, 'callGroq')
      .mockRejectedValueOnce(new Error('Groq API unavailable'));
    const zaiSpy = jest
      .spyOn(service as any, 'callZai')
      .mockResolvedValueOnce(mockZaiResponse);

    const result = await (service as any).callAiWithFallback(
      prompt,
      'generation',
    );
    // console.log('[UT-2-008-02] Input prompt:', prompt);
    // console.log('[UT-2-008-02] Input context: generation');
    // console.log('[UT-2-008-02] Expected result:', mockZaiResponse);
    // console.log('[UT-2-008-02] Actual result:', result);

    expect(result).toBe(mockZaiResponse);
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(zaiSpy).toHaveBeenCalledTimes(1);
  });

  it('UT-2-008-03: should throw AiGenerationException when both Groq and Zai fail and context is generation', async () => {
    const prompt = 'CMU Marathon 2026, 2 Dec 2026, CMU Stadium, 500 seats';
    jest
      .spyOn(service as any, 'callGroq')
      .mockRejectedValueOnce(new Error('Groq API unavailable'))
      .mockRejectedValueOnce(new Error('Groq API unavailable'));
    jest
      .spyOn(service as any, 'callZai')
      .mockRejectedValueOnce(new Error('Zai API unavailable'))
      .mockRejectedValueOnce(new Error('Zai API unavailable'));

    await expect(
      (service as any).callAiWithFallback(prompt, 'generation'),
    ).rejects.toThrow(AiGenerationException);
    await expect(
      (service as any).callAiWithFallback(prompt, 'generation'),
    ).rejects.toThrow(
      'There was an error in creating an event, try creating manually.',
    );
  });

  it('UT-2-008-04: should throw AiTranslationException when both Groq and Zai fail and context is translation', async () => {
    const prompt = JSON.stringify(onlyEnDto);
    jest
      .spyOn(service as any, 'callGroq')
      .mockRejectedValueOnce(new Error('Groq API unavailable'))
      .mockRejectedValueOnce(new Error('Groq API unavailable'));
    jest
      .spyOn(service as any, 'callZai')
      .mockRejectedValueOnce(new Error('Zai API unavailable'))
      .mockRejectedValueOnce(new Error('Zai API unavailable'));

    await expect(
      (service as any).callAiWithFallback(prompt, 'translation'),
    ).rejects.toThrow(AiTranslationException);
    await expect(
      (service as any).callAiWithFallback(prompt, 'translation'),
    ).rejects.toThrow(
      'There was an error translating the event fields. Please try again.',
    );
  });

  it('UT-2-008-05: should forward image to callGroq when image is provided and Groq succeeds', async () => {
    const prompt = 'Extract event details from this image';
    const file = event_test_png; // mimetype: 'image/png'
    const mockGroqResponse = JSON.stringify(allFieldPresentAiResponse);
    const groqSpy = jest
      .spyOn(service as any, 'callGroq')
      .mockResolvedValueOnce(mockGroqResponse);
    const zaiSpy = jest
      .spyOn(service as any, 'callZai')
      .mockResolvedValueOnce('should not be called');

    const result = await (service as any).callAiWithFallback(
      prompt,
      'generation',
      file,
    );
    // console.log('[UT-2-008-05] Input file:', file.originalname, '| mimetype:', file.mimetype);
    // console.log('[UT-2-008-05] Input prompt:', prompt);
    // console.log('[UT-2-008-05] Input context: generation');
    // console.log('[UT-2-008-05] Expected: callGroq called with image, result:', mockGroqResponse);
    // console.log('[UT-2-008-05] Actual result:', result);

    expect(result).toBe(mockGroqResponse);
    expect(groqSpy).toHaveBeenCalledWith(prompt, file);
    expect(zaiSpy).not.toHaveBeenCalled();
  });

  it('UT-2-008-06: should forward image to callZai when image provided and Groq fails', async () => {
    const prompt = 'Extract event details from this image';
    const file = event_test_png;
    const mockZaiResponse = JSON.stringify(allFieldPresentAiResponse);
    const groqSpy = jest
      .spyOn(service as any, 'callGroq')
      .mockRejectedValueOnce(new Error('Groq API unavailable'));
    const zaiSpy = jest
      .spyOn(service as any, 'callZai')
      .mockResolvedValueOnce(mockZaiResponse);

    const result = await (service as any).callAiWithFallback(
      prompt,
      'generation',
      file,
    );
    // console.log('[UT-2-008-06] Input file:', file.originalname, '| mimetype:', file.mimetype);
    // console.log('[UT-2-008-06] Input context: generation');
    // console.log('[UT-2-008-06] Expected: callZai called with image, result:', mockZaiResponse);
    // console.log('[UT-2-008-06] Actual result:', result);

    expect(result).toBe(mockZaiResponse);
    expect(groqSpy).toHaveBeenCalledWith(prompt, file);
    expect(zaiSpy).toHaveBeenCalledWith(prompt, file);
  });
});

describe('EventAiService - parseJson', () => {
  let service: EventAiService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<EventAiService>(EventAiService);
    jest.clearAllMocks();
  });

  it('UT-2-009-01: should return parsed object when input is plain valid JSON string', () => {
    const input = JSON.stringify(allFieldPresentAiResponse);

    const result = (service as any).parseJson(input);
    // console.log('[UT-2-009-01] Input:', input);
    // console.log('[UT-2-009-01] Expected:', allFieldPresentAiResponse);
    // console.log('[UT-2-009-01] Actual:', result);

    expect(result).toEqual(allFieldPresentAiResponse);
  });

  it('UT-2-009-02: should strip json fences and return parsed object', () => {
    const input =
      '```json\n' + JSON.stringify(allFieldPresentAiResponse) + '\n```';

    const result = (service as any).parseJson(input);
    // console.log('[UT-2-009-02] Input:', input);
    // console.log('[UT-2-009-02] Expected:', allFieldPresentAiResponse);
    // console.log('[UT-2-009-02] Actual:', result);

    expect(result).toEqual(allFieldPresentAiResponse);
  });

  it('UT-2-009-03: should strip only fences with no language tag and return parsed object', () => {
    const input = '```\n' + JSON.stringify(allFieldPresentAiResponse) + '\n```';

    const result = (service as any).parseJson(input);
    // console.log('[UT-2-009-03] Input:', input);
    // console.log('[UT-2-009-03] Expected:', allFieldPresentAiResponse);
    // console.log('[UT-2-009-03] Actual:', result);

    expect(result).toEqual(allFieldPresentAiResponse);
  });

  it('UT-2-009-04: should throw AiResponseParseException when input is malformed JSON', () => {
    const input = 'this is not { valid } json !!!';

    expect(() => (service as any).parseJson(input)).toThrow(
      AiResponseParseException,
    );
    expect(() => (service as any).parseJson(input)).toThrow(
      'There was an error processing the AI response. Please try again.',
    );
  });

  it('UT-2-009-05: should throw AiResponseParseException when input is empty string', () => {
    const input = '';

    expect(() => (service as any).parseJson(input)).toThrow(
      AiResponseParseException,
    );
    expect(() => (service as any).parseJson(input)).toThrow(
      'There was an error processing the AI response. Please try again.',
    );
  });

  it('UT-2-009-06: should throw AiResponseParseException when input is only whitespace', () => {
    const input = '   ';

    expect(() => (service as any).parseJson(input)).toThrow(
      AiResponseParseException,
    );
    expect(() => (service as any).parseJson(input)).toThrow(
      'There was an error processing the AI response. Please try again.',
    );
  });
});

describe('EventAiService - mapAiResponseToEventDto', () => {
  let service: EventAiService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<EventAiService>(EventAiService);
    jest.clearAllMocks();
  });

  it('UT-2-010-01: should correctly map all fields when full valid response is provided', () => {
    const input = allFieldPresentAiResponse;
    const expected: GeneratedEventDto = {
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
          activity: {
            en: 'Assembly at Starting Point',
            th: 'รวมพลที่จุดสตาร์ท',
          },
        },
        {
          time: '06:00',
          activity: { en: 'Marathon Start', th: 'เริ่มการแข่งขัน' },
        },
        {
          time: '09:00',
          activity: { en: 'Award Ceremony', th: 'พิธีมอบรางวัล' },
        },
      ],
      category: ['SPORT'],
      startAt: new Date('2026-12-01T23:00:00.000Z'),
      endAt: new Date('2026-12-02T05:00:00.000Z'),
      isOnline: false,
      hasCatering: true,
      isCateringFree: true,
      mapLink: 'https://maps.app.goo.gl/cmustadium',
      seatLimit: 500,
      contactName: 'CMU Sports Club',
      contactEmail: 'sports@cmu.ac.th',
      contactPhone: '053-943000',
      contactLineId: '@cmusports',
      externalUrl: 'https://reg.cmu.ac.th/marathon2026',
    };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-01] Input:', input);
    // console.log('[UT-2-010-01] Expected result:', expected);
    // console.log('[UT-2-010-01] Actual result:', result );

    expect(result).toEqual(expected);
    expect(result.title).toEqual({
      en: 'CMU Marathon 2026',
      th: 'มาราธอน มช. 2026',
    });
    expect(result.description.en).toBe(
      'Annual marathon event at Chiang Mai University open to all students and staff',
    );
    expect(result.category).toEqual(['SPORT']);
    expect(result.isOnline).toBe(false);
    expect(result.hasCatering).toBe(true);
    expect(result.isCateringFree).toBe(true);
    expect(result.seatLimit).toBe(500);
    expect(result.startAt).toEqual(new Date('2026-12-01T23:00:00.000Z'));
    expect(result.endAt).toEqual(new Date('2026-12-02T05:00:00.000Z'));
    expect(result.contactName).toBe('CMU Sports Club');
    expect(result.contactEmail).toBe('sports@cmu.ac.th');
    expect(result.agenda).toHaveLength(3);
  });

  it('UT-2-010-02: should apply defaults for missing optional fields when partial response provided', () => {
    const input = someFieldMissingAiResponse;
    const expected: Partial<GeneratedEventDto> = {
      title: { en: 'CMU Marathon 2026', th: 'มาราธอน มช. 2026' },
      description: { en: 'Annual marathon event', th: 'งานมาราธอนประจำปี' },
      category: ['SPORT'],
      location: { en: 'CMU Main Stadium', th: 'สนามกีฬากลาง มช.' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-12-01T23:00:00.000Z'),
      endAt: new Date('2026-12-02T05:00:00.000Z'),
      seatLimit: 30,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: '',
      contactEmail: 'sports@cmu.ac.th',
      contactPhone: '',
      contactLineId: '',
      externalUrl: '',
      remarks: { en: '', th: '' },
    };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-02] Input :', input);
    // console.log('[UT-2-010-02] Expected : ', expected);
    // console.log('[UT-2-010-02] Actual result :', result);

    expect(result).toEqual(expected);
    expect(result.mapLink).toBe('');
    expect(result.contactName).toBe('');
    expect(result.contactLineId).toBe('');
    expect(result.externalUrl).toBe('');
    expect(result.agenda).toEqual([]);
    expect(result.cateringDescription).toEqual({ en: '', th: '' });
  });

  it('UT-2-010-03: should apply all defaults when response has no fields', () => {
    const input = {};
    const expected = { ...emptyAiResponse };
    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-03] Input:', input);
    // console.log('[UT-2-010-03] Expected:', expected);
    // console.log('[UT-2-010-03] Actual result:', result);

    expect(result).toEqual(expected);
    expect(result.title).toEqual({ en: '', th: '' });
    expect(result.description).toEqual({ en: '', th: '' });
    expect(result.location).toEqual({ en: '', th: '' });
    expect(result.cateringDescription).toEqual({ en: '', th: '' });
    expect(result.remarks).toEqual({ en: '', th: '' });
    expect(result.category).toEqual([]);
    expect(result.agenda).toEqual([]);
    expect(result.isOnline).toBe(false);
    expect(result.hasCatering).toBe(false);
    expect(result.isCateringFree).toBe(false);
    expect(result.mapLink).toBe('');
    expect(result.contactName).toBe('');
    expect(result.contactEmail).toBe('');
    expect(result.contactPhone).toBe('');
    expect(result.contactLineId).toBe('');
    expect(result.externalUrl).toBe('');
    expect(result.startAt).toBeUndefined();
    expect(result.endAt).toBeUndefined();
    expect(result.seatLimit).toBeUndefined();
  });

  it('UT-2-010-04: should default bilingual fields to empty string when en or th is missing', () => {
    const input = {
      title: { en: 'CMU Marathon 2026' },
      description: { th: 'งานมาราธอนประจำปี' },
    };
    const expected: GeneratedEventDto = {
      title: { en: 'CMU Marathon 2026', th: '' },
      description: { en: '', th: 'งานมาราธอนประจำปี' },
      category: [],
      location: { en: '', th: '' },
      cateringDescription: { en: '', th: '' },
      remarks: { en: '', th: '' },
      agenda: [],
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

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-04] Input:', input);
    // console.log('[UT-2-010-04] Expected:', expected);
    // console.log('[UT-2-010-04] Actual result:', result);

    expect(result).toEqual(expected);
    expect(result.title).toEqual({ en: 'CMU Marathon 2026', th: '' });
    expect(result.description).toEqual({ en: '', th: 'งานมาราธอนประจำปี' });
  });

  it('UT-2-010-05: should map valid agenda array to AgendaItem[]', () => {
    const input = {
      agenda: [
        {
          time: '05:00',
          activity: {
            en: 'Assembly at Starting Point',
            th: 'รวมพลที่จุดสตาร์ท',
          },
        },
        {
          time: '06:00',
          activity: { en: 'Marathon Start', th: 'เริ่มการแข่งขัน' },
        },
      ],
    };
    const expected: GeneratedEventDto = {
      title: { en: '', th: '' },
      description: { en: '', th: '' },
      category: [],
      location: { en: '', th: '' },
      cateringDescription: { en: '', th: '' },
      remarks: { en: '', th: '' },
      agenda: [
        {
          time: '05:00',
          activity: {
            en: 'Assembly at Starting Point',
            th: 'รวมพลที่จุดสตาร์ท',
          },
        },
        {
          time: '06:00',
          activity: { en: 'Marathon Start', th: 'เริ่มการแข่งขัน' },
        },
      ],
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

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-05] Input :', input);
    // console.log('[UT-2-010-05] Expected:', expected);
    // console.log('[UT-2-010-05] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.agenda).toEqual([
      {
        time: '05:00',
        activity: { en: 'Assembly at Starting Point', th: 'รวมพลที่จุดสตาร์ท' },
      },
      {
        time: '06:00',
        activity: { en: 'Marathon Start', th: 'เริ่มการแข่งขัน' },
      },
    ]);
  });

  it('UT-2-010-06: should return empty agenda when agenda is empty array', () => {
    const input = { agenda: [] };
    const expected = { ...emptyAiResponse, agenda: [] };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-06] Input :', input);
    // console.log('[UT-2-010-06] Expected :', expected);
    // console.log('[UT-2-010-06] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.agenda).toEqual([]);
  });

  it('UT-2-010-07: should return empty agenda when agenda is not an array', () => {
    const input = { agenda: 'Opening Ceremony will start at 5:00 AM' };
    const expected = { ...emptyAiResponse, agenda: [] };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-07] Input :', input);
    // console.log('[UT-2-010-07] Expected :', expected);
    // console.log('[UT-2-010-07] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.agenda).toEqual([]);
  });

  it('UT-2-010-08: should filter out invalid categories and keep only allowed ones', () => {
    const input = { category: ['SPORT', 'INVALID_CATEGORY', 'WORKSHOP'] };
    const expected = { ...emptyAiResponse, category: ['SPORT', 'WORKSHOP'] };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-08] Input :', input);
    // console.log('[UT-2-010-08] Expected :', expected);
    // console.log('[UT-2-010-08] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.category).toEqual(['SPORT', 'WORKSHOP']);
  });

  it('UT-2-010-09: should return empty category when category is not an array', () => {
    const input = { category: 'SPORT' };
    const expected = { ...emptyAiResponse, category: [] };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-09] Input :', input);
    // console.log('[UT-2-010-09] Expected :', expected);
    // console.log('[UT-2-010-09] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.category).toEqual([]);
  });

  it('UT-2-010-10: should convert valid startAt and endAt strings to Date objects', () => {
    const input = {
      startAt: '2026-12-01T23:00:00.000Z',
      endAt: '2026-12-02T05:00:00.000Z',
    };
    const expected = {
      ...emptyAiResponse,
      startAt: new Date('2026-12-01T23:00:00.000Z'),
      endAt: new Date('2026-12-02T05:00:00.000Z'),
    };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-10] Input :', input);
    // console.log('[UT-2-010-10] Expected :', expected);
    // console.log('[UT-2-010-10] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.startAt).toEqual(new Date('2026-12-01T23:00:00.000Z'));
    expect(result.endAt).toEqual(new Date('2026-12-02T05:00:00.000Z'));
  });

  it('UT-2-010-11: should set startAt and endAt to undefined when missing', () => {
    const input = {};
    const expected = {
      ...emptyAiResponse,
      startAt: undefined,
      endAt: undefined,
    };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-11] Input :', input);
    // console.log('[UT-2-010-11] Expected :', expected);
    // console.log('[UT-2-010-11] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.startAt).toBeUndefined();
    expect(result.endAt).toBeUndefined();
  });

  it('UT-2-010-12: should map seatLimit correctly when valid integer provided', () => {
    const input = { seatLimit: 500 };
    const expected = { ...emptyAiResponse, seatLimit: 500 };

    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-12] Input :', input);
    // console.log('[UT-2-010-12] Expected :', expected);
    // console.log('[UT-2-010-12] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBe(500);
  });

  it('UT-2-010-13: should set seatLimit to undefined when missing', () => {
    const input = {};
    const expected = { ...emptyAiResponse, seatLimit: undefined };
    const result = service.mapAiResponseToEventDto(input);
    // console.log('[UT-2-010-13] Input :', input);
    // console.log('[UT-2-010-13] Expected :', expected);
    // console.log('[UT-2-010-13] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBeUndefined();
  });
});

describe('EventAiService - sanitizeAiEventResponse', () => {
  let service: EventAiService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<EventAiService>(EventAiService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('UT-2-011-01: should return sanitized dto when all fields are valid', () => {
    const dto = createMockGeneratedEventDto();
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto };

    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-01] Input dto:', dto);
    // console.log('[UT-2-011-01] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-01] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBe(30);
    expect(result.mapLink).toBe('https://maps.google.com');
    expect(result.externalUrl).toBe('https://forms.gle/example');
    expect(result.contactEmail).toBe('jane@cmu.ac.th');
    expect(result.category).toEqual(['WORKSHOP']);
  });

  it('UT-2-011-02: should set seatLimit to undefined when seatLimit is 0', () => {
    const dto = { ...createMockGeneratedEventDto(), seatLimit: 0 };
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto, seatLimit: undefined };

    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-02] Input dto:', dto);
    // console.log('[UT-2-011-02] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-02] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBeUndefined();
  });

  it('UT-2-011-03: should set seatLimit to undefined when seatLimit is negative', () => {
    const dto = { ...createMockGeneratedEventDto(), seatLimit: -1 };
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto, seatLimit: undefined };

    // Act
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-03] Input dto:', dto);
    // console.log('[UT-2-011-03] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-03] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBeUndefined();
  });

  it('UT-2-011-04: should set seatLimit to undefined when seatLimit is a float', () => {
    const dto = { ...createMockGeneratedEventDto(), seatLimit: 30.5 };
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto, seatLimit: undefined };

    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-04] Input dto:', dto);
    // console.log('[UT-2-011-04] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-04] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBeUndefined();
  });

  it('UT-2-011-05: should set mapLink to "" when isValidUrl returns false for mapLink', () => {
    const dto = {
      ...createMockGeneratedEventDto(),
      mapLink: 'this-is-not-a-url',
    };
    jest.spyOn(urlUtils, 'isValidUrl').mockImplementation((url: string) => {
      if (url === 'this-is-not-a-url') return false;
      return true;
    });
    const expected = { ...dto, mapLink: '' };
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-05] Input dto:', dto);
    // console.log('[UT-2-011-05] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-05] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.mapLink).toBe('');
  });

  it('UT-2-011-06: should set externalUrl to "" when isValidUrl returns false for externalUrl', () => {
    const dto = {
      ...createMockGeneratedEventDto(),
      externalUrl: 'this-is-not-a-url',
    };
    jest.spyOn(urlUtils, 'isValidUrl').mockImplementation((url: string) => {
      if (url === 'this-is-not-a-url') return false;
      return true;
    });
    const expected = { ...dto, externalUrl: '' };

    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-06] Input dto:', dto);
    // console.log('[UT-2-011-06] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-06] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.externalUrl).toBe('');
  });

  it('UT-2-011-07: should set contactEmail to "" when contactEmail does not contain @', () => {
    const dto = {
      ...createMockGeneratedEventDto(),
      contactEmail: 'invalidemail',
    };
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto, contactEmail: '' };
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-07] Input dto:', dto);
    // console.log('[UT-2-011-07] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-07] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.contactEmail).toBe('');
  });

  it('UT-2-011-08: should set category to [] when category is empty array', () => {
    const dto = { ...createMockGeneratedEventDto(), category: [] };
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto, category: [] };
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-08] Input dto:', dto);
    // console.log('[UT-2-011-08] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-08] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.category).toEqual([]);
  });

  it('UT-2-011-09: should keep seatLimit when valid positive integer', () => {
    const dto = { ...createMockGeneratedEventDto(), seatLimit: 50 };
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto };
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-09] Input dto:', dto);
    // console.log('[UT-2-011-09] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-09] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.seatLimit).toBe(50);
  });

  it('UT-2-011-10: should keep mapLink when isValidUrl returns true', () => {
    const dto = createMockGeneratedEventDto();
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto };
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-10] Input dto:', dto);
    // console.log('[UT-2-011-10] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-10] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.mapLink).toBe('https://maps.google.com');
  });

  it('UT-2-011-11: should keep contactEmail when valid email containing @', () => {
    const dto = createMockGeneratedEventDto();
    jest.spyOn(urlUtils, 'isValidUrl').mockReturnValue(true);
    const expected = { ...dto };
    const result = service.sanitizeAiEventResponse(dto);
    // console.log('[UT-2-011-11] Input dto:', dto);
    // console.log('[UT-2-011-11] Expected sanitized dto:', expected);
    // console.log('[UT-2-011-11] Actual sanitized dto:', result);

    expect(result).toEqual(expected);
    expect(result.contactEmail).toBe('jane@cmu.ac.th');
  });
});

// mapTranslationResponseToDto (skipped)
