import { EventDataUtils } from '../utils/event-data.utils';
import type { AgendaItem } from '../dto/agenda-item.dto';

describe('EventDataUtils - sanitizeBilingualField', () => {
  let utils: EventDataUtils;

  beforeEach(() => {
    utils = new EventDataUtils();
  });

  it('UT-M006-01: should return both trimmed when both en and th have data', () => {
    expect(
      utils.sanitizeBilingualField({
        en: '  CAMT Workshop  ',
        th: '  เวิร์กช็อป CAMT  ',
      }),
    ).toEqual({ en: 'CAMT Workshop', th: 'เวิร์กช็อป CAMT' });
  });

  it('UT-M006-02: should return { en: "", th: "" } when both are empty strings', () => {
    expect(utils.sanitizeBilingualField({ en: '', th: '' })).toEqual({
      en: '',
      th: '',
    });
  });

  it('UT-M006-03: should return { en: "", th: "" } when both are whitespace only', () => {
    expect(utils.sanitizeBilingualField({ en: '   ', th: '   ' })).toEqual({
      en: '',
      th: '',
    });
  });

  it('UT-M006-04: should return { en: "", th: "" } when both values are null', () => {
    expect(
      utils.sanitizeBilingualField({ en: null as any, th: null as any }),
    ).toEqual({ en: '', th: '' });
  });

  it('UT-M006-05: should return { en: "", th: "" } when both values are undefined', () => {
    expect(
      utils.sanitizeBilingualField({
        en: undefined as any,
        th: undefined as any,
      }),
    ).toEqual({ en: '', th: '' });
  });

  it('UT-M006-06: should return en trimmed and th as "" when th is whitespace only', () => {
    expect(
      utils.sanitizeBilingualField({ en: '  CAMT Workshop  ', th: '   ' }),
    ).toEqual({ en: 'CAMT Workshop', th: '' });
  });

  it('UT-M006-07: should return th trimmed and en as "" when en is whitespace only', () => {
    expect(
      utils.sanitizeBilingualField({ en: '   ', th: '  เวิร์กช็อป CAMT  ' }),
    ).toEqual({ en: '', th: 'เวิร์กช็อป CAMT' });
  });

  it('UT-M006-08: should return en as "" when en is a number', () => {
    expect(
      utils.sanitizeBilingualField({ en: 123 as any, th: 'เวิร์กช็อป CAMT' }),
    ).toEqual({ en: '', th: 'เวิร์กช็อป CAMT' });
  });

  it('UT-M006-09: should return th as "" when th is a boolean', () => {
    expect(
      utils.sanitizeBilingualField({ en: 'CAMT Workshop', th: false as any }),
    ).toEqual({ en: 'CAMT Workshop', th: '' });
  });

  it('UT-M006-10: should return { en: "", th: "" } when input is null', () => {
    expect(utils.sanitizeBilingualField(null)).toEqual({ en: '', th: '' });
  });

  it('UT-M006-11: should return { en: "", th: "" } when input is undefined', () => {
    expect(utils.sanitizeBilingualField(undefined)).toEqual({ en: '', th: '' });
  });

  it('UT-M006-12: should return en trimmed and th as "" when only en key is present', () => {
    expect(
      utils.sanitizeBilingualField({ en: '  CAMT Workshop  ' } as any),
    ).toEqual({ en: 'CAMT Workshop', th: '' });
  });

  it('UT-M006-13: should return th trimmed and en as "" when only th key is present', () => {
    expect(
      utils.sanitizeBilingualField({ th: '  เวิร์กช็อป CAMT  ' } as any),
    ).toEqual({ en: '', th: 'เวิร์กช็อป CAMT' });
  });
});

describe('EventDataUtils - sanitizeAgendaItems', () => {
  let utils: EventDataUtils;

  beforeEach(() => {
    utils = new EventDataUtils();
  });

  it('UT-M007-01: should keep item and return trimmed values when time and both activity languages are valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        {
          time: '  09:00  ',
          activity: { en: '  Opening Ceremony  ', th: '  พิธีเปิด  ' },
        },
      ]),
    ).toEqual([
      { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-02: should keep item when time is valid and only en activity has data', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: 'Opening Ceremony', th: '' } },
      ]),
    ).toEqual([
      { time: '09:00', activity: { en: 'Opening Ceremony', th: '' } },
    ]);
  });

  it('UT-M007-03: should keep item when time is valid and only th activity has data', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: '', th: 'พิธีเปิด' } },
      ]),
    ).toEqual([{ time: '09:00', activity: { en: '', th: 'พิธีเปิด' } }]);
  });

  it('UT-M007-04: should keep item when time is valid and both activity languages are empty', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: '', th: '' } },
      ]),
    ).toEqual([{ time: '09:00', activity: { en: '', th: '' } }]);
  });

  it('UT-M007-05: should keep item with default activity when time is valid and activity field is missing', () => {
    expect(
        utils.sanitizeAgendaItems([{ time: '09:00' }] as any)
    ).toEqual([
      { time: '09:00', activity: { en: '', th: '' } },
    ]);
  });

  it('UT-M007-06: should keep item when time is empty and both activity languages are valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
      ]),
    ).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-07: should keep item when time is undefined and only en activity has data', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: undefined as any, activity: { en: 'Opening Ceremony', th: '' } },
      ]),
    ).toEqual([{ time: '', activity: { en: 'Opening Ceremony', th: '' } }]);
  });

  it('UT-M007-08: should keep item and trim time to "" when time is whitespace and activity is valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '   ', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
      ]),
    ).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-09: should keep item and set time to "" when time is null and activity is valid', () => {
    const input = [
      { time: null, activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ] as any;
    expect(utils.sanitizeAgendaItems(input)).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-10: should keep item and set time to "" when time is a number and activity is valid', () => {
    const input = [
      { time: 900, activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ] as any;
    expect(utils.sanitizeAgendaItems(input)).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-11: should keep item when time is free text and activity is valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        {
          time: 'Morning Session',
          activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' },
        },
      ]),
    ).toEqual([
      {
        time: 'Morning Session',
        activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' },
      },
    ]);
  });

  it('UT-M007-12: should keep item and set time to "" when time field is missing and activity is valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        { activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
      ] as any),
    ).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-13: should filter out item when both time and activity are empty', () => {
    expect(
      utils.sanitizeAgendaItems([{ time: '', activity: { en: '', th: '' } }]),
    ).toEqual([]);
  });

  it('UT-M007-14: should return only valid item when one item is valid and another is all empty', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
        { time: '', activity: { en: '', th: '' } },
      ]),
    ).toEqual([
      { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M007-15: should return [] for empty array', () => {
    expect(utils.sanitizeAgendaItems([])).toEqual([]);
  });

  it('UT-M007-16: should return [] for null input', () => {
    expect(utils.sanitizeAgendaItems(null)).toEqual([]);
  });

  it('UT-M007-17: should return [] for undefined input', () => {
    expect(utils.sanitizeAgendaItems(undefined)).toEqual([]);
  });

  it('UT-M007-18: should return [] for non-array input', () => {
    expect(utils.sanitizeAgendaItems('not an array' as any)).toEqual([]);
  });
});

describe('EventDataUtils - sanitizeDateRange', () => {
  let utils: EventDataUtils;

  beforeEach(() => {
    utils = new EventDataUtils();
  });

  it('UT-M008-01: should return both unchanged when startAt is strictly before endAt', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({ startAt, endAt });
  });

  it('UT-M008-02: should return startAt unchanged and endAt undefined when both are same date and time', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M008-03: should return startAt unchanged and endAt undefined when startAt is after endAt', () => {
    const startAt = new Date('2026-10-31T12:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M008-04: should treat date-only input as valid and return both Date objects when startAt is before endAt', () => {
    const startAt = new Date('2026-10-31');
    const endAt = new Date('2026-11-01');
    console.log('startAt:', startAt, 'endAt:', endAt);
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({ startAt, endAt });
  });

  it('UT-M008-05: should return startAt and endAt undefined when date only input and same date', () => {
    const startAt = new Date('2026-10-31');
    const endAt = new Date('2026-10-31');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M008-06: should return both undefined when startAt is invalid Date and endAt is valid', () => {
    const startAt = new Date('invalid');
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M008-07: should return both undefined when startAt is undefined and endAt is valid', () => {
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange(undefined, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M008-08: should return both undefined when startAt is a string and endAt is valid', () => {
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange('Upcoming Monday' as any, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M008-09: should return startAt unchanged and endAt undefined when startAt is valid and endAt is invalid Date', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('invalid value');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M008-10: should return startAt unchanged and endAt undefined when startAt is valid and endAt is undefined', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, undefined)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M008-11: should return both undefined when both are undefined', () => {
    expect(utils.sanitizeDateRange(undefined, undefined)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M008-12: should return both undefined when both are invalid Dates', () => {
    const startAt = new Date('invalid value');
    const endAt = new Date('invalid value');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M008-13: should return both unchanged when input is timezone offset format', () => {
    const startAt = new Date('2026-10-31T09:00:00+07:00');
    const endAt = new Date('2026-10-31T12:00:00+07:00');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt,
    });
  });
});

describe('EventDataUtils - isValidUrl', () => {
  let utils: EventDataUtils;

  beforeEach(() => {
    utils = new EventDataUtils();
  });

  it('UT-M009-01: should return true for valid https URL', () => {
    expect(utils.isValidUrl('https://www.cmu.ac.th')).toBe(true);
  });

  it('UT-M009-02: should return true for valid http URL', () => {
    expect(utils.isValidUrl('http://www.cmu.ac.th')).toBe(true);
  });

  it('UT-M009-03: should return true for valid URL with path and query params', () => {
    expect(
      utils.isValidUrl('https://maps.google.com/maps?q=chiang+mai+university'),
    ).toBe(true);
  });

  it('UT-M009-04: should return true for valid Google Maps URL', () => {
    expect(
        utils.isValidUrl('https://maps.app.goo.gl/6JUdAiaKkPuUUHEm9'))
    .toBe(true);
  });

  it('UT-M009-05: should return true for valid URL with port number', () => {
    expect(utils.isValidUrl('https://www.cmu.ac.th:8080')).toBe(true);
  });

  it('UT-M009-06: should return false for empty string', () => {
    expect(utils.isValidUrl('')).toBe(false);
  });

  it('UT-M009-07: should return false for plain text with no protocol', () => {
    expect(utils.isValidUrl('this is not a url')).toBe(false);
  });

  it('UT-M009-08: should return false for missing protocol (without https://)', () => {
    expect(utils.isValidUrl('www.cmu.ac.th')).toBe(false);
  });

  it('UT-M009-09: should return false for domain only with no protocol (without https://www.)', () => {
    expect(utils.isValidUrl('google.com')).toBe(false);
  });

  it('UT-M009-10: should return false for only protocol with no domain', () => {
    expect(utils.isValidUrl('https://')).toBe(false);
  });

  it('UT-M009-11: should return false for null input', () => {
    expect(utils.isValidUrl(null as any)).toBe(false);
  });

  it('UT-M009-12: should return false for undefined input', () => {
    expect(utils.isValidUrl(undefined as any)).toBe(false);
  });
});