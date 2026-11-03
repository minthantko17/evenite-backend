import { FieldType } from '@prisma/client';
import { rand, pick, pickWeighted } from './timeline';

// ─── CROWD PLAN ───────────────────────────────────────────────────────────────
// How many people register for each event (CONFIRMED, including the hand-written
// registrations in seed.ts) and how they behave. Events that are not listed
// (drafts, forms-less test events, the two deliberately FULL events) get no crowd.
//
//   attendRate   concluded: share who showed up; ongoing: share already checked in;
//                cancelled: share already checked in when it was called off
//   qrShare      share of check-ins done by scanning the QR code (the rest: manual)
//   feedbackRate share of attendees who left feedback (only events with a feedback form)

export interface CrowdPlan {
  total: number;
  attendRate: number;
  qrShare: number;
  feedbackRate?: number;
  participantCancelled?: number; // extra registrations the participants themselves cancelled
}

export const CROWD_PLAN: Record<string, CrowdPlan> = {
  // concluded
  EVT_FRESHMENCAMP: {
    total: 22,
    attendRate: 0.9,
    qrShare: 0.9,
    feedbackRate: 0.65,
  },
  EVT_SPORTS: { total: 14, attendRate: 0.78, qrShare: 0.85 },
  EVT_HACKATHON: {
    total: 20,
    attendRate: 0.85,
    qrShare: 0.92,
    feedbackRate: 0.75,
  },
  EVT_BLOODDONATION: { total: 18, attendRate: 0, qrShare: 0 },
  EVT_MENTALHEALTH: { total: 14, attendRate: 0.7, qrShare: 0.85 },
  EVT_CLEANUP: {
    total: 22,
    attendRate: 0.85,
    qrShare: 0.88,
    feedbackRate: 0.7,
  },
  EVT_LIBRARY: { total: 12, attendRate: 0, qrShare: 0 },
  EVT_JOBFAIR: { total: 20, attendRate: 0.72, qrShare: 0.85 },
  EVT_ACOUSTIC: { total: 22, attendRate: 0, qrShare: 0 },
  EVT_CHESS: { total: 20, attendRate: 0, qrShare: 0 },
  EVT_ALUMNI: { total: 24, attendRate: 0, qrShare: 0 },
  EVT_HALLOWEEN: { total: 28, attendRate: 0.86, qrShare: 0.9 },
  // cancelled mid-event: everyone's registration ends up CANCELLED
  EVT_FUNRUN: { total: 12, attendRate: 0.4, qrShare: 0.85 },
  // ongoing programmes
  EVT_BOOTCAMP: { total: 15, attendRate: 0.55, qrShare: 0.85 },
  EVT_DATASCIENCE: { total: 20, attendRate: 0.45, qrShare: 0.85 },
  EVT_GRADINFO: { total: 10, attendRate: 0.3, qrShare: 0.85 },
  EVT_OSS: { total: 22, attendRate: 0.65, qrShare: 0.85, feedbackRate: 0.4 },
  // upcoming (tickets stay ACTIVE)
  EVT_STARTUPPITCH: { total: 16, attendRate: 0, qrShare: 0 },
  EVT_CLOUDTALK: { total: 18, attendRate: 0, qrShare: 0 },
  EVT_TEDX: { total: 26, attendRate: 0, qrShare: 0 },
  EVT_SUKHOTHAI: {
    total: 8,
    attendRate: 0,
    qrShare: 0,
    participantCancelled: 2,
  },
  EVT_CONCERT: { total: 20, attendRate: 0, qrShare: 0 },
};

// ─── REGISTRATION FORM ANSWERS ────────────────────────────────────────────────

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  options: string[];
  autoFillKey: string | null;
}

export type AnswerValue = string | number | string[] | null;

const TEAM_NAMES = [
  'Byte Me',
  'NullPointers',
  'Pixel Pirates',
  'Stack Overflowers',
  'Git Happens',
  'Cloud Nine',
  'Syntax Terror',
  '404 Not Found',
  'Quantum Leap',
  'Code Monkeys',
  'Dark Mode',
  'Brew & Debug',
];
// Startup Pitch teams of two share a team name and a pitch (the hand-written entries use Nimbus and GreenLoop)
const STARTUPS = [
  { team: 'Lanna Lens', pitch: 'Lanna Lens: AR guide to old-city temples' },
  { team: 'ParkIt', pitch: 'ParkIt: live parking spots for CMU' },
  { team: 'StudyMate', pitch: 'StudyMate: peer tutoring marketplace' },
  { team: 'CampusBite', pitch: 'CampusBite: group food ordering' },
  { team: 'MedMinder', pitch: 'MedMinder: pill reminders for seniors' },
  { team: 'RentRoom', pitch: 'RentRoom: verified dorm listings' },
  { team: 'SkillSwap', pitch: 'SkillSwap: trade skills, not money' },
];
const FOCUS_NOTES = [
  'Exam stress and sleep.',
  'How to say no without feeling guilty.',
  'Managing a heavy project workload.',
  'Feeling homesick this semester.',
  'Balancing part-time work and classes.',
];

/** CMU student ids start with the admission year: 68 = freshman … 65 = fourth year. */
function yearOfStudy(studentId: string, options: string[]): string {
  const wanted =
    (
      {
        '68': 'Year 1',
        '67': 'Year 2',
        '66': 'Year 3',
        '65': 'Year 4',
      } as Record<string, string>
    )[studentId.slice(0, 2)] ?? 'Year 3';
  return options.includes(wanted) ? wanted : options[0];
}

function weightedOption(options: string[], table: Record<string, number>, ...parts: (string | number)[]): string {
  return pickWeighted(
    options,
    options.map((o) => table[o] ?? 0.1),
    ...parts,
  );
}

function pickDistinct(options: string[], count: number, ...parts: (string | number)[]): string[] {
  return [...options].sort((a, b) => rand(...parts, a) - rand(...parts, b)).slice(0, count);
}

/** Answers for the registration-form fields that are NOT filled in from the participant's profile. */
export function registrationAnswers(fields: FieldDef[], ctx: { eventKey: string; parKey: string; studentId: string; ordinal: number }): Record<string, AnswerValue> {
  const out: Record<string, AnswerValue> = {};
  const seed = [ctx.eventKey, ctx.parKey];
  for (const f of fields) {
    if (f.autoFillKey) continue;
    const label = f.label.toLowerCase();
    let value: AnswerValue;
    if (f.type === FieldType.CHOICE || f.type === FieldType.CHECKBOX) {
      if (label.includes('health declaration'))
        value = [f.options[0]]; // required consent: everyone ticks it
      else if (label.includes('year of study')) value = [yearOfStudy(ctx.studentId, f.options)];
      else if (label.includes('dietary')) value = [weightedOption(f.options, { None: 0.62, Vegetarian: 0.18, Vegan: 0.06, Halal: 0.14 }, 'diet', ...seed)];
      else if (label.includes('t-shirt')) value = [weightedOption(f.options, { S: 0.16, M: 0.34, L: 0.3, XL: 0.15, XXL: 0.05 }, 'shirt', ...seed)];
      else if (label.includes('experience')) value = [weightedOption(f.options, { Beginner: 0.45, Intermediate: 0.38, Advanced: 0.17 }, 'xp', ...seed)];
      else if (label.includes('blood type')) value = [weightedOption(f.options, { A: 0.2, B: 0.33, AB: 0.08, O: 0.37, Unknown: 0.02 }, 'blood', ...seed)];
      else if (label.includes('program of interest')) value = [weightedOption(f.options, { Master: 0.75, PhD: 0.25 }, 'prog', ...seed)];
      else if (label.includes('distance')) value = [pickWeighted(f.options, [0.35, 0.4, 0.25], 'dist', ...seed)];
      else if (label.includes('cloud provider')) value = [weightedOption(f.options, { AWS: 0.35, Azure: 0.15, 'Google Cloud': 0.2, 'None yet': 0.3 }, 'cloud', ...seed)];
      else if (label.includes('preferred language')) value = [weightedOption(f.options, { Python: 0.3, TypeScript: 0.35, Go: 0.2, Rust: 0.15 }, 'lang', ...seed)];
      else if (label.includes('industry of interest')) value = [weightedOption(f.options, { Tech: 0.4 }, 'ind', ...seed)];
      else value = f.type === FieldType.CHECKBOX ? pickDistinct(f.options, 1, 'cb', f.id, ...seed) : [pick(f.options, 'ch', f.id, ...seed)];
    } else if (f.type === FieldType.NUMBER) {
      if (label.includes('gpa')) value = Math.round((2.4 + rand('gpa', ...seed) * 1.55) * 100) / 100;
      else if (label.includes('chess rating')) value = rand('chess-has', ...seed) < 0.55 ? 900 + Math.floor(rand('chess', ...seed) * 950) : null;
      // optional: many do not know it
      else value = 1 + Math.floor(rand('num', f.id, ...seed) * 5);
    } else if (f.type === FieldType.TEXT) {
      if (ctx.eventKey === 'EVT_STARTUPPITCH' && (label.includes('team name') || label.includes('pitch title'))) {
        const startup = STARTUPS[Math.floor(ctx.ordinal / 2) % STARTUPS.length];
        value = label.includes('pitch') ? startup.pitch : `Team ${startup.team}`;
      } else if (label.includes('team name'))
        value = TEAM_NAMES[Math.floor(ctx.ordinal / 3) % TEAM_NAMES.length]; // hackathon teams of three
      else if (label.includes('faculty')) value = pickWeighted(['CAMT', 'Engineering', 'Science', 'Fine Arts'], [0.7, 0.14, 0.1, 0.06], 'fac', ...seed);
      else value = 'N/A';
    } else if (f.type === FieldType.TEXTAREA) {
      value = !f.isRequired && rand('ta-has', ...seed) < 0.45 ? FOCUS_NOTES[Math.floor(rand('ta', ...seed) * FOCUS_NOTES.length)] : f.isRequired ? 'N/A' : null;
    } else if (f.type === FieldType.DATE) {
      value = '2026-10-01';
    } else {
      value = null; // RATING never appears on registration forms
    }
    out[f.id] = value;
  }
  return out;
}

// ─── FEEDBACK FORM ANSWERS ────────────────────────────────────────────────────

const POSITIVE = [
  'Really well organized, would love to join again!',
  'Great atmosphere and friendly staff.',
  'I learned a lot and met new people. Thank you!',
  'The schedule ran on time and everything was clear.',
  'Fun from start to finish 🙌',
  'Great value for a free event, thank you to the team!',
  'The venue and the activities were perfect.',
];
const NEUTRAL = [
  'Good overall, but the check-in line was slow at the start.',
  'Nice event. A few more seats would have helped.',
  'Useful content, although some parts ran longer than planned.',
];
const CONSTRUCTIVE = ['It started almost 30 minutes late and the updates were unclear.', 'Too crowded, and hard to hear from the back. Please improve the sound.'];
const SPECIFIC: Record<string, string[]> = {
  EVT_HACKATHON: [
    'The mentors were super helpful and the 48-hour format really pushed us.',
    'More power sockets at the tables next time please!',
    'Loved the midnight snack run 😄',
  ],
  EVT_CLEANUP: ['We collected so much plastic from the riverbank. It was eye-opening.', 'Please bring gloves in smaller sizes next time.'],
  EVT_FRESHMENCAMP: ['Made my first friends at CAMT here!', 'The night games were the best part.', 'Senior staff were so kind and funny.'],
  EVT_ACOUSTIC: ['The opening band was fantastic, and I loved the lawn setting.', 'A bit chilly near the end. Maybe remind people to bring jackets?'],
  EVT_ALUMNI: ['The resume clinic alone was worth it.', 'I would love a longer Q&A with the panel.', 'Great to hear honest stories about first jobs.'],
  EVT_OSS: ['My first merged PR, thank you mentors!', 'Hard to find a beginner-friendly issue at first.', 'The weekly office hours really help.'],
};

/** Answers for a feedback form. Ratings, choices and comments follow one overall mood per respondent. */
export function feedbackAnswers(fields: FieldDef[], ctx: { eventKey: string; parKey: string }): Record<string, AnswerValue> {
  const seed = [ctx.eventKey, ctx.parKey];
  const overall = pickWeighted([1, 2, 3, 4, 5], [0.02, 0.05, 0.18, 0.4, 0.35], 'overall', ...seed);
  const other = Math.min(5, Math.max(1, overall + pick([-1, 0, 0, 1], 'other', ...seed)));
  const out: Record<string, AnswerValue> = {};
  for (const f of fields) {
    const label = f.label.toLowerCase();
    if (f.type === FieldType.RATING) {
      out[f.id] = label.includes('overall') ? overall : other;
    } else if (f.type === FieldType.CHOICE) {
      if (label.includes('again')) {
        const table = overall >= 4 ? [0.8, 0.2, 0] : overall === 3 ? [0.3, 0.6, 0.1] : [0.05, 0.45, 0.5];
        out[f.id] = [
          pickWeighted(
            ['Yes', 'Maybe', 'No'].filter((o) => f.options.includes(o)),
            table.slice(0, f.options.length),
            'again',
            ...seed,
          ),
        ];
      } else {
        out[f.id] = [pick(f.options, 'fbchoice', f.id, ...seed)];
      }
    } else if (f.type === FieldType.CHECKBOX) {
      out[f.id] = pickDistinct(f.options, 1 + Math.floor(rand('fbcb', f.id, ...seed) * 3), 'fbcb2', f.id, ...seed);
    } else if (f.type === FieldType.TEXTAREA || f.type === FieldType.TEXT) {
      if (rand('fbtext', ...seed) < 0.62) {
        const pool = overall >= 4 ? [...POSITIVE, ...(SPECIFIC[ctx.eventKey] ?? []), ...(SPECIFIC[ctx.eventKey] ?? [])] : overall === 3 ? NEUTRAL : CONSTRUCTIVE;
        out[f.id] = pool[Math.floor(rand('fbpick', ...seed) * pool.length)];
      } else {
        out[f.id] = null; // optional comment left blank
      }
    } else {
      out[f.id] = null;
    }
  }
  return out;
}
