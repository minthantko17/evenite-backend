import { BadRequestException } from '@nestjs/common';

export class InvalidPromptException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Invalid prompt provided.');
  }
}