import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventAiService } from './event-ai.service';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';
import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';

// Mock @google/genai 
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent, // controllable fake function
    },
  })),
}));

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
  agenda: [{ time: '10:30', activity: { en: 'Registration', th: 'ลงทะเบียน' } }],
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

// Test Suite
describe('EventAiService - callGeminiWithImage', () => {
  let service: EventAiService;

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

  beforeEach(async () => {
    // jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
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
    const result = await service.callGeminiWithImage(valid_all_field_present_image_file);
    // console.log('Parsed Gemini Response:', result);
    expect(result).toEqual(allFieldPresentGeminiResponse);
  });

  // UT-M038-02
  it('UT-M038-02: should return parsed JSON with default values when Gemini returns response with missing optional fields', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(someFieldMissingGeminiResponse),
    });
    const result = await service.callGeminiWithImage(valid_some_field_missing_image_file);

    expect(result).toEqual(someFieldMissingGeminiResponse);
    expect(result.description).toEqual({ en: '', th: '' });
    expect(result.category).toEqual([]);
    expect(result.seatLimit).toBe(30);
    expect(result.hasCatering).toBe(false);
    expect(result.agenda).toEqual([]);
  });

  // UT-M038-03
  it('UT-M038-03: should throw AiGenerationException when Gemini API call fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API connection failed'));
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file)
    ).rejects.toThrow(AiGenerationException);

    mockGenerateContent.mockRejectedValueOnce(new Error('API connection failed'));
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file)
    ).rejects.toThrow('There was an error in creating an event, try creating manually.');
  });

  // UT-M038-04
  it('UT-M038-04: should throw AiResponseParseException when Gemini returns malformed JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'this is not { valid } json !!!',
    });
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file)
    ).rejects.toThrow(AiResponseParseException);

    mockGenerateContent.mockResolvedValueOnce({
      text: 'this is not { valid } json !!!',
    });
    await expect(
      service.callGeminiWithImage(valid_all_field_present_image_file)
    ).rejects.toThrow('There was an error processing the AI response. Please try again.');
  });

});