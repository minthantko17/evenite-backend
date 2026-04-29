import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventAiService } from './event-ai.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import { AiTranslationException } from '../exceptions/ai-translation.exception';
import { TranslateBilingualFieldsDto } from '../dto/translate-bilingual-fields.dto';

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

// Mock Data
const valid_all_field_present_image_file: Express.Multer.File = {
  buffer: Buffer.from('mock-image-bytes'),
  mimetype: 'image/jpeg',
  originalname: 'valid_image.jpeg',
  size: 1024,
  fieldname: 'image',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

const valid_some_field_missing_image_file: Express.Multer.File = {
  buffer: Buffer.from('mock-image-bytes'),
  mimetype: 'image/jpeg',
  originalname: 'valid_some_field_missing_image_file.jpeg',
  size: 1024,
  fieldname: 'image',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

const onlyEnDto: TranslateBilingualFieldsDto = {
  title: { en: 'Tech Conference', th: '' },
  description: { en: 'A great event', th: '' },
  location: { en: 'Bangkok', th: '' },
  cateringDescription: { en: 'Buffet', th: '' },
  remarks: { en: 'Bring ID', th: '' },
  agenda: [{ time: '09:00', activity: { en: 'Opening Ceremony', th: '' } }],
};

const onlyThDto: TranslateBilingualFieldsDto = {
  title: { en: '', th: 'การประชุมเทค' },
  description: { en: '', th: 'งานที่ยอดเยี่ยม' },
  location: { en: '', th: 'กรุงเทพ' },
  cateringDescription: { en: '', th: 'บุฟเฟ่ต์' },
  remarks: { en: '', th: 'นำบัตรประชาชน' },
  agenda: [{ time: '09:00', activity: { en: '', th: 'พิธีเปิด' } }],
};

const bothExistDto: TranslateBilingualFieldsDto = {
  title: { en: 'Tech Conference', th: 'การประชุมเทค' },
  description: { en: 'A great event', th: 'งานที่ยอดเยี่ยม' },
  location: { en: 'Bangkok', th: 'กรุงเทพ' },
  cateringDescription: { en: 'Buffet', th: 'บุฟเฟ่ต์' },
  remarks: { en: 'Bring ID', th: 'นำบัตรประชาชน' },
  agenda: [
    { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
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
  title: { en: 'Tech Conference', th: '' },
  description: { en: '', th: '' },
  location: { en: '', th: '' },
  cateringDescription: { en: '', th: '' },
  remarks: { en: '', th: '' },
  agenda: [],
};

// Mock Gemini Responses
const allFieldPresentGeminiResponse = {
  title: { en: 'CAMT Halloween Night', th: 'คืนฮาโลวีน CAMT' },
  description: { en: 'Join us for fun', th: 'มาร่วมสนุก' },
  category: ['PARTY'],
  location: { en: 'CAMT Building', th: 'อาคาร CAMT' },
  mapLink: 'https://maps.google.com/example',
  isOnline: false,
  startAt: '2026-10-31T10:30:00.000Z',
  endAt: '2026-10-31T14:30:00.000Z',
  seatLimit: 60,
  hasCatering: true,
  isCateringFree: true,
  cateringDescription: { en: 'Free snacks', th: 'ของว่างฟรี' },
  agenda: [
    { time: '10:30', activity: { en: 'Registration', th: 'ลงทะเบียน' } },
  ],
  contactName: 'Jane',
  contactEmail: 'jane@cmu.ac.th',
  contactPhone: '0987654321',
  contactLineId: 'jane.cmu',
  externalUrl: 'https://forms.gle/example',
  remarks: { en: 'Wear costume', th: 'แต่งชุดแฟนซี' },
};

const someFieldMissingGeminiResponse = {
  title: { en: 'CAMT Halloween Night', th: 'คืนฮาโลวีน CAMT' },
  description: { en: '', th: '' },
  category: [],
  location: { en: '', th: '' },
  mapLink: '',
  isOnline: false,
  seatLimit: 30,
  hasCatering: false,
  isCateringFree: false,
  cateringDescription: { en: '', th: '' },
  agenda: [],
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactLineId: '',
  externalUrl: '',
  remarks: { en: '', th: '' },
};

const translatedToThResponse = {
  title: { en: 'Tech Conference', th: 'การประชุมเทค' },
  description: { en: 'A great event', th: 'งานที่ยอดเยี่ยม' },
  location: { en: 'Bangkok', th: 'กรุงเทพ' },
  cateringDescription: { en: 'Buffet', th: 'บุฟเฟ่ต์' },
  remarks: { en: 'Bring ID', th: 'นำบัตรประชาชน' },
  agenda: [
    { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
  ],
};

const translatedToEnResponse = {
  title: { en: 'Tech Conference', th: 'การประชุมเทค' },
  description: { en: 'A great event', th: 'งานที่ยอดเยี่ยม' },
  location: { en: 'Bangkok', th: 'กรุงเทพ' },
  cateringDescription: { en: 'Buffet', th: 'บุฟเฟ่ต์' },
  remarks: { en: 'Bring ID', th: 'นำบัตรประชาชน' },
  agenda: [
    { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
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

  // UT-M038-01
  it('UT-M038-01: should return parsed JSON object when Gemini returns valid response with all fields', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(allFieldPresentGeminiResponse),
    });
    const result = await service.callGeminiWithImage(
      valid_all_field_present_image_file,
    );
    // console.log('Parsed Gemini Response:', result);
    expect(result).toEqual(allFieldPresentGeminiResponse);
  });

  // UT-M038-02
  it('UT-M038-02: should return parsed JSON with default values when Gemini returns response with missing optional fields', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(someFieldMissingGeminiResponse),
    });
    const result = await service.callGeminiWithImage(
      valid_some_field_missing_image_file,
    );

    expect(result).toEqual(someFieldMissingGeminiResponse);
    expect(result.description).toEqual({ en: '', th: '' });
    expect(result.category).toEqual([]);
    expect(result.seatLimit).toBe(30);
    expect(result.hasCatering).toBe(false);
    expect(result.agenda).toEqual([]);
  });

  // UT-M038-03
  it('UT-M038-03: should throw AiGenerationException when Gemini API call fails', async () => {
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

  // UT-M038-04
  it('UT-M038-04: should throw AiResponseParseException when Gemini returns malformed JSON', async () => {
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

  it('UT-M016-01: should return parsed JSON with th translated when only en exists', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(translatedToThResponse),
    });
    const result = await (service as any).callGeminiForTranslation(onlyEnDto);

    expect(result).toEqual(translatedToThResponse);
    expect(result.title.th).toBe('การประชุมเทค');
    expect(result.agenda[0].activity.th).toBe('พิธีเปิด');
  });

  it('UT-M016-02: should return parsed JSON with en translated when only th exists', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(translatedToEnResponse),
    });
    const result = await (service as any).callGeminiForTranslation(onlyThDto);

    expect(result).toEqual(translatedToEnResponse);
    expect(result.title.en).toBe('Tech Conference');
    expect(result.agenda[0].activity.en).toBe('Opening Ceremony');
  });

  // UT-M016-03 
  it('UT-M016-03: should return both fields unchanged when both en and th exist', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(bothExistDto),
    });
    const result = await (service as any).callGeminiForTranslation(
      bothExistDto,
    );

    expect(result).toEqual(bothExistDto);
    expect(result.title.en).toBe('Tech Conference');
    expect(result.title.th).toBe('การประชุมเทค');
  });

  // UT-M016-04
  it('UT-M016-04: should return both fields empty when both en and th are empty', async () => {
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

  // UT-M016-05
  it('UT-M016-05: should throw AiTranslationException when Gemini API call fails', async () => {
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

  // UT-M016-06
  it('UT-M016-06: should throw AiResponseParseException when Gemini returns malformed JSON', async () => {
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