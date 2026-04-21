import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InvalidPromptException } from './exceptions/invalid-prompt.exception';

@Injectable()
export class EventService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

  constructor(private readonly prisma: PrismaService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }


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