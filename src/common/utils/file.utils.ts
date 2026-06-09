import { InvalidImageException } from '../exceptions/invalid-image.exception';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(
  file: Express.Multer.File,
  allowedTypes: string[] = ALLOWED_IMAGE_TYPES,
  maxSize: number = MAX_IMAGE_SIZE,
): void {
  if (!file) {
    throw new InvalidImageException('No input file provided');
  }
  if (!allowedTypes.includes(file.mimetype)) {
    throw new InvalidImageException('Unsupported image format');
  }
  if (file.size > maxSize) {
    throw new InvalidImageException('File size must not exceed 5MB.');
  }
}
