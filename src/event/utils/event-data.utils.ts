import { Injectable } from '@nestjs/common';
import type { BilingualField } from '../dto/bilingual-field.dto';
import type { AgendaItem } from '../dto/agenda-item.dto';

@Injectable()
export class EventDataUtils {
  sanitizeBilingualField(
    field: BilingualField | null | undefined,
  ): BilingualField {
    if (!field) return { en: '', th: '' };
    return {
      en: typeof field.en === 'string' ? field.en.trim() : '',
      th: typeof field.th === 'string' ? field.th.trim() : '',
    };
  }

  sanitizeAgendaItems(agenda: AgendaItem[] | null | undefined): AgendaItem[] {
    if (!agenda || !Array.isArray(agenda)) return [];
    return agenda
      .map(
        (item): AgendaItem => ({
          time: typeof item.time === 'string' ? item.time.trim() : '',
          activity: this.sanitizeBilingualField(item.activity),
        }),
      )
      .filter(
        (item) =>
          item.time !== '' ||
          item.activity.en !== '' ||
          item.activity.th !== '',
      );
  }

  sanitizeDateRange(
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
}
