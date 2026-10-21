import { EventStatus } from '@prisma/client';

// ─── DEMO TIMELINE ────────────────────────────────────────────────────────────
// Single source of truth for "when" things happen in the seed.
//
// Dates are written as real calendar dates for the default DEMO_DAY (the first
// presentation day). Set DEMO_DAY=YYYY-MM-DD to shift the WHOLE dataset, e.g.
//   DEMO_DAY=2026-11-04 npx prisma db seed
// The seed describes the world as of AS_OF (midnight starting DEMO_DAY, Bangkok):
// every registration, check-in, feedback and message is timestamped before it.
// If you seed before AS_OF, some rows are dated "in the future" relative to the
// real clock; that is harmless for the demo (see the warning printed at the end).

const DEFAULT_DEMO_DAY = '2026-11-02';
export const DEMO_DAY = process.env.DEMO_DAY ?? DEFAULT_DEMO_DAY;

if (!/^\d{4}-\d{2}-\d{2}$/.test(DEMO_DAY)) {
  throw new Error(`DEMO_DAY must look like 2026-11-02, got "${DEMO_DAY}"`);
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const BANGKOK_UTC_OFFSET_HOURS = 7; // Asia/Bangkok has no DST

const utcDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Bangkok wall-clock `hhmm` on calendar day `isoDate` (relative to the default DEMO_DAY, so DEMO_DAY shifts it). */
export function at(isoDate: string, hhmm = '09:00'): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const shiftDays = Math.round((utcDay(DEMO_DAY) - utcDay(DEFAULT_DEMO_DAY)) / DAY);
  return new Date(utcDay(isoDate) + shiftDays * DAY + (h - BANGKOK_UTC_OFFSET_HOURS) * HOUR + m * MIN);
}

/** The seed's "now": midnight at the start of DEMO_DAY (Bangkok). Nothing is timestamped after it. */
export const AS_OF = at(DEFAULT_DEMO_DAY, '00:00');

/** Bangkok calendar date (yyyy-mm-dd) and hour of day for a UTC instant. */
export function bangkokParts(date: Date): {
  isoDate: string;
  hour: number;
  minute: number;
} {
  const local = new Date(date.getTime() + BANGKOK_UTC_OFFSET_HOURS * HOUR);
  return {
    isoDate: local.toISOString().slice(0, 10),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

/** `days` after the Bangkok calendar day of `base`, at Bangkok wall-clock `hhmm`. */
export function localOn(base: Date, days: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const day = utcDay(bangkokParts(base).isoDate) + days * DAY;
  return new Date(day + (h - BANGKOK_UTC_OFFSET_HOURS) * HOUR + m * MIN);
}

// ─── DETERMINISTIC RANDOMNESS ─────────────────────────────────────────────────
// Everything "random" is a pure function of its inputs, so re-seeding produces
// identical data and nothing depends on call order.

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic float in [0, 1) derived from the given parts. */
export function rand(...parts: (string | number)[]): number {
  let h = fnv1a(parts.join('|'));
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Deterministic standard-normal sample (Box–Muller). */
export function gauss(...parts: (string | number)[]): number {
  const u = Math.max(rand(...parts, 'u'), 1e-9);
  const v = rand(...parts, 'v');
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pick<T>(items: readonly T[], ...parts: (string | number)[]): T {
  return items[Math.floor(rand(...parts) * items.length)];
}

export function pickWeighted<T>(items: readonly T[], weights: readonly number[], ...parts: (string | number)[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(...parts) * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const WAKING_FROM = 8 * 60; // 08:00 Bangkok
const WAKING_TO = 23 * 60 + 30; // 23:30 Bangkok

/**
 * Activity at 3 a.m. looks fake, so an instant outside waking hours keeps its date but gets a random
 * waking time of day (spreading overnight activity across the day instead of bunching it at 08:00).
 * The result is never earlier than `lower`: if the random time would be, it rolls over to the next day.
 */
function toWakingHours(ms: number, lower: number, ...parts: (string | number)[]): number {
  const { hour, minute } = bangkokParts(new Date(ms));
  const minutesOfDay = hour * 60 + minute;
  if (minutesOfDay >= WAKING_FROM && minutesOfDay <= WAKING_TO) return ms;
  const midnight = ms - minutesOfDay * MIN;
  const mapped = midnight + (WAKING_FROM + Math.floor(rand(...parts, 'wake') * (WAKING_TO - WAKING_FROM))) * MIN;
  return mapped >= lower ? mapped : mapped + DAY;
}

/** The latest waking-hours instant at or before `ms` (late-night/early-morning instants move back to 22:30 the evening before). */
function latestWaking(ms: number): number {
  const { hour, minute } = bangkokParts(new Date(ms));
  const minutesOfDay = hour * 60 + minute;
  if (minutesOfDay < WAKING_FROM) return ms - minutesOfDay * MIN - 90 * MIN; // previous day 22:30
  return Math.min(ms, ms - minutesOfDay * MIN + WAKING_TO * MIN);
}

// ─── EVENT TIMELINE ───────────────────────────────────────────────────────────

export interface EventTimes {
  status: EventStatus;
  createdAt: Date;
  publishedAt: Date | null; // null while DRAFT
  startAt: Date | null;
  endAt: Date | null;
  cancelledAt?: Date; // seed-only: when a CANCELLED event was cancelled (stored as Event.updatedAt)
  updatedAt: Date; // last edit: drives Event.updatedAt
}

type Draft = Omit<EventTimes, 'updatedAt'> & { updatedAt?: Date };

const draftEvent = (created: [string, string], start?: [string, string], end?: [string, string]): Draft => ({
  status: EventStatus.DRAFT,
  createdAt: at(...created),
  publishedAt: null,
  startAt: start ? at(...start) : null,
  endAt: end ? at(...end) : null,
});

const liveEvent = (
  status: EventStatus,
  created: [string, string],
  published: [string, string],
  start: [string, string],
  end: [string, string],
  cancelledAt?: [string, string],
): Draft => ({
  status,
  createdAt: at(...created),
  publishedAt: at(...published),
  startAt: at(...start),
  endAt: at(...end),
  ...(cancelledAt && { cancelledAt: at(...cancelledAt) }),
});

const C = EventStatus.CONCLUDED;
const O = EventStatus.ONGOING;
const P = EventStatus.PUBLISHED;

const DRAFTS: Record<string, Draft> = {
  // ── concluded ──
  EVT_ORIENTATION: liveEvent(C, ['2026-07-01', '10:00'], ['2026-07-06', '09:00'], ['2026-08-10', '09:00'], ['2026-08-14', '16:30']),
  EVT_FRESHMENCAMP: liveEvent(C, ['2026-07-10', '11:00'], ['2026-07-15', '09:00'], ['2026-08-15', '08:00'], ['2026-08-17', '17:00']),
  EVT_ROBOTICS: liveEvent(C, ['2026-08-05', '10:00'], ['2026-08-10', '09:00'], ['2026-09-12', '09:00'], ['2026-09-12', '17:00']),
  EVT_MUAYTHAI: liveEvent(C, ['2026-08-14', '17:00'], ['2026-08-19', '10:00'], ['2026-09-19', '18:00'], ['2026-09-19', '21:00']),
  EVT_SPORTS: liveEvent(C, ['2026-08-18', '11:00'], ['2026-08-24', '10:00'], ['2026-09-26', '08:00'], ['2026-09-26', '17:00']),
  EVT_HACKATHON: liveEvent(C, ['2026-08-20', '16:00'], ['2026-08-28', '10:00'], ['2026-10-02', '09:00'], ['2026-10-04', '17:00']),
  EVT_MENTALHEALTH: liveEvent(C, ['2026-09-13', '15:00'], ['2026-09-18', '10:00'], ['2026-10-08', '13:00'], ['2026-10-08', '16:00']),
  EVT_CLEANUP: liveEvent(C, ['2026-09-09', '10:00'], ['2026-09-14', '09:00'], ['2026-10-10', '07:30'], ['2026-10-10', '12:00']),
  EVT_JOBFAIR: liveEvent(C, ['2026-09-05', '10:00'], ['2026-09-10', '09:00'], ['2026-10-15', '09:00'], ['2026-10-15', '16:00']),
  EVT_HALLOWEEN: liveEvent(C, ['2026-08-28', '14:00'], ['2026-09-01', '10:00'], ['2026-10-31', '17:00'], ['2026-10-31', '21:00']),
  // ── cancelled (called off mid-event because of a storm) ──
  EVT_FUNRUN: liveEvent(
    EventStatus.CANCELLED,
    ['2026-09-06', '12:00'],
    ['2026-09-12', '09:00'],
    ['2026-10-17', '05:00'],
    ['2026-10-17', '09:30'],
    ['2026-10-17', '07:50'],
  ),
  // ── ongoing (still running on the demo day) ──
  EVT_FOOTBALL: liveEvent(O, ['2026-08-15', '12:00'], ['2026-08-20', '09:00'], ['2026-10-03', '08:00'], ['2026-11-15', '18:00']),
  EVT_PHOTOEXHIBIT: liveEvent(O, ['2026-09-15', '14:00'], ['2026-09-20', '10:00'], ['2026-10-26', '10:00'], ['2026-11-09', '18:00']),
  EVT_BOOTCAMP: liveEvent(O, ['2026-06-25', '13:00'], ['2026-07-01', '09:00'], ['2026-08-01', '09:00'], ['2026-11-30', '17:00']),
  EVT_EXCHANGE: liveEvent(O, ['2026-07-25', '10:00'], ['2026-08-01', '09:00'], ['2026-09-01', '09:00'], ['2026-12-31', '17:00']),
  EVT_DATASCIENCE: liveEvent(O, ['2026-08-10', '11:00'], ['2026-08-15', '09:00'], ['2026-09-01', '09:00'], ['2026-12-15', '17:00']),
  EVT_AI_SEMINAR: liveEvent(O, ['2026-08-14', '10:00'], ['2026-08-20', '09:00'], ['2026-09-07', '17:00'], ['2026-12-14', '19:00']),
  EVT_GRADINFO: liveEvent(O, ['2026-08-20', '14:00'], ['2026-08-25', '09:00'], ['2026-09-10', '09:00'], ['2026-11-30', '17:00']),
  EVT_OSS: liveEvent(O, ['2026-09-10', '10:00'], ['2026-09-14', '09:00'], ['2026-10-05', '09:00'], ['2026-12-04', '17:00']),
  // ── published: upcoming (STARTUPPITCH and CLOUDTALK fall inside the presentation week) ──
  EVT_ALUMNI: liveEvent(P, ['2026-10-01', '11:00'], ['2026-10-05', '09:00'], ['2026-11-04', '17:30'], ['2026-11-04', '20:00']),
  EVT_BLOODDONATION: liveEvent(P, ['2026-09-10', '13:00'], ['2026-09-15', '09:00'], ['2026-11-06', '09:00'], ['2026-11-06', '15:00']),
  EVT_ACOUSTIC: liveEvent(P, ['2026-09-26', '14:00'], ['2026-09-30', '10:00'], ['2026-11-07', '18:00'], ['2026-11-07', '21:30']),
  EVT_CHESS: liveEvent(P, ['2026-09-20', '16:00'], ['2026-09-25', '10:00'], ['2026-11-08', '09:00'], ['2026-11-08', '18:00']),
  EVT_LIBRARY: liveEvent(P, ['2026-09-15', '13:00'], ['2026-09-20', '10:00'], ['2026-11-09', '13:00'], ['2026-11-09', '15:00']),
  EVT_STARTUPPITCH: liveEvent(P, ['2026-09-06', '11:00'], ['2026-09-11', '10:00'], ['2026-11-05', '13:00'], ['2026-11-05', '17:00']),
  EVT_CLOUDTALK: liveEvent(P, ['2026-10-08', '15:00'], ['2026-10-12', '10:00'], ['2026-11-06', '15:00'], ['2026-11-06', '17:30']),
  EVT_NO_FORM: liveEvent(P, ['2026-10-18', '09:00'], ['2026-10-20', '10:00'], ['2026-11-10', '09:00'], ['2026-11-10', '12:00']),
  EVT_TEDX: liveEvent(P, ['2026-08-30', '14:00'], ['2026-09-04', '09:00'], ['2026-11-14', '09:00'], ['2026-11-14', '17:00']),
  EVT_SUKHOTHAI: liveEvent(P, ['2026-09-06', '15:00'], ['2026-09-10', '09:00'], ['2026-11-15', '06:00'], ['2026-11-16', '20:00']),
  EVT_FOODFEST: liveEvent(P, ['2026-09-27', '12:00'], ['2026-10-01', '11:00'], ['2026-11-21', '11:00'], ['2026-11-21', '21:00']),
  EVT_CONCERT: liveEvent(P, ['2026-09-27', '15:00'], ['2026-10-01', '10:00'], ['2026-11-28', '18:00'], ['2026-11-28', '21:00']),
  EVT_NEW_YEAR: liveEvent(P, ['2026-08-30', '11:00'], ['2026-09-02', '10:00'], ['2026-12-31', '22:00'], ['2027-01-01', '01:00']),
  EVT_PRIDEWEEK: liveEvent(P, ['2026-09-27', '10:00'], ['2026-10-01', '12:00'], ['2027-06-01', '00:00'], ['2027-06-07', '23:59']),
  // ── drafts ──
  EVT_DRAFT1: draftEvent(['2026-10-12', '14:00'], ['2026-11-21', '09:00'], ['2026-11-21', '12:00']),
  EVT_DRAFT2: draftEvent(['2026-10-15', '16:00'], ['2026-12-20', '18:00'], ['2026-12-20', '21:00']),
  EVT_DRAFT3: draftEvent(['2026-10-20', '11:00']),
  EVT_FRESHYNIGHT: draftEvent(['2026-10-05', '17:00'], ['2027-08-20', '18:00'], ['2027-08-20', '22:00']),
  EVT_OPENHOUSE: draftEvent(['2026-10-08', '10:00'], ['2027-02-10', '09:00'], ['2027-02-10', '16:00']),
  EVT_CHOIR: draftEvent(['2026-10-18', '13:00'], ['2027-01-15', '18:00'], ['2027-01-15', '20:00']),
};

/** When an event was last edited: drives Event.updatedAt so it never predates the event's own history. */
function lastEdited(key: string, d: Draft): Date {
  if (d.updatedAt) return d.updatedAt;
  if (d.cancelledAt) return d.cancelledAt;
  if (d.status === EventStatus.DRAFT) return new Date(d.createdAt.getTime() + 2 * HOUR + Math.floor(rand('edit', key) * 3 * DAY));
  if (d.status === EventStatus.CONCLUDED) return new Date(d.endAt!.getTime() + 3 * MIN); // the scheduler flips it just after the end
  // published / ongoing: a few tweaks after publishing, never later than AS_OF
  return new Date(Math.min(d.publishedAt!.getTime() + 6 * HOUR + Math.floor(rand('edit', key) * 14 * DAY), AS_OF.getTime() - HOUR));
}

export const EVENT_TIMES: Record<string, EventTimes> = Object.fromEntries(Object.entries(DRAFTS).map(([key, d]) => [key, { ...d, updatedAt: lastEdited(key, d) }]));

/** single = one sitting, multi = several consecutive days, long = a programme running for weeks. */
export type EventKind = 'single' | 'multi' | 'long';
export function eventKind(e: EventTimes): EventKind {
  const span = e.endAt!.getTime() - e.startAt!.getTime();
  if (span <= 20 * HOUR) return 'single';
  if (span <= 5 * DAY) return 'multi';
  return 'long';
}

/** Latest instant at which anything about an event may have happened. */
export function activityCap(e: EventTimes): number {
  return Math.min(AS_OF.getTime() - MIN, e.cancelledAt ? e.cancelledAt.getTime() - 10 * MIN : e.endAt!.getTime());
}

// ─── PARTICIPANT / ORGANIZER ACCOUNT CREATION TIMES ──────────────────────────

/** When a participant joined: well before the first event was published. */
export const participantJoinedAt = (parKey: string): Date => new Date(at('2026-06-05', '10:00').getTime() + Math.floor(rand('joined', parKey) * 25 * DAY));
/** Organizer accounts are older still. */
export const organizerJoinedAt = (orgKey: string): Date => new Date(at('2026-04-20', '10:00').getTime() + Math.floor(rand('joined', orgKey) * 20 * DAY));

// ─── PER-PARTICIPANT ACTIVITY TIMES ───────────────────────────────────────────

/** When a participant registered for an event. */
export function registrationTime(eventKey: string, parKey: string): Date {
  const e = EVENT_TIMES[eventKey];
  const start = e.startAt!.getTime();
  let lo = e.publishedAt!.getTime() + 3 * HOUR;
  // nobody signs up at 3 a.m.: for an early-morning event the last sign-ups happen the evening before
  let hi = latestWaking(Math.min(AS_OF.getTime() - 2 * HOUR, start - 45 * MIN));
  // some people join a long programme after it has already started
  if (eventKind(e) === 'long' && rand('late', eventKey, parKey) < 0.25) {
    lo = start + DAY;
    hi = latestWaking(Math.min(AS_OF.getTime() - 2 * HOUR, e.endAt!.getTime() - 3 * HOUR));
  }
  if (hi <= lo) hi = lo + HOUR;
  // demand is U-shaped: an early-bird surge after publishing, then a rush just before the event
  const u = rand('reg', eventKey, parKey);
  const shape = rand('regshape', eventKey, parKey);
  const f = shape < 0.4 ? u * u : shape < 0.75 ? 1 - (1 - u) * (1 - u) : u;
  const t = toWakingHours(lo + f * (hi - lo), lo, 'reg', eventKey, parKey);
  return new Date(Math.round(clamp(t, lo, hi) / MIN) * MIN);
}

/**
 * When a participant was checked in, or null when the timing leaves no room for it
 * (e.g. they registered just before the cut-off of a cancelled event).
 */
export function checkInTime(eventKey: string, parKey: string, registeredAt: Date): Date | null {
  const e = EVENT_TIMES[eventKey];
  const start = e.startAt!.getTime();
  const cap = activityCap(e);
  const earliest = registeredAt.getTime() + 15 * MIN + Math.floor(rand('ci-gap', eventKey, parKey) * 20 * MIN);
  let t: number;
  if (eventKind(e) === 'long') {
    // most people check in at the kick-off; the rest trickle in over the following weeks
    if (registeredAt.getTime() < start && rand('ci-kind', eventKey, parKey) < 0.6) {
      t = start + gauss('ci', eventKey, parKey) * 20 * MIN - 10 * MIN;
    } else {
      const from = Math.max(start + DAY, earliest);
      if (from >= cap) return null;
      t = toWakingHours(from + Math.pow(rand('ci-late', eventKey, parKey), 0.6) * (cap - from), from, 'ci', eventKey, parKey);
    }
  } else {
    // arrivals bunch up just before the start and tail off for about an hour and a half after it
    t = clamp(start - 12 * MIN + gauss('ci', eventKey, parKey) * 18 * MIN, start - 50 * MIN, start + 110 * MIN);
  }
  t = Math.max(t, earliest);
  if (t > cap) return null;
  return new Date(Math.round(t / MIN) * MIN);
}

/** When a checked-in participant submitted feedback, or null when there is no room before AS_OF. */
export function feedbackTime(eventKey: string, parKey: string, checkedInAt: Date): Date | null {
  const e = EVENT_TIMES[eventKey];
  const cap = AS_OF.getTime() - 5 * MIN;
  const from = (e.status === EventStatus.CONCLUDED ? e.endAt!.getTime() : checkedInAt.getTime()) + HOUR;
  if (from >= cap) return null;
  const spread = e.status === EventStatus.CONCLUDED ? 5 * DAY : 21 * DAY; // most answer soon after the event
  const t = toWakingHours(from + Math.pow(rand('fb', eventKey, parKey), 2) * Math.min(spread, cap - from), from, 'fb', eventKey, parKey);
  return new Date(Math.round(Math.min(t, cap) / MIN) * MIN);
}
