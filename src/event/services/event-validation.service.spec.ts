import { Test, TestingModule } from '@nestjs/testing';
import { EventValidationService } from './event-validation.service';
import { InvalidPromptException } from '../exceptions/invalid-prompt.exception';
import { InvalidImageException } from '../exceptions/invalid-image.exception';
import { InvalidDateRangeException } from '../exceptions/invalid-date-range.exception';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

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

const mockPrisma = {
  event: {
    findUnique: jest.fn(),
  },
};

// mock data files
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

const gif_file = createMockFile(
    fs.readFileSync(path.join(fixturesPath, 'christmas_party.gif')),
    'image/gif',
    'christmas_party.gif',
);

const exact_5mb_file = createMockFile(
    fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
    'image/jpeg',
    'small_image_jpg.jpg',
    5 * 1024 * 1024,
)

const large_image_file = createMockFile(
    fs.readFileSync(path.join(fixturesPath, 'large_image.jpg')),
    'image/jpeg',
    'large_image.jpg',
);


describe('EventValidationService - validatePromptText', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-M001-01: should not throw for valid English prompt', () => {
    expect(() =>
      service.validatePromptText('Workshop on Machine Learning'),
    ).not.toThrow();
  });

  it('UT-M001-02: should not throw for valid Thai prompt', () => {
    expect(() =>
      service.validatePromptText('งานกีฬาสี มหาวิทยาลัยเชียงใหม่'),
    ).not.toThrow();
  });

  it('UT-M001-03: should not throw for valid mixed Thai and English prompt', () => {
    expect(() =>
      service.validatePromptText('CAMT วิศวกรรมซอฟต์แวร์ Workshop'),
    ).not.toThrow();
  });

  it('UT-M001-04: should not throw for valid prompt mixed with symbols', () => {
    expect(() =>
      service.validatePromptText('!!! CAMT Halloween Night 2026 @@@'),
    ).not.toThrow();
  });

  it('UT-M001-05: should not throw for numbers only', () => {
    expect(() => service.validatePromptText('12345')).not.toThrow();
  });

  it('UT-M001-06: should not throw for whitespace padded valid prompt', () => {
    expect(() =>
      service.validatePromptText('   CAMT Study Trip   '),
    ).not.toThrow();
  });

  it('UT-M001-07: should throw InvalidPromptException for empty string', () => {
    expect(() => service.validatePromptText('')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('')).toThrow(
      "Prompt field can't be empty",
    );
  });

  it('UT-M001-08: should throw InvalidPromptException for whitespace only', () => {
    expect(() => service.validatePromptText('     ')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('     ')).toThrow(
      "Prompt field can't be empty",
    );
  });

  it('UT-M001-09: should throw InvalidPromptException for symbols only', () => {
    expect(() => service.validatePromptText('@#$%^&*!')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('@#$%^&*!')).toThrow(
      'Invalid Input',
    );
  });
});

describe('EventValidationService - validateImageFile', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-M013-01: should not throw for valid JPEG file', () => {
    expect(() => service.validateImageFile(small_jpg_file)).not.toThrow();
  });

  it('UT-M013-02: should not throw for valid PNG file', () => {
    expect(() => service.validateImageFile(small_png_file)).not.toThrow();
  });

  it('UT-M013-03: should not throw for valid WEBP file', () => {
    expect(() => service.validateImageFile(small_webp_file)).not.toThrow();
  });

  it('UT-M013-05: should not throw for file size exactly 5MB', () => {
    expect(() => service.validateImageFile(exact_5mb_file)).not.toThrow();
  });

  it('UT-M013-04: should throw InvalidImageException for unsupported format GIF', () => {
    expect(() => service.validateImageFile(gif_file)).toThrow(InvalidImageException);
    expect(() => service.validateImageFile(gif_file)).toThrow('Unsupported image format');
  });

  it('UT-M013-06: should throw InvalidImageException for file exceeding 5MB', () => {
    expect(() => service.validateImageFile(large_image_file)).toThrow(InvalidImageException);
    expect(() => service.validateImageFile(large_image_file)).toThrow('File size must not exceed 5MB.');
  });
  
  it('UT-M013-00: should throw InvalidImageException when no file is provided', () => {
    expect(() => service.validateImageFile(null as any)).toThrow(
      InvalidImageException,
    );
    expect(() => service.validateImageFile(null as any)).toThrow(
      'No input file provided',
    );

    expect(() => service.validateImageFile(undefined as any)).toThrow(
      InvalidImageException,
    );
    expect(() => service.validateImageFile(undefined as any)).toThrow(
      'No input file provided',
    );
  });
});

describe('EventValidationService - validatePublishDateRange', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
    jest.clearAllMocks();
  });

  it('UT-M018-01: should not throw when startAt is before endAt', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(() =>
      service.validatePublishDateRange(startAt, endAt),
    ).not.toThrow();
  });

  it('UT-M018-02: should throw InvalidDateRangeException when startAt equals endAt', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      InvalidDateRangeException,
    );
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      'Start date must be before end date.',
    );
  });

  it('UT-M018-03: should throw InvalidDateRangeException when startAt is after endAt', () => {
    const startAt = new Date('2026-10-31T12:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      InvalidDateRangeException,
    );
    expect(() => service.validatePublishDateRange(startAt, endAt)).toThrow(
      'Start date must be before end date.',
    );
  });
});
