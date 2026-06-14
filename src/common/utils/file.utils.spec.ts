import { validateImageFile } from '../../common/utils/file.utils';
import { InvalidImageException } from '../../common/exceptions/invalid-image.exception';
import * as fs from 'fs';
import * as path from 'path';

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

const exactly_5mb_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'small_image_jpg.jpg')),
  'image/jpeg',
  'exactly_5mb.jpg',
  5 * 1024 * 1024, // exactly 5,242,880 bytes — should pass
);

const large_image_file = createMockFile(
  fs.readFileSync(path.join(fixturesPath, 'large_image.jpg')),
  'image/jpeg',
  'large_image.jpg',
);


describe('validateImageFile', () => {

  it('UT-1-001-01: should not throw for valid JPEG file within size limit', () => {
    const file = small_jpg_file;
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('UT-1-001-02: should not throw for valid PNG file within size limit', () => {
    const file = small_png_file;
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('UT-1-001-03: should not throw for valid WEBP file within size limit', () => {
    const file = small_webp_file;
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('UT-1-001-04: should not throw for file size exactly at 5MB limit', () => {
    const file = exactly_5mb_file; // size = 5,242,880 bytes
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('UT-1-001-05: should throw InvalidImageException when file is null', () => {
    const file = null as any;

    expect(() => validateImageFile(file)).toThrow(InvalidImageException);
    expect(() => validateImageFile(file)).toThrow('No input file provided');
  });

  it('UT-1-001-06: should throw InvalidImageException when file is undefined', () => {
    const file = undefined as any;

    expect(() => validateImageFile(file)).toThrow(InvalidImageException);
    expect(() => validateImageFile(file)).toThrow('No input file provided');
  });

  it('UT-1-001-07: should throw InvalidImageException for unsupported GIF format', () => {
    const file = gif_file; // mimetype: 'image/gif'

    expect(() => validateImageFile(file)).toThrow(InvalidImageException);
    expect(() => validateImageFile(file)).toThrow('Unsupported image format');
  });

  it('UT-1-001-08: should throw InvalidImageException for file size is over 5MB', () => {
    const file = large_image_file;

    expect(() => validateImageFile(file)).toThrow(InvalidImageException);
    expect(() => validateImageFile(file)).toThrow(
      'File size must not exceed 5MB.',
    );
  });
});
