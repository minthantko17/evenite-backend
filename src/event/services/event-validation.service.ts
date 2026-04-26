import { Injectable } from '@nestjs/common';
import { InvalidPromptException } from '../exceptions/invalid-prompt.exception';
import { InvalidImageException } from '../exceptions/invalid-image.exception';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../constants/event-category.constant';

@Injectable()
export class EventValidationService {
  validatePromptText(prompt: string): void {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
      throw new InvalidPromptException("Prompt field can't be empty");
    }

    // invalid if prompt doesn't contain any english or thai alphanumeric character
    if (!/[a-zA-Z0-9\u0E00-\u0E7F]/.test(trimmed)) {
      throw new InvalidPromptException('Invalid Input');
    }
  }

  validateImageFile(file: Express.Multer.File): void {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new InvalidImageException('Unsupported image format');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new InvalidImageException('File size must not exceed 5MB.');
    }
  }

  validateBannerFile(file: Express.Multer.File): void {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new InvalidImageException('Unsupported image format');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new InvalidImageException('File size must not exceed 5MB.');
    }
  }
}