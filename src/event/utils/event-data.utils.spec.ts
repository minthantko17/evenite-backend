import { EventDataUtils } from '../utils/event-data.utils';

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
