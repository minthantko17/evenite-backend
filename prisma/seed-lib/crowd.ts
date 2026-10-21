import { ALLOWED_PERSONAL_PREFERENCES } from '../../src/user/constants/user-preferences.constant';
import { ALLOWED_CATEGORIES } from '../../src/event/constants/event-category.constant';
import { rand, pick } from './timeline';

// ─── EXTRA PARTICIPANTS (participant6 … participant35 @cmu.ac.th) ─────────────
// A realistic student body so event lists, charts and chats have real volume.
// All use the same password as the other seeded accounts (12345678).
// Student IDs follow the CMU pattern: 65/66/67/68 = admission year (68 = freshman).

export interface ParticipantSeed {
  id: string; // ParticipantProfile.id
  userId: string; // User.id
  firstName: string;
  lastName: string;
  nickname: string;
  studentId: string;
  major: string;
  email: string;
  phone: string;
  lineId: string;
  imageUrl: string;
}

// [firstName, lastName, nickname, studentId, major]
const ROWS: [string, string, string, string, string][] = [
  ['Siriporn', 'Chaiyasit', 'Ploy', '662115601', 'Software Engineering'],
  ['Thanawat', 'Phromma', 'Bank', '662115612', 'Information Technology'],
  ['Kanokwan', 'Srichai', 'Nong', '672115623', 'Digital Industry Integration'],
  ['Aung Kyaw', 'Htet', 'Aung', '662115634', 'Computer Science'],
  ['Napat', 'Wongsawat', 'Nap', '652115645', 'Software Engineering'],
  ['Pitchaya', 'Boonmee', 'Fon', '672115656', 'Animation and Visual Effects'],
  ['Nattawut', 'Saetang', 'Tae', '662115667', 'Computer Engineering'],
  ['Hnin Wai', 'Phyo', 'Wai', '672115678', 'Software Engineering'],
  ['Chanikarn', 'Rattanakorn', 'Mint', '682115689', 'Knowledge and Innovation Management'],
  ['Warut', 'Thongdee', 'Win', '662115690', 'Information Technology'],
  ['Sasithorn', 'Kaewmala', 'Ann', '672115701', 'Computer Science'],
  ['Phyo', 'Thura', 'Thura', '652115712', 'Software Engineering'],
  ['Jirapat', 'Lertsakul', 'Ben', '682115723', 'Computer Engineering'],
  ['Nutchanan', 'Pongsri', 'Namtan', '662115734', 'Digital Industry Integration'],
  ['Kittipong', 'Duangchan', 'Kit', '672115745', 'Information Technology'],
  ['Moe Thida', 'Aye', 'Moe', '672115756', 'Animation and Visual Effects'],
  ['Pimlada', 'Sukjai', 'Pam', '682115767', 'Software Engineering'],
  ['Tanakorn', 'Wiriya', 'Tan', '652115778', 'Computer Science'],
  ['Sakura', 'Tanaka', 'Sakura', '672115789', 'Software Engineering'], // exchange student
  ['Arthit', 'Chotiwan', 'Art', '662115790', 'Computer Engineering'],
  ['Supawadee', 'Intharat', 'Fah', '672115801', 'Knowledge and Innovation Management'],
  ['Zaw Min', 'Latt', 'Zaw', '662115812', 'Information Technology'],
  ['Rattikorn', 'Sangthong', 'Tik', '682115823', 'Software Engineering'],
  ['Mai Linh', 'Nguyen', 'Linh', '672115834', 'Digital Industry Integration'],
  ['Chayanit', 'Pattanakul', 'Chay', '662115845', 'Computer Science'],
  ['Phurin', 'Anantawong', 'Pun', '652115856', 'Software Engineering'],
  ['Ei Mon', 'Khine', 'Mon', '682115867', 'Information Technology'],
  ['Natthida', 'Rungruang', 'Dida', '672115878', 'Animation and Visual Effects'],
  ['Teerapat', 'Saelim', 'Best', '662115889', 'Computer Engineering'],
  ['Kamonchanok', 'Suwan', 'Kook', '682115890', 'Software Engineering'],
];

const FIRST_CROWD_NUMBER = 6; // participant6

export const CROWD_PARTICIPANTS: Record<string, ParticipantSeed> = {};
export const CROWD_PREFERENCES: Record<string, { personal: string[]; event: string[]; language: string[] }> = {};

ROWS.forEach(([firstName, lastName, nickname, studentId, major], i) => {
  const n = FIRST_CROWD_NUMBER + i; // 6 … 35
  const key = `PAR${n}`;
  CROWD_PARTICIPANTS[key] = {
    id: `d${String(n).padStart(7, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`,
    userId: `b${String(n + 3).padStart(7, '0')}-0000-4000-8000-${String(n + 3).padStart(12, '0')}`,
    firstName,
    lastName,
    nickname,
    studentId,
    major,
    email: `participant${n}@cmu.ac.th`,
    phone: `0${823456780 + n}`, // continues the originals' 0823456781-85: 0823456786 … 0823456815
    lineId: `${nickname.toLowerCase()}_line`,
    // the shared bucket only holds the five original avatars, so everyone else gets a neutral initials placeholder
    imageUrl: `https://placehold.co/400x400?text=${encodeURIComponent(nickname)}`,
  };
  // preferences must only use the values the API accepts (user-preferences.constant)
  const nPersonal = 1 + Math.floor(rand('pref-personal-n', key) * 3);
  const nEvent = 1 + Math.floor(rand('pref-event-n', key) * 3);
  CROWD_PREFERENCES[key] = {
    personal: Array.from(new Set(Array.from({ length: nPersonal }, (_, k) => pick(ALLOWED_PERSONAL_PREFERENCES, 'pp', key, k)))),
    event: Array.from(new Set(Array.from({ length: nEvent }, (_, k) => pick(ALLOWED_CATEGORIES, 'pe', key, k)))),
    language: rand('pref-lang', key) < 0.55 ? ['en', 'th'] : rand('pref-lang2', key) < 0.5 ? ['th'] : ['en'],
  };
});
