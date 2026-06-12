import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import Groq from 'groq-sdk';
import { EventDataUtils } from '../utils/event-data.utils';

import type { GeneratedEventDto } from '../dto/generated-event.dto';
import type { AgendaItem } from '../dto/agenda-item.dto';
import type { TranslateBilingualFieldsDto } from '../dto/translate-bilingual-fields.dto';

import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiTranslationException } from '../exceptions/ai-translation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import {
  ALLOWED_CATEGORIES,
  EventCategory,
} from '../constants/event-category.constant';
import { isValidUrl } from '../../common/utils/url.utils';

const EVENT_EXTRACTION_INSTRUCTION = `
    You are an expert event data extractor.
    Extract event details from the provided {INPUT_TYPE} and return a JSON object.

    CRITICAL INSTRUCTIONS:
    - Output STRICT JSON only.
      - For text fields, provide BOTH English ("en") and Thai ("th") translations.
      - If a specific piece of info is missing:
        - Use "" for string fields
        - Use false for boolean fields
        - Use [] for array fields
        - Omit datetime fields entirely if not found
        - Use 30 for seatLimit if not found
      - The event platform is based in Thailand (UTC+7, Asia/Bangkok)
      - Assume all times in the input are Bangkok time (UTC+7) unless explicitly stated otherwise
      - Convert all dates to UTC ISO 8601 format with 'Z' suffix
      - Example: 8:00 AM Bangkok time (UTC+7) = "2026-10-31T01:00:00.000Z"
      - NEVER use +07:00 or any other timezone offset

      JSON Structure:
      {
        "title": { "en": "...", "th": "..." },
        "description": { "en": "...", "th": "..." },
        "category": ["SEMINAR", "WORKSHOP", ...],
        "location": { "en": "...", "th": "..." },
        "mapLink": "...",
        "isOnline": false,
        "startAt": "2026-10-31T10:30:00.000Z",
        "endAt": "2026-10-31T14:30:00.000Z",
        "seatLimit": 0,
        "hasCatering": false,
        "isCateringFree": false,
        "cateringDescription": { "en": "...", "th": "..." },
        "agenda": [
          { "time": "09:00", "activity": { "en": "...", "th": "..." } }
        ],
        "contactName": "...",
        "contactEmail": "...",
        "contactPhone": "...",
        "contactLineId": "...",
        "externalUrl": "...",
        "remarks": { "en": "...", "th": "..." }
      }

      Allowed categories: SEMINAR, WORKSHOP, LECTURE, CONFERENCE, HACKATHON,
      COMPETITION, CLUB_ACTIVITY, ORIENTATION, VOLUNTEER, TRIP, SPORT,
      CULTURAL, FESTIVAL, NETWORKING, CAREER_FAIR, PARTY, INTERNSHIP, OTHER.
      Omit startAt and endAt fields entirely if they cannot be extracted.
`;

const TEXT_TO_EVENT_INSTRUCTION = EVENT_EXTRACTION_INSTRUCTION.replace(
  '{INPUT_TYPE}',
  'text',
);

const IMAGE_TO_EVENT_INSTRUCTION = EVENT_EXTRACTION_INSTRUCTION.replace(
  '{INPUT_TYPE}',
  'image',
);

const TRANSLATION_INSTRUCTION = `
    You are an expert English-Thai translator for event data.
    You will receive a JSON object containing bilingual fields.
    Each field has "en" (English) and "th" (Thai) values.

    TRANSLATION RULES — apply to every bilingual field:
    - If only "en" exists (th is empty "") → translate EN to TH, keep EN as is
    - If only "th" exists (en is empty "") → translate TH to EN, keep TH as is
    - If both exist (neither is empty) → return both unchanged
    - If both are empty → return both as ""

    For agenda items, apply the same rules to each item's "activity" field.
    The "time" field in agenda items should always be returned unchanged.

    Return STRICT JSON only, same structure as input.
`;

@Injectable()
export class EventAiService {
  private readonly logger = new Logger(EventAiService.name);
  private readonly googleGenAi: GoogleGenAI;
  private readonly zaiClient: OpenAI;
  private readonly groq: Groq;

  /** Model selection:
   * For gemini
   * - text generation: gemini-2.5-flash
   * - image generation: gemini-2.5-flash
   *
   * For zai
   * - text generation: glm-5-turbo or glm-4.7
   * - image generation: glm-4.6v
   *
   * For groq
   * - text generation: openai/gpt-oss-120b
   * - image generation: meta-llama/llama-4-scout-17b-16e-instruct
   */
  private readonly groqTextModel = 'openai/gpt-oss-120b';
  private readonly groqImageModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
  private readonly zaiTextModel = 'glm-5-turbo';
  private readonly zaiImageModel = 'glm-4.6v';

  constructor(private readonly utils: EventDataUtils) {
    this.googleGenAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY ?? '',
    });
    this.zaiClient = new OpenAI({
      apiKey: process.env.ZAI_API_KEY ?? '',
      baseURL: 'https://api.z.ai/api/coding/paas/v4/',
    });
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY ?? '',
    });
  }

  async generateEventFromPrompt(prompt: string): Promise<GeneratedEventDto> {
    const fullPrompt = `${TEXT_TO_EVENT_INSTRUCTION}\n\nEvent information:\n${prompt}`;
    this.logger.log('Sending prompt to AI:', fullPrompt);

    const rawResponse = await this.callAiWithFallback(fullPrompt, 'generation');
    const parsedResponse = this.parseJson(rawResponse);
    const mappedResponse = this.mapAiResponseToEventDto(parsedResponse);
    const sanitizedResponse = this.sanitizeAiEventResponse(mappedResponse);
    return sanitizedResponse;
  }

  async generateEventFromImage(
    file: Express.Multer.File,
  ): Promise<GeneratedEventDto> {
    this.logger.log('Sending image to AI');
    const rawResponse = await this.callAiWithFallback(
      IMAGE_TO_EVENT_INSTRUCTION,
      'generation',
      file,
    );
    const parsedResponse = this.parseJson(rawResponse);
    const mappedResponse = this.mapAiResponseToEventDto(parsedResponse);
    const sanitizedResponse = this.sanitizeAiEventResponse(mappedResponse);
    return sanitizedResponse;
  }

  async translateEventFields(
    originalDto: TranslateBilingualFieldsDto,
  ): Promise<TranslateBilingualFieldsDto> {
    const fullPrompt = `${TRANSLATION_INSTRUCTION}\n\nFields to translate:\n${JSON.stringify(originalDto, null, 2)}`;
    this.logger.log('Sending prompt to AI:', fullPrompt);

    const rawResponse = await this.callAiWithFallback(
      fullPrompt,
      'translation',
    );
    const parsedResponse = this.parseJson(rawResponse);
    return this.mapTranslationResponseToDto(parsedResponse, originalDto);
  }

  // --- ai calls ---

  protected async callAiWithFallback(
    prompt: string,
    context: 'generation' | 'translation',
    image?: Express.Multer.File,
  ): Promise<string> {
    const providers = [
      () => this.callGroq(prompt, image),
      () => this.callZai(prompt, image),
    ];

    for (const provider of providers) {
      try {
        return await provider();
      } catch (error) {
        this.logger.warn(
          `AI provider at index: ${providers.indexOf(provider)} failed, trying next...`,
        );
      }
    }

    if (context === 'translation') {
      this.logger.error('All AI providers failed for translation');
      throw new AiTranslationException(
        'There was an error translating the event fields. Please try again.',
      );
    }

    this.logger.error('All AI providers failed for event generation');
    throw new AiGenerationException(
      'There was an error in creating an event, try creating manually.',
    );
  }

  private async callGemini(
    prompt: string,
    image?: Express.Multer.File,
  ): Promise<string> {
    const model = 'gemini-2.5-flash';

    try {
      const parts: any[] = [{ text: prompt }];

      if (image) {
        const base64Image = image.buffer.toString('base64');
        parts.push({
          inlineData: {
            mimeType: image.mimetype,
            data: base64Image,
          },
        });
      }

      this.logger.log('Processing with Gemini...');
      const startAt = Date.now();
      const result = await this.googleGenAi.models.generateContent({
        model,
        contents: { role: 'user', parts },
        config: { responseMimeType: 'application/json' },
      });
      const latency = Date.now() - startAt;
      this.logger.log(`Gemini response received in ${latency}ms`);
      this.logger.log('Raw response from Gemini:', result);

      return result?.text ?? '';
    } catch (error) {
      this.logger.error('Gemini raw error:', error);
      throw new AiGenerationException(
        'There was an error in processing event with Gemini.',
      );
    }
  }

  private async callZai(
    prompt: string,
    image?: Express.Multer.File,
  ): Promise<string> {
    const model = image ? this.zaiImageModel : this.zaiTextModel;

    try {
      const content: any = image
        ? [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.mimetype};base64,${image.buffer.toString('base64')}`,
              },
            },
          ]
        : prompt;

      this.logger.log('Processing with Zai...');
      const startAt = Date.now();
      const result = await this.zaiClient.chat.completions.create({
        model,
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
      });
      const latency = Date.now() - startAt;
      this.logger.log(`Zai response received in ${latency}ms`);
      this.logger.log('Raw response from Zai:', result);

      return result?.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      this.logger.error('Zai raw error:', error);
      throw new AiGenerationException(
        'There was an error in processing event with Zai.',
      );
    }
  }

  private async callGroq(
    prompt: string,
    image?: Express.Multer.File,
  ): Promise<string> {
    const model = image ? this.groqImageModel : this.groqTextModel;

    try {
      const content: any = image
        ? [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.mimetype};base64,${image.buffer.toString('base64')}`,
              },
            },
          ]
        : prompt;

      this.logger.log('Processing with Groq...');
      const startAt = Date.now();
      const result = await this.groq.chat.completions.create({
        model,
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
      });
      const latency = Date.now() - startAt;
      this.logger.log(`Groq response received in ${latency}ms`);
      this.logger.log('Raw response from Groq:', result);

      return result?.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      this.logger.error('Groq raw error:', error);
      throw new AiGenerationException(
        'There was an error in processing event with Groq.',
      );
    }
  }

  // --- helpers ---

  private parseJson(text: string): Record<string, any> {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      throw new AiResponseParseException();
    }
  }

  mapAiResponseToEventDto(response: Record<string, any>): GeneratedEventDto {
    return {
      title: { en: response.title?.en ?? '', th: response.title?.th ?? '' },
      description: {
        en: response.description?.en ?? '',
        th: response.description?.th ?? '',
      },
      location: {
        en: response.location?.en ?? '',
        th: response.location?.th ?? '',
      },
      cateringDescription: {
        en: response.cateringDescription?.en ?? '',
        th: response.cateringDescription?.th ?? '',
      },
      remarks: {
        en: response.remarks?.en ?? '',
        th: response.remarks?.th ?? '',
      },
      agenda:
        Array.isArray(response.agenda) && response.agenda.length > 0
          ? response.agenda.map(
              (item: any): AgendaItem => ({
                time: item.time ?? '',
                activity: {
                  en: item.activity?.en ?? '',
                  th: item.activity?.th ?? '',
                },
              }),
            )
          : [],
      category: Array.isArray(response.category)
        ? response.category.filter((category: string) =>
            ALLOWED_CATEGORIES.includes(category as EventCategory),
          )
        : [],
      startAt: response.startAt ? new Date(response.startAt) : undefined,
      endAt: response.endAt ? new Date(response.endAt) : undefined,
      isOnline: response.isOnline ?? false,
      hasCatering: response.hasCatering ?? false,
      isCateringFree: response.isCateringFree ?? false,
      mapLink: response.mapLink ?? '',
      seatLimit: response.seatLimit ?? undefined,
      contactName: response.contactName ?? '',
      contactEmail: response.contactEmail ?? '',
      contactPhone: response.contactPhone ?? '',
      contactLineId: response.contactLineId ?? '',
      externalUrl: response.externalUrl ?? '',
    };
  }

  sanitizeAiEventResponse(dto: GeneratedEventDto): GeneratedEventDto {
    dto.title = this.utils.sanitizeBilingualField(dto.title);
    dto.description = this.utils.sanitizeBilingualField(dto.description);
    dto.location = this.utils.sanitizeBilingualField(dto.location);
    dto.cateringDescription = this.utils.sanitizeBilingualField(
      dto.cateringDescription,
    );
    dto.remarks = this.utils.sanitizeBilingualField(dto.remarks);
    dto.agenda = this.utils.sanitizeAgendaItems(dto.agenda);

    if (!Array.isArray(dto.category) || dto.category.length === 0) {
      dto.category = [];
    }

    const { startAt, endAt } = this.utils.sanitizeDateRange(
      dto.startAt,
      dto.endAt,
    );
    dto.startAt = startAt;
    dto.endAt = endAt;

    if (
      dto.seatLimit !== undefined &&
      (!Number.isInteger(dto.seatLimit) || dto.seatLimit <= 0)
    ) {
      dto.seatLimit = undefined;
    }

    if (dto.mapLink && !isValidUrl(dto.mapLink)) {
      dto.mapLink = '';
    }
    if (dto.externalUrl && !isValidUrl(dto.externalUrl)) {
      dto.externalUrl = '';
    }
    if (dto.contactEmail && !dto.contactEmail.includes('@')) {
      dto.contactEmail = '';
    }
    // this.logger.log('After sanitization:', dto);
    return dto;
  }

  private mapTranslationResponseToDto(
    response: Record<string, any>,
    original: TranslateBilingualFieldsDto,
  ): TranslateBilingualFieldsDto {
    return {
      title: {
        en: response.title?.en ?? original.title.en,
        th: response.title?.th ?? original.title.th,
      },
      description: {
        en: response.description?.en ?? original.description.en,
        th: response.description?.th ?? original.description.th,
      },
      location: {
        en: response.location?.en ?? original.location.en,
        th: response.location?.th ?? original.location.th,
      },
      cateringDescription: {
        en: response.cateringDescription?.en ?? original.cateringDescription.en,
        th: response.cateringDescription?.th ?? original.cateringDescription.th,
      },
      remarks: {
        en: response.remarks?.en ?? original.remarks.en,
        th: response.remarks?.th ?? original.remarks.th,
      },
      agenda:
        Array.isArray(response.agenda) && response.agenda.length > 0
          ? response.agenda.map((item: any, index: number) => ({
              time: item.time ?? original.agenda[index]?.time ?? '',
              activity: {
                en:
                  item.activity?.en ??
                  original.agenda[index]?.activity?.en ??
                  '',
                th:
                  item.activity?.th ??
                  original.agenda[index]?.activity?.th ??
                  '',
              },
            }))
          : original.agenda,
    };
  }
}
