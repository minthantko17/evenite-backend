import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiGenerationException } from '../exceptions/ai-generation.exception';
import { AiResponseParseException } from '../exceptions/ai-response-parse.exception';
import type { GeneratedEventDto } from '../dto/generated-event.dto';
import { ALLOWED_CATEGORIES, EventCategory } from '../constants/event-category.constant';
import { AgendaItem } from '../dto/agenda-item.dto';
import { BilingualField } from '../dto/bilingual-field.dto';

@Injectable()
export class EventAiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

  constructor() {
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
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      });
      responseText = result.response.text();
    } catch (error) {
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
