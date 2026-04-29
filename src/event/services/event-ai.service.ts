import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { EventValidationService } from './event-validation.service';
import { EventDataUtils } from '../utils/event-data.utils';

import type { GeneratedEventDto } from '../dto/generated-event.dto';
import type { AgendaItem } from '../dto/agenda-item.dto';
import type { TranslateBilingualFieldsDto } from '../dto/translate-bilingual-fields.dto';

import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiTranslationException } from '../exceptions/ai-translation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import { ALLOWED_CATEGORIES, EventCategory } from '../constants/event-category.constant';

@Injectable()
export class EventAiService {
  private readonly logger = new Logger(EventAiService.name);
  private readonly ai: GoogleGenAI;
  private model: string = 'gemini-2.5-flash';

  constructor(
    private readonly eventValidationService: EventValidationService,
    private readonly utils: EventDataUtils,
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  }

  // --- generate from prompt ---
  // I am grandpa method, i got child, i got grandchild, now, test me if you can -.-
  async generateEventFromPrompt(prompt: string): Promise<GeneratedEventDto> {
    this.eventValidationService.validatePromptText(prompt);
    const parsed = await this.callGeminiWithPrompt(prompt);
    const mapped = this.mapAiResponseToEventDto(parsed);
    this.logger.log('After mapping: ', mapped);
    const sanitized = this.sanitizeAiEventResponse(mapped);
    this.logger.log('After sanitization: ', sanitized);
    return sanitized;
  } // I think this method will propagate / bubble up without explicit throw

  // make gemini api call from organizer+system prompt and get JSON event data.
  async callGeminiWithPrompt(prompt: string): Promise<Record<string, any>> {
    const systemInstruction = `
      You are an expert event data extractor.
      Extract event details from the provided text and return a JSON object.

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

    const fullPrompt = `${systemInstruction}\n\nEvent information:\n${prompt}`;
    let responseText: string;

    try {
      this.logger.log('Sending prompt to Gemini:', fullPrompt);
      const result = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      this.logger.log('Raw response from Gemini:', result);
      responseText = result?.text ?? '';
      this.logger.log('Response text from Gemini:', responseText);
    } catch (error) {
      this.logger.error('Gemini raw error:', error);
      throw new AiGenerationException();
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      throw new AiResponseParseException();
    }
  }

  mapAiResponseToEventDto(response: Record<string, any>): GeneratedEventDto {
    return {
      title: {
        en: response.title?.en ?? '',
        th: response.title?.th ?? '',
      },
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
        ? response.category.filter((c: string) =>
            ALLOWED_CATEGORIES.includes(c as EventCategory),
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

    const { startAt, endAt } = this.utils.sanitizeDateRange(dto.startAt, dto.endAt);
    dto.startAt = startAt;
    dto.endAt = endAt;

    if (
      dto.seatLimit !== undefined &&
      (!Number.isInteger(dto.seatLimit) || dto.seatLimit <= 0)
    ) {
      dto.seatLimit = undefined;
    }

    if (dto.mapLink && !this.utils.isValidUrl(dto.mapLink)) dto.mapLink = '';
    if (dto.externalUrl && !this.utils.isValidUrl(dto.externalUrl))
      dto.externalUrl = '';

    if (dto.contactEmail && !dto.contactEmail.includes('@')) {
      dto.contactEmail = '';
    }

    return dto;
  }


  // --- generate from image ---
  async generateEventFromImage(
    file: Express.Multer.File,
  ): Promise<GeneratedEventDto> {
    this.eventValidationService.validateImageFile(file);
    const parsed = await this.callGeminiWithImage(file);
    this.logger.log("Before mapping: ", parsed);
    const mapped = this.mapAiResponseToEventDto(parsed);
    this.logger.log('Mapped AI response before sanitization:', mapped);
    const sanitized = this.sanitizeAiEventResponse(mapped);
    this.logger.log('Sanitized AI response:', sanitized);
    return sanitized;
  }

  async callGeminiWithImage(
    file: Express.Multer.File,
  ): Promise<Record<string, any>> {
    const systemInstruction = `
      You are an expert event data extractor.
      Extract event details from the provided image and return a JSON object.

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

    const base64Image = file.buffer.toString('base64');
    let responseText: string;

    try {
      const result = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemInstruction },
              {
                inlineData: {
                  mimeType: file.mimetype,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      this.logger.log('Raw response from Gemini:', result);
      responseText = result?.text ?? '';
      this.logger.log('Response text from Gemini:', responseText);
    } catch (error) {
      this.logger.error('Gemini raw error:', error);
      throw new AiGenerationException();
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new AiResponseParseException();
    }
  }


  // --- translate ---
  async translateEventFields(
    originalDto: TranslateBilingualFieldsDto,
  ): Promise<TranslateBilingualFieldsDto> {
    const translatedJson = await this.callGeminiForTranslation(originalDto);
    return this.mapTranslationResponseToDto(translatedJson, originalDto);
  }

  private async callGeminiForTranslation(
    originalDto: TranslateBilingualFieldsDto,
  ): Promise<Record<string, any>> {
    const systemInstruction = `
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

    const fullPrompt = `${systemInstruction}\n\nFields to translate:\n${JSON.stringify(originalDto, null, 2)}`;
    let responseText: string;

    try {
      this.logger.log('Sending prompt to Gemini:', fullPrompt);
      const result = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      this.logger.log('Raw response from Gemini:', result);
      responseText = result?.text ?? '';
    } catch (error) {
      this.logger.error('Gemini raw error:', error);
      throw new AiTranslationException();
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      throw new AiResponseParseException();
    }
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
