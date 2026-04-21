import { Injectable } from '@nestjs/common';
import { InvalidPromptException } from '../exceptions/invalid-prompt.exception';

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
}