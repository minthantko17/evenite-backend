import { FieldType } from '@prisma/client';
import {
  buildFieldStats,
  buildFormFieldStats,
  FieldStatsField,
  FieldStatsRow,
} from './analytics-field-stats.utils';

// Pure functions: fixtures are built inline with the helpers below.
// valueNumber mimics Prisma's Decimal with an object exposing toNumber().
//
// Every test follows the same shape — input, expected, actual, then assert —
// with a commented-out console.log line for copying values into the test
// document.
//
// Within each describe block, regular cases come first, followed by edge
// cases that document current behavior (the code does not reject them).

const field = (
  type: FieldType,
  options: string[] = [],
  id = 'field-1',
): FieldStatsField => ({ id, label: `Label ${id}`, type, options });

const row = (overrides: Partial<FieldStatsRow> = {}): FieldStatsRow => ({
  valueText: null,
  valueNumber: null,
  valueDate: null,
  valueArray: [],
  ...overrides,
});

const choiceRow = (...values: string[]) => row({ valueArray: values });
const numberRow = (value: number | null) =>
  row({ valueNumber: value === null ? null : { toNumber: () => value } });
const textRow = (value: string | null) => row({ valueText: value });
const dateRow = (iso: string | null) =>
  row({ valueDate: iso === null ? null : new Date(iso) });

describe('AnalyticsFieldStatsUtils', () => {
  // ==========================================================================
  // buildFieldStats
  // ==========================================================================
  describe('buildFieldStats', () => {
    describe('CHOICE / CHECKBOX', () => {
      it('UT-buildFieldStats-01: CHOICE, every option chosen — counts per option in definition order', () => {
        const input = {
          field: field(FieldType.CHOICE, ['A', 'B']),
          rows: [choiceRow('A'), choiceRow('A'), choiceRow('B')],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHOICE,
          answered: 3,
          options: [
            { value: 'A', count: 2 },
            { value: 'B', count: 1 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-02: CHOICE, an option never chosen — listed with count 0', () => {
        const input = {
          field: field(FieldType.CHOICE, ['A', 'B', 'C']),
          rows: [choiceRow('A'), choiceRow('A')],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHOICE,
          answered: 2,
          options: [
            { value: 'A', count: 2 },
            { value: 'B', count: 0 },
            { value: 'C', count: 0 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-03: CHOICE, no rows — answered 0 and every option 0', () => {
        const input = { field: field(FieldType.CHOICE, ['A', 'B']), rows: [] };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHOICE,
          answered: 0,
          options: [
            { value: 'A', count: 0 },
            { value: 'B', count: 0 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-04: CHOICE, a row with no selected value — skipped, not counted as answered', () => {
        const input = {
          field: field(FieldType.CHOICE, ['A', 'B']),
          rows: [choiceRow('A'), choiceRow()],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHOICE,
          answered: 1,
          options: [
            { value: 'A', count: 1 },
            { value: 'B', count: 0 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-05: CHOICE, a stored value that is not a defined option — appended after the defined options', () => {
        const input = {
          field: field(FieldType.CHOICE, ['A', 'B']),
          rows: [choiceRow('Z'), choiceRow('A')],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHOICE,
          answered: 2,
          options: [
            { value: 'A', count: 1 },
            { value: 'B', count: 0 },
            { value: 'Z', count: 1 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-06: CHECKBOX, several values per row — each value counted once, row counted once as answered', () => {
        const input = {
          field: field(FieldType.CHECKBOX, ['A', 'B', 'C']),
          rows: [choiceRow('A', 'B'), choiceRow('B')],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHECKBOX,
          answered: 2,
          options: [
            { value: 'A', count: 1 },
            { value: 'B', count: 2 },
            { value: 'C', count: 0 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      // --- edge cases (documents current behavior) ---
      it('UT-buildFieldStats-07: CHOICE, no options defined — only the stored values are listed', () => {
        const input = {
          field: field(FieldType.CHOICE, []),
          rows: [choiceRow('X'), choiceRow('X')],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHOICE,
          answered: 2,
          options: [{ value: 'X', count: 2 }],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-08: CHECKBOX, the same value twice in one row — row counts once as answered, option counts twice', () => {
        const input = {
          field: field(FieldType.CHECKBOX, ['A']),
          rows: [choiceRow('A', 'A')],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.CHECKBOX,
          answered: 1,
          options: [{ value: 'A', count: 2 }],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });
    });

    describe('NUMBER / RATING', () => {
      it('UT-buildFieldStats-09: NUMBER, several values — answered, average, min and max, no distribution', () => {
        const input = {
          field: field(FieldType.NUMBER),
          rows: [numberRow(2), numberRow(4), numberRow(6)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.NUMBER,
          answered: 3,
          average: 4,
          min: 2,
          max: 6,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-10: NUMBER, one value — average, min and max are all that value', () => {
        const input = { field: field(FieldType.NUMBER), rows: [numberRow(7)] };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.NUMBER,
          answered: 1,
          average: 7,
          min: 7,
          max: 7,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-11: NUMBER, no rows — answered 0 and average, min, max all null', () => {
        const input = { field: field(FieldType.NUMBER), rows: [] };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.NUMBER,
          answered: 0,
          average: null,
          min: null,
          max: null,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-12: NUMBER, rows with a null number — ignored', () => {
        const input = {
          field: field(FieldType.NUMBER),
          rows: [numberRow(null), numberRow(10), numberRow(null)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.NUMBER,
          answered: 1,
          average: 10,
          min: 10,
          max: 10,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-13: NUMBER, average needs rounding — rounded to 2 decimals', () => {
        const input = {
          field: field(FieldType.NUMBER),
          rows: [numberRow(1), numberRow(2), numberRow(2)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.NUMBER,
          answered: 3,
          average: 1.67,
          min: 1,
          max: 2,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-14: NUMBER, negative and decimal values — handled', () => {
        const input = {
          field: field(FieldType.NUMBER),
          rows: [numberRow(-3), numberRow(2.5)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.NUMBER,
          answered: 2,
          average: -0.25,
          min: -3,
          max: 2.5,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-15: RATING, unsorted values — stats plus a distribution of the occurred values, ascending', () => {
        const input = {
          field: field(FieldType.RATING),
          rows: [numberRow(5), numberRow(3), numberRow(5), numberRow(4)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.RATING,
          answered: 4,
          average: 4.25,
          min: 3,
          max: 5,
          distribution: [
            { value: 3, count: 1 },
            { value: 4, count: 1 },
            { value: 5, count: 2 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-16: RATING, no rows — answered 0, null stats and an empty distribution', () => {
        const input = { field: field(FieldType.RATING), rows: [] };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.RATING,
          answered: 0,
          average: null,
          min: null,
          max: null,
          distribution: [],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      // --- edge cases (documents current behavior) ---
      it('UT-buildFieldStats-17: RATING, a value outside any scale — kept, the scale is not enforced', () => {
        const input = {
          field: field(FieldType.RATING),
          rows: [numberRow(11), numberRow(5)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.RATING,
          answered: 2,
          average: 8,
          min: 5,
          max: 11,
          distribution: [
            { value: 5, count: 1 },
            { value: 11, count: 1 },
          ],
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });
    });

    describe('DATE', () => {
      it('UT-buildFieldStats-18: DATE, some rows without a date — only rows with a date are counted, and only answered is returned', () => {
        const input = {
          field: field(FieldType.DATE),
          rows: [
            dateRow('2026-05-20T00:00:00.000Z'),
            dateRow(null),
            dateRow('2026-05-21T00:00:00.000Z'),
          ],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.DATE,
          answered: 2,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      it('UT-buildFieldStats-19: DATE, no rows — answered 0', () => {
        const input = { field: field(FieldType.DATE), rows: [] };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.DATE,
          answered: 0,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });
    });

    describe('TEXT / TEXTAREA', () => {
      it.each([FieldType.TEXT, FieldType.TEXTAREA])(
        'UT-buildFieldStats-20: %s, empty, whitespace-only and null text — only non-blank text is counted, content is not returned',
        (type) => {
          const input = {
            field: field(type),
            rows: [
              textRow('hello'),
              textRow('   '),
              textRow(''),
              textRow(null),
              textRow('  padded  '),
            ],
          };
          const expected = {
            fieldId: 'field-1',
            label: 'Label field-1',
            type,
            answered: 2,
          };

          const actual = buildFieldStats(input.field, input.rows);
          // console.log({ input, expected, actual });

          expect(actual).toStrictEqual(expected);
        },
      );

      it('UT-buildFieldStats-21: TEXT, no rows — answered 0', () => {
        const input = { field: field(FieldType.TEXT), rows: [] };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: FieldType.TEXT,
          answered: 0,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });

      // --- edge cases (documents current behavior) ---
      it('UT-buildFieldStats-22: unknown field type — handled like TEXT', () => {
        const input = {
          field: field('SOMETHING_NEW' as FieldType),
          rows: [textRow('hello'), textRow(null)],
        };
        const expected = {
          fieldId: 'field-1',
          label: 'Label field-1',
          type: 'SOMETHING_NEW',
          answered: 1,
        };

        const actual = buildFieldStats(input.field, input.rows);
        // console.log({ input, expected, actual });

        expect(actual).toStrictEqual(expected);
      });
    });
  });

  // ==========================================================================
  // buildFormFieldStats
  // ==========================================================================
  describe('buildFormFieldStats', () => {
    it('UT-buildFormFieldStats-01: rows of different fields interleaved — each field only sees its own rows, in the given field order', () => {
      const input = {
        fields: [
          field(FieldType.CHOICE, ['A', 'B'], 'field-choice'),
          field(FieldType.NUMBER, [], 'field-number'),
        ],
        rows: [
          { ...choiceRow('A'), formFieldId: 'field-choice' },
          { ...numberRow(4), formFieldId: 'field-number' },
          { ...choiceRow('B'), formFieldId: 'field-choice' },
          { ...numberRow(6), formFieldId: 'field-number' },
        ],
      };
      const expected = [
        {
          fieldId: 'field-choice',
          label: 'Label field-choice',
          type: FieldType.CHOICE,
          answered: 2,
          options: [
            { value: 'A', count: 1 },
            { value: 'B', count: 1 },
          ],
        },
        {
          fieldId: 'field-number',
          label: 'Label field-number',
          type: FieldType.NUMBER,
          answered: 2,
          average: 5,
          min: 4,
          max: 6,
        },
      ];

      const actual = buildFormFieldStats(input.fields, input.rows);
      // console.log({ input, expected, actual });

      expect(actual).toStrictEqual(expected);
    });

    it('UT-buildFormFieldStats-02: a field with no rows — still present with zero answers', () => {
      const input = {
        fields: [
          field(FieldType.TEXT, [], 'field-a'),
          field(FieldType.TEXT, [], 'field-b'),
        ],
        rows: [{ ...textRow('hi'), formFieldId: 'field-a' }],
      };
      const expected = [
        {
          fieldId: 'field-a',
          label: 'Label field-a',
          type: FieldType.TEXT,
          answered: 1,
        },
        {
          fieldId: 'field-b',
          label: 'Label field-b',
          type: FieldType.TEXT,
          answered: 0,
        },
      ];

      const actual = buildFormFieldStats(input.fields, input.rows);
      // console.log({ input, expected, actual });

      expect(actual).toStrictEqual(expected);
    });

    it('UT-buildFormFieldStats-03: fields present but no rows at all — every field with zero answers', () => {
      const input = {
        fields: [field(FieldType.DATE, [], 'field-a')],
        rows: [],
      };
      const expected = [
        {
          fieldId: 'field-a',
          label: 'Label field-a',
          type: FieldType.DATE,
          answered: 0,
        },
      ];

      const actual = buildFormFieldStats(input.fields, input.rows);
      // console.log({ input, expected, actual });

      expect(actual).toStrictEqual(expected);
    });

    it('UT-buildFormFieldStats-04: empty field list — returns an empty list', () => {
      const input = {
        fields: [] as FieldStatsField[],
        rows: [{ ...textRow('hi'), formFieldId: 'field-a' }],
      };
      const expected: unknown[] = [];

      const actual = buildFormFieldStats(input.fields, input.rows);
      // console.log({ input, expected, actual });

      expect(actual).toStrictEqual(expected);
    });

    // --- edge cases (documents current behavior) ---
    it('UT-buildFormFieldStats-05: rows for a field id not in fields — ignored', () => {
      const input = {
        fields: [field(FieldType.TEXT, [], 'field-a')],
        rows: [
          { ...textRow('hi'), formFieldId: 'field-a' },
          { ...textRow('stray'), formFieldId: 'field-unknown' },
        ],
      };
      const expected = [
        {
          fieldId: 'field-a',
          label: 'Label field-a',
          type: FieldType.TEXT,
          answered: 1,
        },
      ];

      const actual = buildFormFieldStats(input.fields, input.rows);
      // console.log({ input, expected, actual });

      expect(actual).toStrictEqual(expected);
    });
  });
});
