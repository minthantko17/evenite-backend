import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

import type { GeneratedEventDto } from '../dto/generated-event.dto';
import type { AgendaItem } from '../dto/agenda-item.dto';
import type { BilingualField } from '../dto/bilingual-field.dto';
import type { TranslateBilingualFieldsDto } from '../dto/translate-bilingual-fields.dto';

import { AiGenerationException } from '../exceptions/ai-generation.exception';

import { AiTranslationException } from '../exceptions/ai-translation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import { ALLOWED_CATEGORIES, EventCategory } from '../constants/event-category.constant';

@Injectable()
export class EventAiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

  constructor() {
    console.log(
      'GEMINI_API_KEY:',
      process.env.GEMINI_API_KEY ? 'loaded' : 'MISSING',
    );
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  // I am grandpa method, i got child, i got grandchild, now, test me if you can -.-
  async generateEventFromPrompt(prompt: string): Promise<GeneratedEventDto> {
    const parsed = await this.callGeminiWithPrompt(prompt);
    const mapped = this.mapAiResponseToEventDto(parsed);
    return this.sanitizeAiEventResponse(mapped);
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
      - Convert all dates to ISO 8601 with Bangkok timezone (e.g. 2026-10-31T17:30:00+07:00)

      JSON Structure:
      {
        "title": { "en": "...", "th": "..." },
        "description": { "en": "...", "th": "..." },
        "category": ["SEMINAR", "WORKSHOP", ...],
        "location": { "en": "...", "th": "..." },
        "mapLink": "...",
        "isOnline": false,
        "startAt": "2026-10-31T17:30:00",
        "endAt": "2026-10-31T17:30:00",
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
      console.log('Sending prompt to Gemini:', fullPrompt);
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      });
      console.log('Raw response from Gemini:', result);
      responseText = result.response.text();
    } catch (error) {
      console.error('Gemini raw error:', error);
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
    dto.title = this.sanitizeBilingualField(dto.title);
    dto.description = this.sanitizeBilingualField(dto.description);
    dto.location = this.sanitizeBilingualField(dto.location);
    dto.cateringDescription = this.sanitizeBilingualField(
      dto.cateringDescription,
    );
    dto.remarks = this.sanitizeBilingualField(dto.remarks);

    dto.agenda = this.sanitizeAgendaItems(dto.agenda);

    if (!Array.isArray(dto.category) || dto.category.length === 0) {
      dto.category = [];
    }

    const { startAt, endAt } = this.sanitizeDateRange(dto.startAt, dto.endAt);
    dto.startAt = startAt;
    dto.endAt = endAt;

    if (
      dto.seatLimit !== undefined &&
      (!Number.isInteger(dto.seatLimit) || dto.seatLimit <= 0)
    ) {
      dto.seatLimit = undefined;
    }

    if (dto.mapLink && !this.isValidUrl(dto.mapLink)) dto.mapLink = '';
    if (dto.externalUrl && !this.isValidUrl(dto.externalUrl))
      dto.externalUrl = '';

    if (dto.contactEmail && !dto.contactEmail.includes('@')) {
      dto.contactEmail = '';
    }

    return dto;
  }

  // -- translate --
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
      console.log('Sending prompt to Gemini:', fullPrompt);
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      });
      console.log('Raw response from Gemini:', result);
      responseText = result.response.text();
    } catch(error) {
      console.error('Gemini raw error:', error);
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
      agenda: Array.isArray(response.agenda) && response.agenda.length > 0
        ? response.agenda.map((item: any, index: number) => ({
            time: item.time ?? original.agenda[index]?.time ?? '',
            activity: {
              en:
                item.activity?.en ?? original.agenda[index]?.activity?.en ?? '',
              th:
                item.activity?.th ?? original.agenda[index]?.activity?.th ?? '',
            },
          }))
        : original.agenda,
    };
  }

  // -- private helpers --

  private sanitizeBilingualField(
    field: BilingualField | null | undefined,
  ): BilingualField {
    if (!field) return { en: '', th: '' };
    return {
      en:
        typeof field.en === 'string' && field.en.trim().length > 0
          ? field.en
          : '',
      th:
        typeof field.th === 'string' && field.th.trim().length > 0
          ? field.th
          : '',
    };
  }

  private sanitizeAgendaItems(
    agenda: AgendaItem[] | null | undefined,
  ): AgendaItem[] {
    if (!agenda || !Array.isArray(agenda)) return [];
    const sanitized = agenda
      .map(
        (item): AgendaItem => ({
          time:
            typeof item.time === 'string' && item.time.trim().length > 0
              ? item.time
              : '',
          activity: this.sanitizeBilingualField(item.activity),
        }),
      )
      .filter(
        (item) =>
          item.time !== '' ||
          item.activity.en !== '' ||
          item.activity.th !== '',
      );

    return sanitized;
  }

  private sanitizeDateRange(
    startAt: Date | undefined,
    endAt: Date | undefined,
  ): { startAt: Date | undefined; endAt: Date | undefined } {
    const startValid = startAt instanceof Date && !isNaN(startAt.getTime());
    const endValid = endAt instanceof Date && !isNaN(endAt.getTime());
    if (!startValid) {
      return { startAt: undefined, endAt: undefined };
    }
    if (!endValid) {
      return { startAt, endAt: undefined };
    }
    if (startAt >= endAt) {
      return { startAt, endAt: undefined };
    }

    return { startAt, endAt };
  }

  // check by creating URL object, instead of checking with regex
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
