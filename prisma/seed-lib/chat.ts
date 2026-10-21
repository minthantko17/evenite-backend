import { EventStatus } from '@prisma/client';
import { EVENT_TIMES, EventTimes, AS_OF, HOUR, MIN, DAY, bangkokParts, localOn, rand } from './timeline';

// ─── DISCUSSION ROOM CONTENT ──────────────────────────────────────────────────
// Realistic conversations per event. Every line is placed on the event's own timeline
// (relative to publishing / start / end) and is only kept when:
//   - it falls between the event being published and AS_OF (the day before the demo),
//   - for CONCLUDED events, within the 72 h the room stays writable after the end,
//   - for a CANCELLED event, before it was cancelled (the room is read-only after),
//   - a participant author had already registered (rooms are only open to registrants).
// Texts that mention dates/times are derived from the event, so they never go stale.

type Moment = (e: EventTimes) => Date;
type Text = string | ((e: EventTimes) => string);

const start =
  (days: number, hhmm: string): Moment =>
  (e) =>
    localOn(e.startAt!, days, hhmm);
const pub =
  (days: number, hhmm: string): Moment =>
  (e) =>
    localOn(e.publishedAt!, days, hhmm);
const end =
  (days: number, hhmm: string): Moment =>
  (e) =>
    localOn(e.endAt!, days, hhmm);
const afterStart =
  (minutes: number): Moment =>
  (e) =>
    new Date(e.startAt!.getTime() + minutes * MIN);
const afterEnd =
  (minutes: number): Moment =>
  (e) =>
    new Date(e.endAt!.getTime() + minutes * MIN);
const beforeCancel =
  (minutes: number): Moment =>
  (e) =>
    new Date(e.cancelledAt!.getTime() - minutes * MIN);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateOf = (d: Date) => {
  const { isoDate } = bangkokParts(d);
  return `${MONTHS[Number(isoDate.slice(5, 7)) - 1]} ${Number(isoDate.slice(8, 10))}`;
};
const timeOf = (d: Date) => {
  const { hour, minute } = bangkokParts(d);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export type ChatLine =
  | { kind: 'org'; at: Moment; text: Text; announce?: boolean }
  | { kind: 'par'; at: Moment; text: Text }
  | { kind: 'qa'; at: Moment; ask: Text; answer: Text; replyAfterMin?: number }
  | { kind: 'chat'; at: Moment; texts: Text[] };

const org = (at: Moment, text: Text, announce = false): ChatLine => ({
  kind: 'org',
  at,
  text,
  announce,
});
const par = (at: Moment, text: Text): ChatLine => ({ kind: 'par', at, text });
const qa = (at: Moment, ask: Text, answer: Text, replyAfterMin?: number): ChatLine => ({ kind: 'qa', at, ask, answer, replyAfterMin });
const chat = (at: Moment, ...texts: Text[]): ChatLine => ({
  kind: 'chat',
  at,
  texts,
});

// Deliberately small (a handful of messages per room, English only): enough to demo the chat,
// unread badges and announcements without drowning the dataset. Events without a script have an empty room.
export const CHAT_SCRIPTS: Record<string, ChatLine[]> = {
  // ── concluded ──
  EVT_HALLOWEEN: [
    org(
      pub(0, '13:00'),
      (e) =>
        `🎃 Welcome to the CAMT Halloween Night 2026 room! Doors open at ${timeOf(e.startAt!)} on ${dateOf(e.startAt!)} at the CAMT Auditorium. Costume contest sign-up is at the registration desk until 18:00.`,
      true,
    ),
    qa(start(-30, '19:40'), 'Do we have to wear a costume to get in?', 'Costumes are encouraged but not required. Come as you are!', 35),
    org(
      start(-1, '18:00'),
      'See you tomorrow! Registration desk opens at 17:00, the costume contest is at 18:00 and the lucky draw at 20:00. Keep your ticket QR ready 👻',
      true,
    ),
    chat(afterStart(150), 'That Mario Kart group is unbeatable 😂', 'The vampire costume is so good!'),
    org(afterEnd(45), 'Thank you all for coming! 🎉 Contest winners: 1st the Mario Kart crew, 2nd Count Dracula, 3rd the Ghostbusters group.', true),
    par(end(1, '10:20'), 'Loved the lucky draw 😂 still cannot believe I won a hoodie'),
  ],
  EVT_HACKATHON: [
    org(
      pub(0, '13:00'),
      'SE Hackathon 2026 is open! 🚀 48 hours, teams of 3–4, prizes for the top 3 teams. Every member needs a ticket QR to enter the Innovation Lab.',
      true,
    ),
    qa(pub(7, '20:20'), 'Can we have a team of 5?', 'Teams are 3–4 members. If you are a group of 5, we can help move one member to another team at the kick-off.'),
    org(start(-2, '18:00'), 'Reminder: bring laptops and chargers. Meals and snacks are provided for the full 48 hours.', true),
    org(afterStart(60), 'Theme revealed: "Tools for a smarter campus" 🎯 Submissions close on the last afternoon at 15:00.', true),
    chat(start(1, '23:10'), 'Pixel Pirates here, our demo is finally running 😅', 'Anyone have an extension cord?'),
    org(afterEnd(180), 'Winners: 1st Cloud Nine, 2nd Git Happens, 3rd Byte Me 🏆 Please fill in the feedback form 🙏', true),
  ],
  EVT_JOBFAIR: [
    org(pub(0, '13:00'), 'Bring printed copies of your resume, 40+ companies attending!', true),
    qa(pub(2, '20:00'), 'Is there a dress code?', 'Business casual is recommended.'),
    org(start(-2, '17:00'), 'Doors open at 09:00 at the CMU Convention Center. Bring your student ID and ticket QR.', true),
    par(afterStart(150), 'Got two interview slots already 🎉'),
    org(afterEnd(240), 'Thank you for coming! If you left your CV at a booth, the companies will contact you within two weeks.', true),
  ],
  EVT_CLEANUP: [
    org(
      pub(0, '12:00'),
      (e) => `🌿 Ping River Clean-Up Day: meet at the Ping River Promenade at ${timeOf(e.startAt!)} on ${dateOf(e.startAt!)}. Gloves, bags and water are provided.`,
      true,
    ),
    qa(pub(14, '20:40'), 'Is it okay if it rains?', 'We go ahead in light rain. If there is a thunderstorm warning, we will announce a postponement here by 05:30.'),
    org(start(-1, '17:00'), 'Tomorrow! Meet near Nawarat Bridge and look for the green banner.', true),
    org(afterEnd(20), 'Thanks everyone!! We collected 148 kg of waste along 1.2 km of riverbank 💚', true),
  ],
  EVT_FRESHMENCAMP: [
    org(
      pub(0, '12:00'),
      (e) => `Welcome to CAMT! Check-in starts at ${timeOf(e.startAt!)} at the main lobby on ${dateOf(e.startAt!)}. Please bring your student ID and a water bottle.`,
      true,
    ),
    qa(pub(20, '21:00'), 'Do we stay overnight?', 'No overnight stay. Each day runs from 08:00 to 17:00. All meals are provided.'),
    chat(afterStart(120), 'My house is Blue 💙', 'Red house here! ❤️'),
    org(afterEnd(60), 'Thank you for three amazing days! Please fill in the camp feedback form 💛', true),
  ],
  EVT_MENTALHEALTH: [
    org(pub(0, '13:00'), 'A friendly workshop on stress management and mental wellness at CAMT Building Room 205. Everything shared stays in the room.', true),
    qa(
      pub(5, '20:10'),
      'Will there be a counselor present?',
      'Yes, a licensed counselor from the CMU Student Wellness Centre leads the session and stays afterwards for questions.',
    ),
    org(afterEnd(40), 'Thanks for being open and kind today 💚 Resources from the session are on the Student Wellness Centre page.', true),
  ],
  // ── cancelled ──
  EVT_FUNRUN: [
    org(
      pub(0, '12:00'),
      '🏃 CMU Charity Fun Run 2026! Choose your distance (3, 5 or 10 km) in the registration form. Proceeds support the student scholarship fund.',
      true,
    ),
    qa(pub(6, '20:00'), 'Can I walk the 5 km?', 'Absolutely, it is a fun run! Walkers start at the back of the pack. Just finish before the 09:00 cut-off.'),
    org(start(-1, '20:00'), 'Weather update: scattered storms are forecast overnight. We will decide by 05:00 and post here.', true),
    par(start(0, '05:40'), 'Here already! Love the rain vibes ☔'),
    org(
      beforeCancel(8),
      '⚠️ Event cancelled: a severe thunderstorm has reached the route, so for everyone’s safety we are ending the run now. Please move to shelter in the Main Gate building.',
      true,
    ),
  ],
  // ── ongoing ──
  EVT_BOOTCAMP: [
    org(
      pub(0, '12:00'),
      (e) => `Welcome to the Coding Bootcamp cohort! We start on ${dateOf(e.startAt!)} in CAMT Computer Lab 1. Please bring a laptop and charger.`,
      true,
    ),
    qa(pub(3, '19:50'), 'Do I need prior experience?', 'Not at all. We start from HTML/CSS basics and work up to full-stack deployment.'),
    org(start(30, '11:00'), 'Mid-programme demo day is on the last Friday of the month. Each of you presents a small project in 5 minutes.'),
    chat(start(60, '21:30'), 'Finally got my first deploy working 🥳', 'Nice!! What stack did you use?'),
  ],
  EVT_DATASCIENCE: [
    org(pub(2, '13:00'), 'Welcome to the Data Science Bootcamp Fall 2026! Sessions are in CAMT Computer Lab 2 every Tuesday and Thursday, 17:30–20:00.', true),
    qa(pub(8, '19:00'), 'Which Python version should we install?', 'Python 3.11 plus Jupyter. A setup guide is pinned on the portal.'),
    org(start(40, '10:00'), 'Assignment 2 is due Friday 23:59. Late submissions lose 10% per day.'),
    chat(start(55, '20:30'), 'Anyone want to form a study group for the midterm? 📊', 'I am in! Library 3rd floor on Saturday?'),
  ],
  EVT_OSS: [
    org(pub(0, '13:00'), '💻 Open Source Contribution Month! Pick a project, make your first pull request and get through code review with mentor support.', true),
    qa(pub(6, '20:30'), 'Do I need to be good at Git?', 'Basic Git is enough. We run a Git warm-up session on the kick-off day.'),
    par(start(10, '22:15'), 'Opened my first PR today! 🎉'),
    org(start(11, '10:00'), 'Great job to everyone who has a PR up! Mentors review within 48 hours. Office hours are on Thursdays at 17:00.'),
    org(start(26, '11:00'), 'Reminder: a short feedback form is open, so tell us what is working and what is not.', true),
  ],
  // ── published (upcoming) ──
  EVT_STARTUPPITCH: [
    org(
      pub(0, '12:00'),
      (e) =>
        `Pitch decks are due two days before the event, on ${dateOf(new Date(e.startAt!.getTime() - 2 * DAY))} at 23:59. Each team gets 5 minutes to pitch and 3 minutes of Q&A.`,
      true,
    ),
    qa(
      pub(15, '20:10'),
      'Can we use a live demo during the pitch?',
      'Yes, but the 5 minutes include setup. We recommend a short recorded fallback in case the Wi-Fi acts up.',
    ),
    org(start(-5, '17:00'), 'Reminder: the pitch order will be posted on the day. Judges include two local founders and one angel investor.', true),
  ],
  EVT_CLOUDTALK: [
    org(pub(0, '13:00'), '☁️ Cloud Careers Tech Talk: engineers from local cloud and DevOps teams share how they got started. Live Q&A at the end.', true),
    qa(pub(3, '20:20'), 'Do I need cloud experience to attend?', 'Not at all, the talk is aimed at beginners.'),
    org(start(-5, '17:00'), (e) => `Reminder: ${timeOf(e.startAt!)} on ${dateOf(e.startAt!)} at the CAMT Auditorium. Bring your ticket QR and your questions!`, true),
  ],
  EVT_ALUMNI: [
    org(pub(0, '13:00'), '🎓 CAMT Alumni Career Panel: hear from alumni in software, data and startups, join a resume clinic, and stay for the networking hour.', true),
    qa(pub(5, '20:00'), 'Should I bring my resume?', 'Yes, bring a printed copy for the resume clinic. We will have alumni reviewers at three tables.'),
    org(
      start(-3, '12:00'),
      (e) => `${dateOf(e.startAt!)} at ${timeOf(e.startAt!)} in the CAMT Auditorium. Panel until 18:30, resume clinic 18:30–19:15, networking hour 19:15–20:00.`,
      true,
    ),
  ],
  EVT_ACOUSTIC: [
    org(
      pub(0, '13:00'),
      '🎸 Acoustic Night on the Library Lawn: student bands and solo performers under the stars. Bring a blanket, or pick a chair spot in the registration form.',
      true,
    ),
    qa(pub(6, '20:10'), 'Can we bring snacks and drinks?', 'Yes, outside snacks are welcome (no glass bottles please). A drinks stall will also be open.'),
    qa(pub(12, '19:50'), 'What if it rains?', 'We would move the show into the Library Hall and announce it here by 15:00 on the day.'),
    chat(pub(20, '21:30'), 'Signed up for the open mic, 2 songs 🎤', 'Can’t wait to hear it!'),
  ],
  EVT_CHESS: [
    org(
      pub(0, '13:00'),
      '♟️ CMU Chess Club Open Tournament: Swiss format, 6 rounds, 15 minutes plus a 5-second increment. All levels welcome, boards and clocks provided.',
      true,
    ),
    qa(pub(15, '21:20'), 'Is a rating required?', 'No! Leave the rating field blank if you do not have one. Round 1 pairings are random.'),
    chat(pub(30, '20:00'), 'Time to dust off my Sicilian 😅', 'I will bring my travel set for blitz between rounds'),
  ],
  EVT_TEDX: [
    org(pub(0, '12:00'), '💡 TEDxChiangMaiUniversity 2026 tickets are live! A day of talks on technology, sustainability and design at the CMU Convention Center.', true),
    qa(pub(4, '21:10'), 'Is there a livestream for those who can’t attend?', 'Yes, we’ll share a livestream link closer to the date.'),
    qa(
      pub(20, '19:40'),
      'Is lunch included?',
      'Lunch is not included, but there are food stalls next to the Convention Center. We have a 60-minute lunch break at 12:00.',
    ),
  ],
  EVT_SUKHOTHAI: [
    org(
      pub(0, '12:00'),
      (e) =>
        `🏛️ Sukhothai Excursion Trip: the bus leaves from the CMU Main Gate at ${timeOf(e.startAt!)} on ${dateOf(e.startAt!)}. Meals are included. Seats are limited, so please cancel early if your plans change.`,
      true,
    ),
    qa(pub(3, '20:10'), 'What should we bring?', 'Comfortable shoes, a hat and sunscreen, a refillable water bottle, and a little cash for souvenirs.'),
  ],
  EVT_CONCERT: [
    org(
      pub(0, '12:00'),
      (e) => `🎶 The CMU Annual Concert 2026 is on ${dateOf(e.startAt!)} at the CMU Main Auditorium. Please choose your seating zone in the registration form.`,
      true,
    ),
    qa(
      pub(8, '20:30'),
      'Can we change our zone after registering?',
      'Yes, until two weeks before the concert. Message us here and we will move you if seats are available.',
    ),
  ],
};

// ─── BUILDING THE MESSAGES ────────────────────────────────────────────────────

export interface ChatRegistrant {
  parKey: string;
  regAt: Date;
  /** could write in the room at some point (false for people who cancelled their own registration) */
  canChat: boolean;
  /** registration is CONFIRMED right now, i.e. the room is still open to them */
  hasAccessNow: boolean;
}

export interface BuiltMessage {
  at: Date;
  content: string;
  isAnnouncement: boolean;
  sender: { type: 'organizer' } | { type: 'participant'; parKey: string };
}

const READ_ONLY_GRACE = 72 * HOUR; // rooms stay writable this long after a concluded event ends

function chatWindow(e: EventTimes): { lower: number; upper: number } {
  let upper = AS_OF.getTime() - MIN;
  if (e.status === EventStatus.CONCLUDED) upper = Math.min(upper, e.endAt!.getTime() + READ_ONLY_GRACE);
  if (e.cancelledAt) upper = Math.min(upper, e.cancelledAt.getTime() - MIN);
  return { lower: e.publishedAt!.getTime() + HOUR, upper };
}

const resolve = (t: Text, e: EventTimes) => (typeof t === 'function' ? t(e) : t);

export function buildRoomMessages(eventKey: string, registrants: ChatRegistrant[]): BuiltMessage[] {
  const script = CHAT_SCRIPTS[eventKey];
  if (!script || registrants.length === 0) return [];
  const e = EVENT_TIMES[eventKey];
  const { lower, upper } = chatWindow(e);
  const inWindow = (d: Date) => d.getTime() >= lower && d.getTime() <= upper;
  const out: BuiltMessage[] = [];
  const recent: string[] = [];

  // a registered participant who has not spoken in the last few messages
  const author = (at: Date, salt: string): string | null => {
    const pool = registrants
      .filter((r) => r.canChat && r.regAt.getTime() + 10 * MIN <= at.getTime())
      .sort((a, b) => rand('who', eventKey, salt, a.parKey) - rand('who', eventKey, salt, b.parKey));
    if (pool.length === 0) return null;
    const chosen = pool.find((r) => !recent.includes(r.parKey)) ?? pool[0];
    recent.push(chosen.parKey);
    if (recent.length > 3) recent.shift();
    return chosen.parKey;
  };

  script.forEach((line, i) => {
    const at = line.at(e);
    if (line.kind === 'org') {
      if (inWindow(at))
        out.push({
          at,
          content: resolve(line.text, e),
          isAnnouncement: !!line.announce,
          sender: { type: 'organizer' },
        });
    } else if (line.kind === 'par') {
      const parKey = inWindow(at) ? author(at, `p${i}`) : null;
      if (parKey)
        out.push({
          at,
          content: resolve(line.text, e),
          isAnnouncement: false,
          sender: { type: 'participant', parKey },
        });
    } else if (line.kind === 'qa') {
      const replyAt = new Date(at.getTime() + (line.replyAfterMin ?? 15 + Math.floor(rand('reply', eventKey, i) * 75)) * MIN);
      const parKey = inWindow(at) && inWindow(replyAt) ? author(at, `q${i}`) : null;
      if (parKey) {
        out.push({
          at,
          content: resolve(line.ask, e),
          isAnnouncement: false,
          sender: { type: 'participant', parKey },
        });
        out.push({
          at: replyAt,
          content: resolve(line.answer, e),
          isAnnouncement: false,
          sender: { type: 'organizer' },
        });
      }
    } else {
      line.texts.forEach((text, k) => {
        const when = new Date(at.getTime() + k * (3 + Math.floor(rand('gap', eventKey, i, k) * 8)) * MIN);
        const parKey = inWindow(when) ? author(when, `c${i}-${k}`) : null;
        if (parKey)
          out.push({
            at: when,
            content: resolve(text, e),
            isAnnouncement: false,
            sender: { type: 'participant', parKey },
          });
      });
    }
  });

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// ─── READ STATUSES ────────────────────────────────────────────────────────────

export interface ReadRow {
  reader: { type: 'organizer' } | { type: 'participant'; parKey: string };
  lastReadSerialNumber: number;
}

const DEMO_ACCOUNTS = new Set(['PAR1', 'PAR2', 'PAR3', 'PAR4', 'PAR5']); // the hand-written accounts people log in as

/**
 * Who has read how far. The owner organizer is almost always caught up; people who wrote
 * in the room have read at least up to their own message; of the rest, many have opened
 * the room and read part of it, and some never opened it (no row at all).
 * Read behaviour follows recency, like real chats: an old, finished conversation has been
 * read by nearly everyone, while rooms with messages from the last few days still show
 * unread badges. The demo accounts are the more diligent readers.
 * `messages` must already be in serial order (serial = index + 1).
 */
export function buildReadStatuses(eventKey: string, messages: BuiltMessage[], registrants: ChatRegistrant[]): ReadRow[] {
  const last = messages.length;
  if (last === 0) return [];
  const e = EVENT_TIMES[eventKey];
  const rows: ReadRow[] = [];
  const recent = messages[last - 1].at.getTime() > AS_OF.getTime() - 3 * DAY;

  rows.push({
    reader: { type: 'organizer' },
    lastReadSerialNumber: rand('org-read', eventKey) < 0.85 ? last : Math.max(1, last - 1 - Math.floor(rand('org-lag', eventKey) * 2)),
  });

  const baseOpened = e.status === EventStatus.CONCLUDED ? 0.8 : e.status === EventStatus.ONGOING ? 0.6 : 0.5;
  for (const r of registrants) {
    if (!r.hasAccessNow) continue; // can no longer open the room
    const demo = DEMO_ACCOUNTS.has(r.parKey);
    // chance of having read everything: higher for old rooms and for diligent readers, lower while the chat is live
    const caughtUp = Math.min(0.95, Math.max(0.1, 0.45 + (demo ? 0.25 : 0) + (recent ? -0.3 : 0.25)));
    const opened = Math.min(0.97, baseOpened + (demo ? 0.35 : 0));
    const ownLast = messages.reduce((m, msg, idx) => (msg.sender.type === 'participant' && msg.sender.parKey === r.parKey ? idx + 1 : m), 0);
    let serial: number;
    if (ownLast > 0) {
      // writing in a room means you were looking at it: usually fully caught up
      serial =
        rand('read-full', eventKey, r.parKey) < Math.max(0.7, caughtUp)
          ? last
          : Math.min(last, ownLast + Math.floor(rand('read-more', eventKey, r.parKey) * (last - ownLast + 1)));
    } else if (rand('read-opened', eventKey, r.parKey) < opened) {
      serial = rand('read-full', eventKey, r.parKey) < caughtUp ? last : 1 + Math.floor(Math.pow(rand('read-part', eventKey, r.parKey), 0.7) * last);
    } else {
      continue; // never opened the room
    }
    rows.push({
      reader: { type: 'participant', parKey: r.parKey },
      lastReadSerialNumber: Math.min(Math.max(serial, 1), last),
    });
  }
  return rows;
}
