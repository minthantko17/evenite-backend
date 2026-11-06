import { FieldType } from '@prisma/client';
import { AnalyticsFieldStatsDto } from '../dto/return-analytics.dto';

// Pure aggregation of form answers (no database), easy to unit-test.

export interface FieldStatsField {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
}

// one stored answer; unanswered fields are stored as nulls / empty arrays
export interface FieldStatsRow {
  valueText: string | null;
  valueNumber: { toNumber(): number } | null;
  valueDate: Date | null;
  valueArray: string[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function buildFormFieldStats(
  fields: FieldStatsField[],
  rows: (FieldStatsRow & { formFieldId: string })[],
): AnalyticsFieldStatsDto[] {
  const rowsByField = new Map<string, FieldStatsRow[]>();
  for (const row of rows) {
    const list = rowsByField.get(row.formFieldId) ?? [];
    list.push(row);
    rowsByField.set(row.formFieldId, list);
  }
  return fields.map((field) =>
    buildFieldStats(field, rowsByField.get(field.id) ?? []),
  );
}

export function buildFieldStats(
  field: FieldStatsField,
  rows: FieldStatsRow[],
): AnalyticsFieldStatsDto {
  const base = { fieldId: field.id, label: field.label, type: field.type };

  switch (field.type) {
    case FieldType.CHOICE:
    case FieldType.CHECKBOX: {
      // every defined option first (so 0s are shown), then any unexpected stored value
      const counts = new Map<string, number>(
        field.options.map((option) => [option, 0]),
      );
      let answered = 0;
      for (const row of rows) {
        if (row.valueArray.length === 0) continue;
        answered++;
        for (const value of row.valueArray) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      return {
        ...base,
        answered,
        options: [...counts].map(([value, count]) => ({ value, count })),
      };
    }

    case FieldType.NUMBER:
    case FieldType.RATING: {
      const values = rows
        .filter((row) => row.valueNumber !== null)
        .map((row) => row.valueNumber!.toNumber());
      const stats: AnalyticsFieldStatsDto = {
        ...base,
        answered: values.length,
        average:
          values.length > 0
            ? round2(values.reduce((sum, v) => sum + v, 0) / values.length)
            : null,
        min: values.length > 0 ? Math.min(...values) : null,
        max: values.length > 0 ? Math.max(...values) : null,
      };
      if (field.type === FieldType.RATING) {
        // only values that actually occurred: the rating scale isn't enforced anywhere
        const counts = new Map<number, number>();
        for (const value of values) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        stats.distribution = [...counts]
          .sort(([a], [b]) => a - b)
          .map(([value, count]) => ({ value, count }));
      }
      return stats;
    }

    case FieldType.DATE:
      return {
        ...base,
        answered: rows.filter((row) => row.valueDate !== null).length,
      };

    case FieldType.TEXT:
    case FieldType.TEXTAREA:
    default:
      // free text is not aggregated; the existing form summary endpoints return the content
      return {
        ...base,
        answered: rows.filter((row) => (row.valueText ?? '').trim() !== '')
          .length,
      };
  }
}
