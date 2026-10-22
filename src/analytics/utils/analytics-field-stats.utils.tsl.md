# AnalyticsFieldStatsUtils — Test Specification Language (Category-Partition)

Scope: the exported functions of `analytics-field-stats.utils.ts`
(`buildFormFieldStats` M-XX-001, `buildFieldStats` M-XX-002). Both are pure
(no database, no clock), so there are no collaborators to mock; fixtures are
built inline with small row/field helpers. `valueNumber` mimics Prisma's
Decimal with an object exposing `toNumber()`.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C, `[property P]` = marks a
choice so later choices can refer to it with `[if P]`.

Cases marked "documents current behavior" are not rejected by the code (no
throw); they pin down what happens today and are grouped last in each
`describe` so they are easy to remove.

---

## buildFieldStats(field, rows)

**Categories**
- field.type
  - CHOICE [property choice]
  - CHECKBOX [property choice]
  - NUMBER [property number]
  - RATING [property number] [property rating]
  - DATE
  - TEXT [property text]
  - TEXTAREA [property text]
  - any other type [single] (documents current behavior): handled like TEXT
    (default branch)
- rows
  - none
  - some, all answered
  - some unanswered (empty array / null number / null date / blank text)

### CHOICE / CHECKBOX [if choice]
- Defined options
  - several options, all chosen at least once
  - some option never chosen → listed with count 0
  - no options defined [single] (documents current behavior)
- Selected values per row
  - one value (CHOICE) / several values (CHECKBOX) → each counted once
  - empty array → row skipped, not counted as answered
  - value that is not a defined option → appended after the defined options
  - same value twice in one row [single] (documents current behavior): the
    row counts once as answered but the option counts twice
- Result: `answered` = rows with at least one value; `options` = defined
  options first (definition order), then unexpected values (first-seen
  order); no `average`/`min`/`max`/`distribution`.

### NUMBER / RATING [if number]
- Answered values
  - none answered (no rows, or only null numbers) → answered 0, average /
    min / max all `null`
  - one value → average = min = max
  - several values → average, min, max
  - null-number rows → ignored
  - average needs rounding (1, 2, 2 → 1.67) → rounded to 2 decimals
  - negative and decimal values [single]
- Distribution [if rating]
  - values inserted unsorted → distribution ascending, only values that
    occurred, with counts
  - no answers → distribution `[]`
  - value outside any scale (e.g. 11) [single] (documents current
    behavior): kept, the scale is not enforced
- distribution is absent [if NUMBER]

### DATE
- rows with a date counted, rows with null date not counted; only `answered`
  is returned (no content properties).

### TEXT / TEXTAREA / other [if text]
- valueText
  - non-empty text → counted
  - empty string / whitespace only / null → not counted
- only `answered` is returned; the text itself is never aggregated.

---

## buildFormFieldStats(fields, rows)

**Categories**
- fields
  - several fields → one entry each, in the given order
  - empty list → `[]`
- rows per field
  - rows of different fields interleaved → each field only sees its own rows
  - a field with no rows → still present, with zero answers
- rows for a field id not in `fields` [single] (documents current behavior):
  ignored
- no rows at all, fields present → every field with zero answers
