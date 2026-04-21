import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventValidationService } from './services/event-validation.service';
import { EventAiService } from './services/event-ai.service';

@Injectable()
export class EventService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventValidationService: EventValidationService,
    private readonly eventAiService: EventAiService,
  ) {}
}