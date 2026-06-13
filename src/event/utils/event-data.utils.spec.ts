import { EventDataUtils } from '../utils/event-data.utils';

describe('EventDataUtils - sanitizeBilingualField', () => {
  let utils: EventDataUtils;

  beforeEach(() => {
    utils = new EventDataUtils();
  });

  it('UT-M036-01: should return both trimmed when both en and th have data', () => {
    expect(
      utils.sanitizeBilingualField({
        en: '  CAMT Workshop  ',
        th: '  เวิร์กช็อป CAMT  ',
      }),
    ).toEqual({ en: 'CAMT Workshop', th: 'เวิร์กช็อป CAMT' });
  });

  it('UT-M036-02: should return { en: "", th: "" } when both are empty strings', () => {
    expect(utils.sanitizeBilingualField({ en: '', th: '' })).toEqual({
      en: '',
      th: '',
    });
  });

  it('UT-M036-03: should return { en: "", th: "" } when both are whitespace only', () => {
    expect(utils.sanitizeBilingualField({ en: '   ', th: '   ' })).toEqual({
      en: '',
      th: '',
    });
  });

  it('UT-M036-04: should return { en: "", th: "" } when both values are null', () => {
    expect(
      utils.sanitizeBilingualField({ en: null as any, th: null as any }),
    ).toEqual({ en: '', th: '' });
  });

  it('UT-M036-05: should return { en: "", th: "" } when both values are undefined', () => {
    expect(
      utils.sanitizeBilingualField({
        en: undefined as any,
        th: undefined as any,
      }),
    ).toEqual({ en: '', th: '' });
  });

  it('UT-M036-06: should return en trimmed and th as "" when th is whitespace only', () => {
    expect(
      utils.sanitizeBilingualField({ en: '  CAMT Workshop  ', th: '   ' }),
    ).toEqual({ en: 'CAMT Workshop', th: '' });
  });

  it('UT-M036-07: should return th trimmed and en as "" when en is whitespace only', () => {
    expect(
      utils.sanitizeBilingualField({ en: '   ', th: '  เวิร์กช็อป CAMT  ' }),
    ).toEqual({ en: '', th: 'เวิร์กช็อป CAMT' });
  });

  it('UT-M036-08: should return en as "" when en is a number', () => {
    expect(
      utils.sanitizeBilingualField({ en: 123 as any, th: 'เวิร์กช็อป CAMT' }),
    ).toEqual({ en: '', th: 'เวิร์กช็อป CAMT' });
  });

  it('UT-M036-09: should return th as "" when th is a boolean', () => {
    expect(
      utils.sanitizeBilingualField({ en: 'CAMT Workshop', th: false as any }),
    ).toEqual({ en: 'CAMT Workshop', th: '' });
  });

  it('UT-M036-10: should return { en: "", th: "" } when input is null', () => {
    expect(utils.sanitizeBilingualField(null)).toEqual({ en: '', th: '' });
  });

  it('UT-M036-11: should return { en: "", th: "" } when input is undefined', () => {
    expect(utils.sanitizeBilingualField(undefined)).toEqual({ en: '', th: '' });
  });

  it('UT-M036-12: should return en trimmed and th as "" when only en key is present', () => {
    expect(
      utils.sanitizeBilingualField({ en: '  CAMT Workshop  ' } as any),
    ).toEqual({ en: 'CAMT Workshop', th: '' });
  });

  it('UT-M036-13: should return th trimmed and en as "" when only th key is present', () => {
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

  it('UT-M037-01: should keep item and return trimmed values when time and both activity languages are valid', () => {
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

  it('UT-M037-02: should keep item when time is valid and only en activity has data', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: 'Opening Ceremony', th: '' } },
      ]),
    ).toEqual([
      { time: '09:00', activity: { en: 'Opening Ceremony', th: '' } },
    ]);
  });

  it('UT-M037-03: should keep item when time is valid and only th activity has data', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: '', th: 'พิธีเปิด' } },
      ]),
    ).toEqual([{ time: '09:00', activity: { en: '', th: 'พิธีเปิด' } }]);
  });

  it('UT-M037-04: should keep item when time is valid and both activity languages are empty', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: '', th: '' } },
      ]),
    ).toEqual([{ time: '09:00', activity: { en: '', th: '' } }]);
  });

  it('UT-M037-05: should keep item with default activity when time is valid and activity field is missing', () => {
    expect(utils.sanitizeAgendaItems([{ time: '09:00' }] as any)).toEqual([
      { time: '09:00', activity: { en: '', th: '' } },
    ]);
  });

  it('UT-M037-06: should keep item when time is empty and both activity languages are valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
      ]),
    ).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M037-07: should keep item when time is undefined and only en activity has data', () => {
    expect(
      utils.sanitizeAgendaItems([
        {
          time: undefined as any,
          activity: { en: 'Opening Ceremony', th: '' },
        },
      ]),
    ).toEqual([{ time: '', activity: { en: 'Opening Ceremony', th: '' } }]);
  });

  it('UT-M037-08: should keep item and trim time to "" when time is whitespace and activity is valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '   ', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
      ]),
    ).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M037-09: should keep item and set time to "" when time is null and activity is valid', () => {
    const input = [
      { time: null, activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ] as any;
    expect(utils.sanitizeAgendaItems(input)).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M037-10: should keep item and set time to "" when time is a number and activity is valid', () => {
    const input = [
      { time: 900, activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ] as any;
    expect(utils.sanitizeAgendaItems(input)).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M037-11: should keep item when time is free text and activity is valid', () => {
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

  it('UT-M037-12: should keep item and set time to "" when time field is missing and activity is valid', () => {
    expect(
      utils.sanitizeAgendaItems([
        { activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
      ] as any),
    ).toEqual([
      { time: '', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M037-13: should filter out item when both time and activity are empty', () => {
    expect(
      utils.sanitizeAgendaItems([{ time: '', activity: { en: '', th: '' } }]),
    ).toEqual([]);
  });

  it('UT-M037-14: should return only valid item when one item is valid and another is all empty', () => {
    expect(
      utils.sanitizeAgendaItems([
        { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
        { time: '', activity: { en: '', th: '' } },
      ]),
    ).toEqual([
      { time: '09:00', activity: { en: 'Opening Ceremony', th: 'พิธีเปิด' } },
    ]);
  });

  it('UT-M037-15: should return [] for empty array', () => {
    expect(utils.sanitizeAgendaItems([])).toEqual([]);
  });

  it('UT-M037-16: should return [] for null input', () => {
    expect(utils.sanitizeAgendaItems(null)).toEqual([]);
  });

  it('UT-M037-17: should return [] for undefined input', () => {
    expect(utils.sanitizeAgendaItems(undefined)).toEqual([]);
  });

  it('UT-M037-18: should return [] for non-array input', () => {
    expect(utils.sanitizeAgendaItems('not an array' as any)).toEqual([]);
  });
});

describe('EventDataUtils - sanitizeDateRange', () => {
  let utils: EventDataUtils;

  beforeEach(() => {
    utils = new EventDataUtils();
  });

  it('UT-M038-01: should return both unchanged when startAt is strictly before endAt', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({ startAt, endAt });
  });

  it('UT-M038-02: should return startAt unchanged and endAt undefined when both are same date and time', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M038-03: should return startAt unchanged and endAt undefined when startAt is after endAt', () => {
    const startAt = new Date('2026-10-31T12:00:00.000Z');
    const endAt = new Date('2026-10-31T09:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M038-04: should treat date-only input as valid and return both Date objects when startAt is before endAt', () => {
    const startAt = new Date('2026-10-31');
    const endAt = new Date('2026-11-01');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({ startAt, endAt });
  });

  it('UT-M038-05: should return startAt and endAt undefined when date-only input and same date', () => {
    const startAt = new Date('2026-10-31');
    const endAt = new Date('2026-10-31');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M038-06: should return both undefined when startAt is invalid Date and endAt is valid', () => {
    const startAt = new Date('invalid');
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M038-07: should return both undefined when startAt is undefined and endAt is valid', () => {
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange(undefined, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M038-08: should return both undefined when startAt is a string and endAt is valid', () => {
    const endAt = new Date('2026-10-31T12:00:00.000Z');
    expect(utils.sanitizeDateRange('Upcoming Monday' as any, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M038-09: should return startAt unchanged and endAt undefined when startAt is valid and endAt is invalid Date', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    const endAt = new Date('invalid value');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M038-10: should return startAt unchanged and endAt undefined when startAt is valid and endAt is undefined', () => {
    const startAt = new Date('2026-10-31T09:00:00.000Z');
    expect(utils.sanitizeDateRange(startAt, undefined)).toEqual({
      startAt,
      endAt: undefined,
    });
  });

  it('UT-M038-11: should return both undefined when both are undefined', () => {
    expect(utils.sanitizeDateRange(undefined, undefined)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M038-12: should return both undefined when both are invalid Dates', () => {
    const startAt = new Date('invalid value');
    const endAt = new Date('invalid value');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('UT-M038-13: should return both unchanged when input is timezone offset format', () => {
    const startAt = new Date('2026-10-31T09:00:00+07:00');
    const endAt = new Date('2026-10-31T12:00:00+07:00');
    expect(utils.sanitizeDateRange(startAt, endAt)).toEqual({
      startAt,
      endAt,
    });
  });
});
