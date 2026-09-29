import {
  PrismaClient,
  EventStatus,
  FormType,
  FieldType,
  Role,
  RegistrationStatus,
  TicketStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// (generated with Claude)

const prisma = new PrismaClient();

// ─── FIXED IDs ────────────────────────────────────────────────────────────────

const ID = {
  // University
  CMU: 'a0000001-0000-4000-8000-000000000001',

  // Users — organizers
  USER_ORG1: 'b0000001-0000-4000-8000-000000000001',
  USER_ORG2: 'b0000002-0000-4000-8000-000000000002',
  USER_ORG3: 'b0000003-0000-4000-8000-000000000003',

  // Users — participants
  USER_PAR1: 'b0000004-0000-4000-8000-000000000004',
  USER_PAR2: 'b0000005-0000-4000-8000-000000000005',
  USER_PAR3: 'b0000006-0000-4000-8000-000000000006',
  USER_PAR4: 'b0000007-0000-4000-8000-000000000007',
  USER_PAR5: 'b0000008-0000-4000-8000-000000000008',

  // Organizer Profiles
  ORG1: 'c0000001-0000-4000-8000-000000000001',
  ORG2: 'c0000002-0000-4000-8000-000000000002',
  ORG3: 'c0000003-0000-4000-8000-000000000003',

  // Participant Profiles
  PAR1: 'd0000001-0000-4000-8000-000000000001',
  PAR2: 'd0000002-0000-4000-8000-000000000002',
  PAR3: 'd0000003-0000-4000-8000-000000000003',
  PAR4: 'd0000004-0000-4000-8000-000000000004',
  PAR5: 'd0000005-0000-4000-8000-000000000005',

  // Events
  EVT_HALLOWEEN:   'e0000001-0000-4000-8000-000000000001', // PUBLISHED, limit 100, 3 regs
  EVT_NEW_YEAR:    'e0000002-0000-4000-8000-000000000002', // PUBLISHED, limit 5, FULL (5 regs)
  EVT_SUKHOTHAI:   'e0000003-0000-4000-8000-000000000003', // PUBLISHED, limit 10, 1 conf + 1 cancel
  EVT_EXCHANGE:    'e0000004-0000-4000-8000-000000000004', // ONGOING, limit 3, FULL (3 regs)
  EVT_BOOTCAMP:    'e0000005-0000-4000-8000-000000000005', // ONGOING, limit 25, 2 regs
  EVT_HACKATHON:   'e0000006-0000-4000-8000-000000000006', // CONCLUDED, limit 60, 2 regs (tickets EXPIRED)
  EVT_SPORTS:      'e0000007-0000-4000-8000-000000000007', // CONCLUDED, no limit, 2 regs (tickets EXPIRED)
  EVT_ORIENTATION: 'e0000008-0000-4000-8000-000000000008', // CONCLUDED, limit 200, no regs
  EVT_AI_SEMINAR:  'e0000009-0000-4000-8000-000000000009', // ONGOING, limit 50, no form (useful for FormNotFoundException test)
  EVT_NO_FORM:     'e0000010-0000-4000-8000-000000000010', // PUBLISHED, no limit, no form
  EVT_DRAFT1:      'e0000011-0000-4000-8000-000000000011', // DRAFT, limit 30
  EVT_DRAFT2:      'e0000012-0000-4000-8000-000000000012', // DRAFT, limit 150
  EVT_DRAFT3:      'e0000013-0000-4000-8000-000000000013', // DRAFT, no limit
  EVT_CONCERT:     'e0000014-0000-4000-8000-000000000014', // PUBLISHED, limit 300, no regs yet

  EVT_TEDX:          'e0000015-0000-4000-8000-000000000015', // PUBLISHED, limit 400, 2 regs
  EVT_JOBFAIR:       'e0000016-0000-4000-8000-000000000016', // PUBLISHED, no limit, 2 regs
  EVT_BLOODDONATION: 'e0000017-0000-4000-8000-000000000017', // PUBLISHED, limit 150, no regs yet
  EVT_FRESHYNIGHT:   'e0000018-0000-4000-8000-000000000018', // DRAFT, no form
  EVT_STARTUPPITCH:  'e0000019-0000-4000-8000-000000000019', // PUBLISHED, limit 60, 2 regs
  EVT_FOOTBALL:      'e0000020-0000-4000-8000-000000000020', // ONGOING, no limit, no form
  EVT_PHOTOEXHIBIT:  'e0000021-0000-4000-8000-000000000021', // PUBLISHED, no limit, no form
  EVT_CLEANUP:       'e0000022-0000-4000-8000-000000000022', // CONCLUDED, limit 80, 2 regs (tickets EXPIRED, read-only)
  EVT_MENTALHEALTH:  'e0000023-0000-4000-8000-000000000023', // PUBLISHED, limit 40, no regs yet
  EVT_OPENHOUSE:     'e0000024-0000-4000-8000-000000000024', // DRAFT, no form
  EVT_DATASCIENCE:   'e0000025-0000-4000-8000-000000000025', // ONGOING, limit 30, 2 regs
  EVT_CHESS:         'e0000026-0000-4000-8000-000000000026', // PUBLISHED, limit 32, no regs yet
  EVT_FOODFEST:      'e0000027-0000-4000-8000-000000000027', // PUBLISHED, no limit, no form
  EVT_ROBOTICS:      'e0000028-0000-4000-8000-000000000028', // CONCLUDED, limit 100, no form
  EVT_FRESHMENCAMP:  'e0000029-0000-4000-8000-000000000029', // CONCLUDED, limit 300, 3 regs (tickets EXPIRED, read-only)
  EVT_CHOIR:         'e0000030-0000-4000-8000-000000000030', // DRAFT, no form
  EVT_LIBRARY:       'e0000031-0000-4000-8000-000000000031', // PUBLISHED, limit 25, no regs yet
  EVT_PRIDEWEEK:     'e0000032-0000-4000-8000-000000000032', // PUBLISHED, no limit, no form
  EVT_MUAYTHAI:      'e0000033-0000-4000-8000-000000000033', // CONCLUDED, no limit, no form
  EVT_GRADINFO:      'e0000034-0000-4000-8000-000000000034', // ONGOING, limit 100, no regs yet

  // Forms
  FORM_HALLOWEEN_REG:  'f0000001-0000-4000-8000-000000000001',
  FORM_NEW_YEAR_REG:   'f0000002-0000-4000-8000-000000000002',
  FORM_NEW_YEAR_FB:    'f0000003-0000-4000-8000-000000000003',
  FORM_SUKHOTHAI_REG:  'f0000004-0000-4000-8000-000000000004',
  FORM_EXCHANGE_REG:   'f0000005-0000-4000-8000-000000000005',
  FORM_BOOTCAMP_REG:   'f0000006-0000-4000-8000-000000000006',
  FORM_HACKATHON_REG:  'f0000007-0000-4000-8000-000000000007',
  FORM_HACKATHON_FB:   'f0000008-0000-4000-8000-000000000008',
  FORM_SPORTS_REG:     'f0000009-0000-4000-8000-000000000009',
  FORM_CONCERT_REG:    'f0000010-0000-4000-8000-000000000010',

  FORM_TEDX_REG:          'f0000011-0000-4000-8000-000000000011',
  FORM_JOBFAIR_REG:       'f0000012-0000-4000-8000-000000000012',
  FORM_BLOODDONATION_REG: 'f0000013-0000-4000-8000-000000000013',
  FORM_STARTUPPITCH_REG:  'f0000014-0000-4000-8000-000000000014',
  FORM_CLEANUP_REG:       'f0000015-0000-4000-8000-000000000015',
  FORM_MENTALHEALTH_REG:  'f0000016-0000-4000-8000-000000000016',
  FORM_DATASCIENCE_REG:   'f0000017-0000-4000-8000-000000000017',
  FORM_CHESS_REG:         'f0000018-0000-4000-8000-000000000018',
  FORM_FRESHMENCAMP_REG:  'f0000019-0000-4000-8000-000000000019',
  FORM_LIBRARY_REG:       'f0000020-0000-4000-8000-000000000020',
  FORM_GRADINFO_REG:      'f0000021-0000-4000-8000-000000000021',

  // Form Fields — Halloween Reg
  FLD_H_FIRSTNAME: 'ff000001-0000-4000-8000-000000000001',
  FLD_H_LASTNAME:  'ff000002-0000-4000-8000-000000000002',
  FLD_H_STUDENTID: 'ff000003-0000-4000-8000-000000000003',
  FLD_H_YEAR:      'ff000004-0000-4000-8000-000000000004',
  FLD_H_DIET:      'ff000005-0000-4000-8000-000000000005',

  // Form Fields — New Year Reg
  FLD_NY_FIRSTNAME: 'ff000010-0000-4000-8000-000000000010',
  FLD_NY_NICKNAME:  'ff000011-0000-4000-8000-000000000011',
  FLD_NY_STUDENTID: 'ff000012-0000-4000-8000-000000000012',
  FLD_NY_MAJOR:     'ff000013-0000-4000-8000-000000000013',
  FLD_NY_TSHIRT:    'ff000014-0000-4000-8000-000000000014',

  // Form Fields — New Year Feedback
  FLD_NYFB_OVERALL: 'ff000020-0000-4000-8000-000000000020',
  FLD_NYFB_ORG:     'ff000021-0000-4000-8000-000000000021',
  FLD_NYFB_COMMENT: 'ff000022-0000-4000-8000-000000000022',

  // Form Fields — Sukhothai Reg
  FLD_SK_FIRSTNAME: 'ff000030-0000-4000-8000-000000000030',
  FLD_SK_STUDENTID: 'ff000031-0000-4000-8000-000000000031',
  FLD_SK_DIETARY:   'ff000032-0000-4000-8000-000000000032',

  // Form Fields — Exchange Reg
  FLD_EX_FIRSTNAME: 'ff000040-0000-4000-8000-000000000040',
  FLD_EX_STUDENTID: 'ff000041-0000-4000-8000-000000000041',
  FLD_EX_MAJOR:     'ff000042-0000-4000-8000-000000000042',
  FLD_EX_GPA:       'ff000043-0000-4000-8000-000000000043',

  // Form Fields — Bootcamp Reg
  FLD_BC_FIRSTNAME:   'ff000050-0000-4000-8000-000000000050',
  FLD_BC_STUDENTID:   'ff000051-0000-4000-8000-000000000051',
  FLD_BC_EXPERIENCE:  'ff000052-0000-4000-8000-000000000052',

  // Form Fields — Hackathon Reg
  FLD_HK_FIRSTNAME: 'ff000060-0000-4000-8000-000000000060',
  FLD_HK_LASTNAME:  'ff000061-0000-4000-8000-000000000061',
  FLD_HK_STUDENTID: 'ff000062-0000-4000-8000-000000000062',
  FLD_HK_TEAMNAME:  'ff000063-0000-4000-8000-000000000063',

  // Form Fields — Hackathon Feedback
  FLD_HKFB_OVERALL: 'ff000070-0000-4000-8000-000000000070',
  FLD_HKFB_COMMENT: 'ff000071-0000-4000-8000-000000000071',

  // Form Fields — Sports Reg (minimal — just name)
  FLD_SP_FIRSTNAME: 'ff000080-0000-4000-8000-000000000080',
  FLD_SP_SPORT:     'ff000081-0000-4000-8000-000000000081',

  // Form Fields — Concert Reg
  FLD_CN_FIRSTNAME: 'ff000090-0000-4000-8000-000000000090',
  FLD_CN_STUDENTID: 'ff000091-0000-4000-8000-000000000091',
  FLD_CN_SECTION:   'ff000092-0000-4000-8000-000000000092',

  // Form Fields — TEDx Reg
  FLD_TX_FIRSTNAME: 'ff000100-0000-4000-8000-000000000100',
  FLD_TX_STUDENTID: 'ff000101-0000-4000-8000-000000000101',
  FLD_TX_TOPIC:     'ff000102-0000-4000-8000-000000000102',

  // Form Fields — Job Fair Reg
  FLD_JF_FIRSTNAME: 'ff000110-0000-4000-8000-000000000110',
  FLD_JF_MAJOR:     'ff000111-0000-4000-8000-000000000111',
  FLD_JF_INDUSTRY:  'ff000112-0000-4000-8000-000000000112',

  // Form Fields — Blood Donation Reg
  FLD_BD_FIRSTNAME: 'ff000120-0000-4000-8000-000000000120',
  FLD_BD_STUDENTID: 'ff000121-0000-4000-8000-000000000121',
  FLD_BD_BLOODTYPE: 'ff000122-0000-4000-8000-000000000122',
  FLD_BD_HEALTHOK:  'ff000123-0000-4000-8000-000000000123',

  // Form Fields — Startup Pitch Reg
  FLD_SP2_TEAMNAME:  'ff000130-0000-4000-8000-000000000130',
  FLD_SP2_FIRSTNAME: 'ff000131-0000-4000-8000-000000000131',
  FLD_SP2_PITCHNAME: 'ff000132-0000-4000-8000-000000000132',

  // Form Fields — Cleanup Day Reg
  FLD_CU_FIRSTNAME: 'ff000140-0000-4000-8000-000000000140',
  FLD_CU_STUDENTID: 'ff000141-0000-4000-8000-000000000141',
  FLD_CU_TSHIRT:    'ff000142-0000-4000-8000-000000000142',

  // Form Fields — Mental Health Workshop Reg
  FLD_MH_FIRSTNAME: 'ff000150-0000-4000-8000-000000000150',
  FLD_MH_FOCUS:     'ff000151-0000-4000-8000-000000000151',

  // Form Fields — Data Science Bootcamp Reg
  FLD_DS_FIRSTNAME:  'ff000160-0000-4000-8000-000000000160',
  FLD_DS_STUDENTID:  'ff000161-0000-4000-8000-000000000161',
  FLD_DS_EXPERIENCE: 'ff000162-0000-4000-8000-000000000162',

  // Form Fields — Chess Tournament Reg
  FLD_CH_FIRSTNAME: 'ff000170-0000-4000-8000-000000000170',
  FLD_CH_RATING:    'ff000171-0000-4000-8000-000000000171',

  // Form Fields — Freshmen Camp Reg
  FLD_FC_FIRSTNAME: 'ff000180-0000-4000-8000-000000000180',
  FLD_FC_LASTNAME:  'ff000181-0000-4000-8000-000000000181',
  FLD_FC_STUDENTID: 'ff000182-0000-4000-8000-000000000182',
  FLD_FC_FACULTY:   'ff000183-0000-4000-8000-000000000183',

  // Form Fields — Library Research Workshop Reg
  FLD_LB_FIRSTNAME: 'ff000190-0000-4000-8000-000000000190',
  FLD_LB_STUDENTID: 'ff000191-0000-4000-8000-000000000191',

  // Form Fields — Grad School Info Session Reg
  FLD_GI_FIRSTNAME: 'ff000200-0000-4000-8000-000000000200',
  FLD_GI_PROGRAM:   'ff000201-0000-4000-8000-000000000201',

  // Discussion Rooms — one per event
  ROOM_HALLOWEEN:   '90000001-0000-4000-8000-000000000001',
  ROOM_NEW_YEAR:    '90000002-0000-4000-8000-000000000002',
  ROOM_SUKHOTHAI:   '90000003-0000-4000-8000-000000000003',
  ROOM_EXCHANGE:    '90000004-0000-4000-8000-000000000004',
  ROOM_BOOTCAMP:    '90000005-0000-4000-8000-000000000005',
  ROOM_HACKATHON:   '90000006-0000-4000-8000-000000000006',
  ROOM_SPORTS:      '90000007-0000-4000-8000-000000000007',
  ROOM_ORIENTATION: '90000008-0000-4000-8000-000000000008',
  ROOM_AI_SEMINAR:  '90000009-0000-4000-8000-000000000009',
  ROOM_NO_FORM:     '90000010-0000-4000-8000-000000000010',
  ROOM_DRAFT1:      '90000011-0000-4000-8000-000000000011',
  ROOM_DRAFT2:      '90000012-0000-4000-8000-000000000012',
  ROOM_DRAFT3:      '90000013-0000-4000-8000-000000000013',
  ROOM_CONCERT:     '90000014-0000-4000-8000-000000000014',

  ROOM_TEDX:          '90000015-0000-4000-8000-000000000015',
  ROOM_JOBFAIR:       '90000016-0000-4000-8000-000000000016',
  ROOM_BLOODDONATION: '90000017-0000-4000-8000-000000000017',
  ROOM_FRESHYNIGHT:   '90000018-0000-4000-8000-000000000018',
  ROOM_STARTUPPITCH:  '90000019-0000-4000-8000-000000000019',
  ROOM_FOOTBALL:      '90000020-0000-4000-8000-000000000020',
  ROOM_PHOTOEXHIBIT:  '90000021-0000-4000-8000-000000000021',
  ROOM_CLEANUP:       '90000022-0000-4000-8000-000000000022',
  ROOM_MENTALHEALTH:  '90000023-0000-4000-8000-000000000023',
  ROOM_OPENHOUSE:     '90000024-0000-4000-8000-000000000024',
  ROOM_DATASCIENCE:   '90000025-0000-4000-8000-000000000025',
  ROOM_CHESS:         '90000026-0000-4000-8000-000000000026',
  ROOM_FOODFEST:      '90000027-0000-4000-8000-000000000027',
  ROOM_ROBOTICS:      '90000028-0000-4000-8000-000000000028',
  ROOM_FRESHMENCAMP:  '90000029-0000-4000-8000-000000000029',
  ROOM_CHOIR:         '90000030-0000-4000-8000-000000000030',
  ROOM_LIBRARY:       '90000031-0000-4000-8000-000000000031',
  ROOM_PRIDEWEEK:     '90000032-0000-4000-8000-000000000032',
  ROOM_MUAYTHAI:      '90000033-0000-4000-8000-000000000033',
  ROOM_GRADINFO:      '90000034-0000-4000-8000-000000000034',
};

// ─── PARTICIPANT PROFILE DATA ─────────────────────────────────────────────────

const PARTICIPANT_DATA = {
  PAR1: {
    id: ID.PAR1,
    firstName: 'Su Su',
    lastName: 'Myint',
    nickname: 'Su',
    studentId: '662115522',
    major: 'Software Engineering',
    email: 'participant1@cmu.ac.th',
    phone: '0823456781',
    lineId: 'susu_line',
    imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/parti1.jpg',
  },
  PAR2: {
    id: ID.PAR2,
    firstName: 'Chaiwat',
    lastName: 'Srisuk',
    nickname: 'Chai',
    studentId: '662115533',
    major: 'Computer Engineering',
    email: 'participant2@cmu.ac.th',
    phone: '0823456782',
    lineId: 'chai_line',
    imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/parti2.jpg',
  },
  PAR3: {
    id: ID.PAR3,
    firstName: 'Min Thant',
    lastName: 'Ko',
    nickname: 'Min',
    studentId: '662115510',
    major: 'Software Engineering',
    email: 'participant3@cmu.ac.th',
    phone: '0823456783',
    lineId: 'min_line',
    imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/parti3.jpg',
  },
  PAR4: {
    id: ID.PAR4,
    firstName: 'Nattapon',
    lastName: 'Wongkham',
    nickname: 'Palm',
    studentId: '662115544',
    major: 'Information Technology',
    email: 'participant4@cmu.ac.th',
    phone: '0823456784',
    lineId: 'palm_line',
    imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/parti4.jpg',
  },
  PAR5: {
    id: ID.PAR5,
    firstName: 'Pimchanok',
    lastName: 'Rattana',
    nickname: 'Pim',
    studentId: '662115555',
    major: 'Computer Science',
    email: 'participant5@cmu.ac.th',
    phone: '0823456785',
    lineId: 'pim_line',
    imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/parti5.jpg',
  },
};

// ─── HELPER: resolve answer value for a field ─────────────────────────────────

function resolveAnswer(
  fieldId: string,
  participant: (typeof PARTICIPANT_DATA)[keyof typeof PARTICIPANT_DATA],
  formFields: { id: string; autoFillKey: string | null; type: FieldType; options: string[] }[],
  extraAnswers: Record<string, string | number | string[]> = {},
): string | number | string[] | null {
  const field = formFields.find((f) => f.id === fieldId);
  if (!field) return null;

  // use extra answers override first
  if (extraAnswers[fieldId] !== undefined) return extraAnswers[fieldId];

  // auto-fill from profile
  if (field.autoFillKey) {
    const map: Record<string, string | null> = {
      firstName: participant.firstName,
      lastName: participant.lastName,
      nickname: participant.nickname,
      studentId: participant.studentId,
      major: participant.major,
      contactEmail: participant.email,
      contactPhone: participant.phone,
      contactLineId: participant.lineId,
    };
    return map[field.autoFillKey] ?? '';
  }

  // default values by field type
  switch (field.type) {
    case FieldType.CHOICE:
      return field.options.length > 0 ? [field.options[0]] : [];
    case FieldType.CHECKBOX:
      return field.options.length > 0 ? [field.options[0]] : [];
    case FieldType.NUMBER:
    case FieldType.RATING:
      return 3;
    case FieldType.TEXT:
    case FieldType.TEXTAREA:
      return 'N/A';
    case FieldType.DATE:
      return '2026-10-01';
    default:
      return null;
  }
}

// ─── HELPER: map answer to Prisma columns ─────────────────────────────────────

function mapToPrismaColumns(
  value: string | number | string[] | null,
  fieldType: FieldType,
) {
  if (value === null || value === undefined) {
    return { valueText: null, valueNumber: null, valueDate: null, valueArray: [] };
  }
  switch (fieldType) {
    case FieldType.TEXT:
    case FieldType.TEXTAREA:
      return { valueText: value as string, valueNumber: null, valueDate: null, valueArray: [] };
    case FieldType.NUMBER:
    case FieldType.RATING:
      return { valueText: null, valueNumber: value as number, valueDate: null, valueArray: [] };
    case FieldType.DATE:
      return { valueText: null, valueNumber: null, valueDate: new Date(value as string), valueArray: [] };
    case FieldType.CHOICE:
    case FieldType.CHECKBOX:
      return { valueText: null, valueNumber: null, valueDate: null, valueArray: value as string[] };
    default:
      return { valueText: null, valueNumber: null, valueDate: null, valueArray: [] };
  }
}

// ─── HELPER: build participant snapshot (mirrors extractIdentitySnapshot logic) ──

function buildSnapshot(
  formFields: { id: string; autoFillKey: string | null }[],
  answers: Record<string, string | number | string[] | null>,
  participant: (typeof PARTICIPANT_DATA)[keyof typeof PARTICIPANT_DATA],
): Record<string, string> {
  const snapshotKeys = ['firstName', 'lastName', 'nickname', 'studentId', 'major'];
  const result: Record<string, string> = {};

  for (const key of snapshotKeys) {
    const field = formFields.find((f) => f.autoFillKey === key);
    const value = field ? answers[field.id] : null;
    const fromForm = typeof value === 'string' && value.trim() !== '' ? value : null;
    const fromProfile = participant[key as keyof typeof participant] ?? '';
    result[key] = fromForm ?? (fromProfile as string) ?? '';
  }

  return result;
}

// ─── HELPER: create full registration (reg + form response + field responses + ticket) ──

async function createFullRegistration({
  registrationId,
  ticketId,
  formResponseId,
  participantId,
  eventId,
  formId,
  formFields,
  participant,
  registrationStatus,
  ticketStatus,
  extraAnswers = {},
  createdAt,
}: {
  registrationId: string;
  ticketId: string;
  formResponseId: string;
  participantId: string;
  eventId: string;
  formId: string;
  formFields: { id: string; autoFillKey: string | null; type: FieldType; options: string[] }[];
  participant: (typeof PARTICIPANT_DATA)[keyof typeof PARTICIPANT_DATA];
  registrationStatus: RegistrationStatus;
  ticketStatus: TicketStatus;
  extraAnswers?: Record<string, string | number | string[]>;
  createdAt?: Date;
}) {
  // build answers map
  const answersMap: Record<string, string | number | string[] | null> = {};
  for (const field of formFields) {
    answersMap[field.id] = resolveAnswer(field.id, participant, formFields, extraAnswers);
  }

  // 1. create EventRegistration
  const registration = await prisma.eventRegistration.upsert({
    where: { participantId_eventId: { participantId, eventId } },
    update: { status: registrationStatus },
    create: {
      id: registrationId,
      participantId,
      eventId,
      status: registrationStatus,
      ...(createdAt && { createdAt }),
    },
  });

  // 2. create FormResponse
  const formResponse = await prisma.formResponse.upsert({
    where: { id: formResponseId },
    update: {},
    create: {
      id: formResponseId,
      formId,
      eventRegistrationId: registration.id,
    },
  });

  // 3. create FormFieldResponses
  for (const field of formFields) {
    const value = answersMap[field.id];
    const columns = mapToPrismaColumns(value, field.type);
    await prisma.formFieldResponse.upsert({
      where: {
        formResponseId_formFieldId: {
          formResponseId: formResponse.id,
          formFieldId: field.id,
        },
      },
      update: {},
      create: {
        formResponseId: formResponse.id,
        formFieldId: field.id,
        formId,
        ...columns,
      },
    });
  }

  // 4. build snapshot and create Ticket
  const snapshot = buildSnapshot(formFields, answersMap, participant);
  await prisma.ticket.upsert({
    where: { id: ticketId },
    update: { status: ticketStatus },
    create: {
      id: ticketId,
      eventRegistrationId: registration.id,
      qrToken: crypto.randomUUID(),
      status: ticketStatus,
      participantSnapshot: snapshot,
    },
  });

  return registration;
}

// ─── HELPER: create feedback response ─────────────────────────────────────────

async function createFeedbackResponse({
  formResponseId,
  registrationId,
  formId,
  formFields,
  answers,
}: {
  formResponseId: string;
  registrationId: string;
  formId: string;
  formFields: { id: string; autoFillKey: string | null; type: FieldType; options: string[] }[];
  answers: Record<string, string | number | string[] | null>;
}) {
  const formResponse = await prisma.formResponse.upsert({
    where: { id: formResponseId },
    update: {},
    create: {
      id: formResponseId,
      formId,
      eventRegistrationId: registrationId,
    },
  });

  for (const field of formFields) {
    const value = answers[field.id] ?? null;
    const columns = mapToPrismaColumns(value, field.type);
    await prisma.formFieldResponse.upsert({
      where: {
        formResponseId_formFieldId: {
          formResponseId: formResponse.id,
          formFieldId: field.id,
        },
      },
      update: {},
      create: {
        formResponseId: formResponse.id,
        formFieldId: field.id,
        formId,
        ...columns,
      },
    });
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const passwordHash = await bcrypt.hash('12345678', 10);

  // ── University ──────────────────────────────────────────────────────────────

  const cmu = await prisma.university.upsert({
    where: { domain: 'cmu.ac.th' },
    update: {},
    create: {
      id: ID.CMU,
      name: 'Chiang Mai University',
      domain: 'cmu.ac.th',
      isActive: true,
    },
  });
  console.log('✓ University');

  // ── Users ───────────────────────────────────────────────────────────────────

  await Promise.all([
    prisma.user.upsert({
      where: { email: 'organizer1@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_ORG1, universityId: cmu.id, email: 'organizer1@cmu.ac.th', passwordHash, currentRole: Role.ORGANIZER, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'organizer2@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_ORG2, universityId: cmu.id, email: 'organizer2@cmu.ac.th', passwordHash, currentRole: Role.ORGANIZER, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'organizer3@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_ORG3, universityId: cmu.id, email: 'organizer3@cmu.ac.th', passwordHash, currentRole: Role.ORGANIZER, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'participant1@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_PAR1, universityId: cmu.id, email: 'participant1@cmu.ac.th', passwordHash, currentRole: Role.PARTICIPANT, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'participant2@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_PAR2, universityId: cmu.id, email: 'participant2@cmu.ac.th', passwordHash, currentRole: Role.PARTICIPANT, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'participant3@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_PAR3, universityId: cmu.id, email: 'participant3@cmu.ac.th', passwordHash, currentRole: Role.PARTICIPANT, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'participant4@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_PAR4, universityId: cmu.id, email: 'participant4@cmu.ac.th', passwordHash, currentRole: Role.PARTICIPANT, isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'participant5@cmu.ac.th' },
      update: {},
      create: { id: ID.USER_PAR5, universityId: cmu.id, email: 'participant5@cmu.ac.th', passwordHash, currentRole: Role.PARTICIPANT, isVerified: true },
    }),
  ]);
  console.log('✓ Users (3 organizers, 5 participants)');

  // ── Organizer Profiles ──────────────────────────────────────────────────────

  const [org1, org2, org3] = await Promise.all([
    prisma.organizerProfile.upsert({
      where: { userId: ID.USER_ORG1 },
      update: {},
      create: {
        id: ID.ORG1,
        userId: ID.USER_ORG1,
        name: 'CAMT Student Affairs',
        bio: 'Organizing academic and social events for CAMT students.',
        contactEmail: 'organizer1@cmu.ac.th',
        contactPhone: '0812345671',
        contactLineId: 'camt_affairs',
        imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/org1.jpg',
        externalUrl: 'https://camt.cmu.ac.th',
      },
    }),
    prisma.organizerProfile.upsert({
      where: { userId: ID.USER_ORG2 },
      update: {},
      create: {
        id: ID.ORG2,
        userId: ID.USER_ORG2,
        name: 'CMU Music and Arts Club',
        bio: 'Bringing music and arts to the CMU community.',
        contactEmail: 'organizer2@cmu.ac.th',
        contactPhone: '0812345672',
        contactLineId: 'cmu_music',
        imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/org2.jpg',
        externalUrl: '',
      },
    }),
    prisma.organizerProfile.upsert({
      where: { userId: ID.USER_ORG3 },
      update: {},
      create: {
        id: ID.ORG3,
        userId: ID.USER_ORG3,
        name: 'SE Department Club',
        bio: 'Software Engineering department club organizing tech and social events.',
        contactEmail: 'organizer3@cmu.ac.th',
        contactPhone: '0812345673',
        contactLineId: 'se_club',
        imageUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/org3.jpg',
        externalUrl: 'https://se.camt.cmu.ac.th',
      },
    }),
  ]);
  console.log('✓ Organizer profiles');

  // ── Participant Profiles ─────────────────────────────────────────────────────

  const PAR_USER_MAP: Record<keyof typeof PARTICIPANT_DATA, string> = {
    PAR1: ID.USER_PAR1,
    PAR2: ID.USER_PAR2,
    PAR3: ID.USER_PAR3,
    PAR4: ID.USER_PAR4,
    PAR5: ID.USER_PAR5,
  };

  await Promise.all(
    (Object.keys(PARTICIPANT_DATA) as (keyof typeof PARTICIPANT_DATA)[]).map((key) =>
      prisma.participantProfile.upsert({
        where: { userId: PAR_USER_MAP[key] },
        update: {},
        create: {
          id: PARTICIPANT_DATA[key].id,
          userId: PAR_USER_MAP[key],
          firstName: PARTICIPANT_DATA[key].firstName,
          lastName: PARTICIPANT_DATA[key].lastName,
          nickname: PARTICIPANT_DATA[key].nickname,
          studentId: PARTICIPANT_DATA[key].studentId,
          major: PARTICIPANT_DATA[key].major,
          contactEmail: PARTICIPANT_DATA[key].email,
          contactPhone: PARTICIPANT_DATA[key].phone,
          contactLineId: PARTICIPANT_DATA[key].lineId,
          imageUrl: PARTICIPANT_DATA[key].imageUrl,
          preferences: {
            personal: ['TECHNOLOGY'],
            event: ['SEMINAR', 'WORKSHOP'],
            language: ['en', 'th'],
          },
        },
      }),
    ),
  );
  console.log('✓ Participant profiles');

  // ── Events ───────────────────────────────────────────────────────────────────
  // NOTE: seatsTaken set to match CONFIRMED registrations seeded below

  const eventBase = {
    universityId: cmu.id,
    isOnline: false,
    hasCatering: false,
    isCateringFree: false,
    cateringDescription: { en: '', th: '' },
    agenda: [],
    contactPhone: '053-942-462',
    contactLineId: '',
    externalUrl: '',
    remarks: { en: '', th: '' },
  };

  await prisma.event.upsert({
    where: { id: ID.EVT_HALLOWEEN },
    update: { seatsTaken: 3 },
    create: {
      ...eventBase,
      id: ID.EVT_HALLOWEEN,
      organizerId: org1.id,
      title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
      description: { en: 'Join us for a spooky Halloween night filled with costumes, games, and surprises. Enjoy a costume contest, spooky decorations, and a lucky draw to close out the evening.', th: 'มาร่วมสนุกกับคืนฮาโลวีนสุดหลอนที่เต็มไปด้วยชุดแฟนซี เกม และเซอร์ไพรส์มากมาย พบกับการประกวดชุด การตกแต่งสุดหลอน และกิจกรรมจับรางวัลปิดท้ายค่ำคืน' },
      category: ['PARTY', 'CULTURAL'],
      location: { en: 'CAMT Auditorium', th: 'ห้องประชุมใหญ่ CAMT' },
      mapLink: 'https://maps.google.com/?q=CAMT+CMU',
      startAt: new Date('2026-10-31T17:00:00.000Z'),
      endAt: new Date('2026-10-31T21:00:00.000Z'),
      seatLimit: 100,
      seatsTaken: 3, // par1, par2, par3
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'Light snacks and drinks.', th: 'มีของว่างและเครื่องดื่ม' },
      agenda: [
        { time: '17:00', activity: { en: 'Registration', th: 'ลงทะเบียน' } },
        { time: '18:00', activity: { en: 'Costume Contest', th: 'ประกวดชุด' } },
        { time: '20:00', activity: { en: 'Lucky Draw', th: 'จับรางวัล' } },
      ],
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/1_holloween.jpg',
      publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_NEW_YEAR },
    update: { seatsTaken: 5 },
    create: {
      ...eventBase,
      id: ID.EVT_NEW_YEAR,
      organizerId: org1.id,
      title: { en: 'New Year Countdown Party 2027', th: 'ปาร์ตี้เคาท์ดาวน์ปีใหม่ 2027' },
      description: { en: 'Ring in the New Year with music, food, and a countdown to remember on the CAMT rooftop garden. Dance the night away with friends before the fireworks light up the sky at midnight.', th: 'ฉลองส่งท้ายปีเก่าต้อนรับปีใหม่ไปด้วยกันบนสวนดาดฟ้า CAMT พร้อมดนตรี อาหาร และการนับถอยหลังสุดพิเศษ เต้นรำสนุกสนานกับเพื่อนๆ ก่อนที่พลุจะจุดสว่างท้องฟ้ายามเที่ยงคืน' },
      category: ['PARTY', 'FESTIVAL'],
      location: { en: 'CAMT Rooftop Garden', th: 'สวนดาดฟ้า CAMT' },
      mapLink: 'https://maps.google.com/?q=CAMT+CMU',
      startAt: new Date('2026-12-31T22:00:00.000Z'),
      endAt: new Date('2027-01-01T01:00:00.000Z'),
      seatLimit: 5, // FULL — all 5 participants registered
      seatsTaken: 5,
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: false,
      cateringDescription: { en: 'Food and drinks available.', th: 'มีอาหารและเครื่องดื่มจำหน่าย' },
      agenda: [
        { time: '22:00', activity: { en: 'Gates Open', th: 'เปิดประตู' } },
        { time: '23:45', activity: { en: 'Countdown', th: 'เคาท์ดาวน์' } },
      ],
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/2_new_year.jpg',
      publishedAt: new Date('2026-09-02T00:00:00.000Z'),
      remarks: { en: 'Limited seats — first come first served.', th: 'ที่นั่งจำกัด' },
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_SUKHOTHAI },
    update: { seatsTaken: 1 },
    create: {
      ...eventBase,
      id: ID.EVT_SUKHOTHAI,
      organizerId: org2.id,
      title: { en: 'Sukhothai Excursion Trip', th: 'ทริปทัศนศึกษาสุโขทัย' },
      description: { en: 'Join a two-day excursion to explore the ancient ruins and temples of Sukhothai Historical Park, a UNESCO World Heritage Site. Transportation, meals, and a local guide are all included.', th: 'ร่วมทริปทัศนศึกษา 2 วัน 1 คืน สำรวจโบราณสถานและวัดวาอารามในอุทยานประวัติศาสตร์สุโขทัย มรดกโลกขององค์การยูเนสโก รวมค่าเดินทาง อาหาร และไกด์นำเที่ยวท้องถิ่น' },
      category: ['TRIP', 'CULTURAL'],
      location: { en: 'Sukhothai Historical Park', th: 'อุทยานประวัติศาสตร์สุโขทัย' },
      mapLink: 'https://maps.google.com/?q=Sukhothai+Historical+Park',
      startAt: new Date('2026-11-15T06:00:00.000Z'),
      endAt: new Date('2026-11-16T20:00:00.000Z'),
      seatLimit: 10,
      seatsTaken: 1, // par1 CONFIRMED, par2 CANCELLED (doesn't count)
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: false,
      cateringDescription: { en: 'Meals included.', th: 'รวมอาหาร' },
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/3_sukhothai.jpg',
      publishedAt: new Date('2026-09-10T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_EXCHANGE },
    update: { seatsTaken: 3 },
    create: {
      ...eventBase,
      id: ID.EVT_EXCHANGE,
      organizerId: org2.id,
      title: { en: 'Semester Exchange Program 2026', th: 'โครงการแลกเปลี่ยนนักศึกษา 2026' },
      description: { en: 'Join the semester exchange program with our partner universities abroad and gain international academic experience. Sessions cover application requirements, course transfer credits, and cultural preparation for studying overseas.', th: 'เข้าร่วมโครงการแลกเปลี่ยนภาคการศึกษากับมหาวิทยาลัยพันธมิตรในต่างประเทศ เพื่อสร้างประสบการณ์ทางวิชาการระดับนานาชาติ เซสชันครอบคลุมคุณสมบัติการสมัคร การโอนหน่วยกิต และการเตรียมตัวด้านวัฒนธรรมก่อนไปศึกษาต่อ' },
      category: ['SEMINAR', 'NETWORKING'],
      location: { en: 'Online and CAMT Building', th: 'ออนไลน์และอาคาร CAMT' },
      mapLink: '',
      isOnline: true,
      startAt: new Date('2026-09-01T09:00:00.000Z'),
      endAt: new Date('2026-12-31T17:00:00.000Z'),
      seatLimit: 3, // FULL — par1, par2, par3
      seatsTaken: 3,
      status: EventStatus.ONGOING,
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/5_seminar_exchange.jpg',
      publishedAt: new Date('2026-08-01T00:00:00.000Z'),
      remarks: { en: 'GPA 3.0 or above required.', th: 'ต้องมี GPA 3.0 ขึ้นไป' },
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_BOOTCAMP },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_BOOTCAMP,
      organizerId: org2.id,
      title: { en: 'Coding Bootcamp Summer 2026', th: 'Coding Bootcamp ซัมเมอร์ 2026' },
      description: { en: 'An intensive coding bootcamp covering modern web development from front-end basics to full-stack deployment. Participants will build real projects and receive mentorship from industry practitioners throughout the program.', th: 'Coding Bootcamp เข้มข้นครอบคลุมการพัฒนาเว็บสมัยใหม่ ตั้งแต่พื้นฐาน Front-end ไปจนถึงการ Deploy แบบ Full-stack ผู้เข้าร่วมจะได้ลงมือทำโปรเจกต์จริงพร้อมคำแนะนำจากผู้เชี่ยวชาญในอุตสาหกรรมตลอดโครงการ' },
      category: ['WORKSHOP', 'SEMINAR'],
      location: { en: 'CAMT Computer Lab 1', th: 'ห้องแล็บคอมพิวเตอร์ 1 CAMT' },
      mapLink: '',
      startAt: new Date('2026-08-01T09:00:00.000Z'),
      endAt: new Date('2026-11-30T17:00:00.000Z'),
      seatLimit: 25,
      seatsTaken: 2, // par1, par3
      status: EventStatus.ONGOING,
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/6_coding.jpg',
      publishedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_HACKATHON },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_HACKATHON,
      organizerId: org3.id,
      title: { en: 'SE Hackathon 2026', th: 'SE Hackathon 2026' },
      description: { en: '48-hour hackathon challenging SE students to design, build, and pitch a working prototype under time pressure. Teams will compete for prizes and get feedback from mentors and industry judges.', th: 'แข่งขัน Hackathon 48 ชั่วโมง ท้าทายนักศึกษา SE ให้ออกแบบ พัฒนา และนำเสนอต้นแบบที่ใช้งานได้จริงภายใต้เวลาที่จำกัด ทีมที่เข้าแข่งขันจะได้ชิงรางวัลและรับคำแนะนำจากเมนเทอร์และกรรมการจากภาคอุตสาหกรรม' },
      category: ['HACKATHON', 'COMPETITION'],
      location: { en: 'CAMT Innovation Lab', th: 'ห้อง Innovation Lab CAMT' },
      mapLink: '',
      startAt: new Date('2026-05-20T09:00:00.000Z'),
      endAt: new Date('2026-05-22T17:00:00.000Z'),
      seatLimit: 60,
      seatsTaken: 2, // par1, par2 — tickets EXPIRED (concluded)
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'Meals and snacks throughout the event.', th: 'มีอาหารตลอดงาน' },
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/8_hackathon.jpg',
      publishedAt: new Date('2026-04-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_SPORTS },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_SPORTS,
      organizerId: org3.id,
      title: { en: 'CMU Sports Day 2026', th: 'กีฬาสี CMU 2026' },
      description: { en: 'The annual CMU Sports Day brings faculties together for a full day of athletic competitions, cheerleading, and team spirit. Come support your faculty team or just enjoy the festive atmosphere around the sports complex.', th: 'งานกีฬาสีประจำปีของ มช. รวมทุกคณะไว้ด้วยกันเพื่อร่วมการแข่งขันกีฬา การเชียร์ และความสามัคคีตลอดทั้งวัน มาร่วมเชียร์ทีมคณะของคุณหรือเพลิดเพลินกับบรรยากาศแห่งความสนุกสนานรอบศูนย์กีฬา' },
      category: ['SPORT'],
      location: { en: 'CMU Sports Complex', th: 'ศูนย์กีฬา มช.' },
      mapLink: '',
      startAt: new Date('2026-04-10T08:00:00.000Z'),
      endAt: new Date('2026-04-10T18:00:00.000Z'),
      seatLimit: null, // unlimited
      seatsTaken: 2,   // par2, par4 — tickets EXPIRED (concluded)
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'Food stalls available.', th: 'มีร้านอาหาร' },
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/9_sportday.jpg',
      publishedAt: new Date('2026-03-15T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_ORIENTATION },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_ORIENTATION,
      organizerId: org1.id,
      title: { en: 'Orientation Week 2026', th: 'สัปดาห์ปฐมนิเทศ 2026' },
      description: { en: "Orientation Week welcomes new students with campus tours, faculty introductions, and workshops on academic life at CMU. It's the perfect opportunity to meet classmates and get settled before the semester begins.", th: 'สัปดาห์ปฐมนิเทศต้อนรับนักศึกษาใหม่ด้วยการนำชมมหาวิทยาลัย แนะนำคณาจารย์ และเวิร์กชอปเกี่ยวกับชีวิตทางวิชาการใน มช. เป็นโอกาสดีในการทำความรู้จักเพื่อนใหม่และเตรียมความพร้อมก่อนเปิดภาคการศึกษา' },
      category: ['ORIENTATION'],
      location: { en: 'CAMT Main Hall', th: 'ห้องโถงหลัก CAMT' },
      mapLink: '',
      startAt: new Date('2026-05-01T09:00:00.000Z'),
      endAt: new Date('2026-05-07T17:00:00.000Z'),
      seatLimit: 200,
      seatsTaken: 0, // no registrations seeded
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'Lunch provided daily.', th: 'มีอาหารกลางวันทุกวัน' },
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/10_orientation.jpg',
      publishedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_AI_SEMINAR },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_AI_SEMINAR,
      organizerId: org1.id,
      title: { en: 'AI Research Seminar Series', th: 'ชุดสัมมนาการวิจัย AI' },
      description: { en: 'An ongoing seminar series exploring the latest developments in artificial intelligence research, from machine learning theory to real-world applications. Guest speakers from academia and industry will share their work across multiple sessions.', th: 'ชุดสัมมนาต่อเนื่องที่สำรวจความก้าวหน้าล่าสุดด้านการวิจัยปัญญาประดิษฐ์ ตั้งแต่ทฤษฎี Machine Learning ไปจนถึงการประยุกต์ใช้จริง วิทยากรรับเชิญจากแวดวงวิชาการและอุตสาหกรรมจะมาร่วมแบ่งปันผลงานตลอดหลายเซสชัน' },
      category: ['SEMINAR', 'LECTURE'],
      location: { en: 'CAMT Building Room 202', th: 'ห้อง 202 อาคาร CAMT' },
      mapLink: '',
      startAt: new Date('2026-06-01T09:00:00.000Z'),
      endAt: new Date('2026-11-30T17:00:00.000Z'),
      seatLimit: 50,
      seatsTaken: 0, // NO registration form — useful for FormNotFoundException test
      status: EventStatus.ONGOING,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/7_ai_event.jpg',
      publishedAt: new Date('2026-05-15T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_NO_FORM },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_NO_FORM,
      organizerId: org3.id,
      title: { en: 'Test Published Event — No Form', th: 'กิจกรรมทดสอบ — ไม่มีฟอร์ม' },
      description: { en: 'A published test event with no registration form, used for verifying flows that should gracefully handle events without a form. No sign-up is required to view this listing.', th: 'กิจกรรมทดสอบที่เผยแพร่แล้วโดยไม่มีฟอร์มลงทะเบียน ใช้สำหรับทดสอบการทำงานของระบบในกรณีที่กิจกรรมไม่มีฟอร์ม ไม่จำเป็นต้องลงทะเบียนเพื่อดูรายการนี้' },
      category: ['OTHER'],
      location: { en: 'CAMT Building Room 301', th: 'ห้อง 301 อาคาร CAMT' },
      mapLink: '',
      startAt: new Date('2026-10-20T09:00:00.000Z'),
      endAt: new Date('2026-10-20T12:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.PUBLISHED,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/11_test.jpg',
      publishedAt: new Date('2026-09-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT1 },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_DRAFT1,
      organizerId: org1.id,
      title: { en: 'SE Workshop Draft', th: 'เวิร์กชอป SE ฉบับร่าง' },
      description: { en: 'A draft workshop for SE students still being planned by the organizing team. Final schedule, speakers, and registration details will be added once the workshop moves out of draft status.', th: 'เวิร์กชอปฉบับร่างสำหรับนักศึกษา SE ที่ทีมผู้จัดยังอยู่ระหว่างการวางแผน กำหนดการ วิทยากร และรายละเอียดการลงทะเบียนที่แน่นอนจะถูกเพิ่มเติมเมื่อกิจกรรมพร้อมเผยแพร่' },
      category: ['WORKSHOP'],
      location: { en: 'CAMT Building Room 101', th: 'ห้อง 101 อาคาร CAMT' },
      mapLink: '',
      startAt: new Date('2026-11-15T09:00:00.000Z'),
      endAt: new Date('2026-11-15T12:00:00.000Z'),
      seatLimit: 30,
      seatsTaken: 0,
      status: EventStatus.DRAFT,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/12_workshop.jpg',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT2 },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_DRAFT2,
      organizerId: org2.id,
      title: { en: 'Music Concert Draft', th: 'คอนเสิร์ตดนตรีฉบับร่าง' },
      description: { en: "A draft listing for the upcoming annual music concert, with the lineup and venue details still being finalized. Check back soon for the full program once it's published.", th: 'รายการฉบับร่างสำหรับคอนเสิร์ตดนตรีประจำปีที่กำลังจะมาถึง โดยรายชื่อศิลปินและสถานที่จัดงานยังอยู่ระหว่างการสรุป โปรดติดตามรายละเอียดฉบับเต็มเมื่อเผยแพร่' },
      category: ['CULTURAL', 'FESTIVAL'],
      location: { en: 'CMU Auditorium', th: 'หอประชุม มช.' },
      mapLink: '',
      startAt: new Date('2026-12-20T18:00:00.000Z'),
      endAt: new Date('2026-12-20T21:00:00.000Z'),
      seatLimit: 150,
      seatsTaken: 0,
      status: EventStatus.DRAFT,
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/13_music_concert.jpg',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT3 },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_DRAFT3,
      organizerId: org3.id,
      title: { en: 'Cultural Festival Draft', th: 'เทศกาลวัฒนธรรมฉบับร่าง' },
      description: { en: 'A draft listing for an upcoming cultural festival celebrating the diversity of student life at CMU. Activities, performers, and dates are still being confirmed by the organizing club.', th: 'รายการฉบับร่างสำหรับเทศกาลวัฒนธรรมที่กำลังจะมาถึง เพื่อเฉลิมฉลองความหลากหลายของชีวิตนักศึกษาใน มช. กิจกรรม ผู้แสดง และวันจัดงานยังอยู่ระหว่างการยืนยันโดยชมรมผู้จัด' },
      category: ['CULTURAL', 'FESTIVAL'],
      location: { en: 'CMU Cultural Center', th: 'ศูนย์วัฒนธรรม มช.' },
      mapLink: '',
      startAt: null,
      endAt: null,
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.DRAFT,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/14_curtural_fes.jpg',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_CONCERT },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_CONCERT,
      organizerId: org2.id,
      title: { en: 'CMU Annual Concert 2026', th: 'คอนเสิร์ตประจำปี CMU 2026' },
      description: { en: 'The CMU Annual Concert showcases student musicians and performing arts groups from across campus. Enjoy an evening of live music, from classical ensembles to contemporary student bands.', th: 'คอนเสิร์ตประจำปีของ มช. นำเสนอผลงานของนักดนตรีและกลุ่มศิลปะการแสดงจากทั่วมหาวิทยาลัย ร่วมสัมผัสค่ำคืนแห่งดนตรีสด ตั้งแต่วงดนตรีคลาสสิกไปจนถึงวงดนตรีร่วมสมัยของนักศึกษา' },
      category: ['CULTURAL', 'FESTIVAL'],
      location: { en: 'CMU Main Auditorium', th: 'หอประชุมใหญ่ มช.' },
      mapLink: 'https://maps.google.com/?q=CMU+Auditorium',
      startAt: new Date('2026-11-28T18:00:00.000Z'),
      endAt: new Date('2026-11-28T21:00:00.000Z'),
      seatLimit: 300,
      seatsTaken: 0, // no registrations yet — open for registration
      status: EventStatus.PUBLISHED,
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/4_concert.jpg',
      publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_TEDX },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_TEDX,
      organizerId: org1.id,
      title: { en: 'TEDxChiangMaiUniversity 2026', th: 'TEDx มหาวิทยาลัยเชียงใหม่ 2026' },
      description: { en: 'A day of ideas worth spreading, featuring student and faculty speakers sharing insights on technology, sustainability, and society. Expect thought-provoking talks, live performances, and networking between sessions.', th: 'วันแห่งไอเดียที่ควรค่าแก่การเผยแพร่ โดยนักศึกษาและคณาจารย์ร่วมแบ่งปันมุมมองด้านเทคโนโลยี ความยั่งยืน และสังคม พบกับการบรรยายที่กระตุ้นความคิด การแสดงสด และช่วงเวลาเครือข่ายระหว่างเซสชัน' },
      category: ['SEMINAR', 'LECTURE'],
      location: { en: 'CMU Convention Center', th: 'ศูนย์ประชุมนานาชาติ มช.' },
      mapLink: 'https://maps.google.com/?q=CMU+Convention+Center',
      startAt: new Date('2026-11-14T09:00:00.000Z'),
      endAt: new Date('2026-11-14T17:00:00.000Z'),
      seatLimit: 400,
      seatsTaken: 2,
      status: EventStatus.PUBLISHED,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/15_ted_talk.jpg',
      publishedAt: new Date('2026-09-04T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_JOBFAIR },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_JOBFAIR,
      organizerId: org1.id,
      title: { en: 'CMU Job & Internship Fair 2026', th: 'งานนัดพบแรงงานและฝึกงาน มช. 2026' },
      description: { en: 'Meet recruiters from top companies hiring students and new graduates across a wide range of industries. Bring your resume for on-the-spot interviews and learn about internship and full-time opportunities.', th: 'พบกับบริษัทชั้นนำที่เปิดรับนักศึกษาและบัณฑิตใหม่ในหลากหลายอุตสาหกรรม นำเรซูเม่มาสัมภาษณ์งานได้ทันทีในงาน พร้อมเรียนรู้โอกาสฝึกงานและตำแหน่งงานประจำ' },
      category: ['NETWORKING', 'CAREER_FAIR', 'INTERNSHIP'],
      location: { en: 'CMU Convention Center', th: 'ศูนย์ประชุมนานาชาติ มช.' },
      mapLink: 'https://maps.google.com/?q=CMU+Convention+Center',
      startAt: new Date('2026-10-10T09:00:00.000Z'),
      endAt: new Date('2026-10-10T16:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 2,
      status: EventStatus.PUBLISHED,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/16_job_fair.jpg',
      publishedAt: new Date('2026-09-10T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_BLOODDONATION },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_BLOODDONATION,
      organizerId: org1.id,
      title: { en: 'CMU Blood Donation Day', th: 'วันบริจาคโลหิต มช.' },
      description: { en: 'Donate blood with the Thai Red Cross and help save lives across the region — every drop counts. Walk-ins are welcome, but registering in advance helps us manage donation slots efficiently.', th: 'ร่วมบริจาคโลหิตกับสภากาชาดไทยเพื่อช่วยชีวิตผู้คนในภูมิภาค ทุกหยดมีความหมาย เดินเข้าร่วมได้ทันทีโดยไม่ต้องนัดหมาย แต่การลงทะเบียนล่วงหน้าจะช่วยให้เราจัดคิวบริจาคได้อย่างมีประสิทธิภาพ' },
      category: ['VOLUNTEER'],
      location: { en: 'CMU Student Union Building', th: 'อาคารกิจกรรมนักศึกษา มช.' },
      mapLink: '',
      startAt: new Date('2026-10-03T09:00:00.000Z'),
      endAt: new Date('2026-10-03T15:00:00.000Z'),
      seatLimit: 150,
      seatsTaken: 0, // no regs yet — open for registration
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'Juice and snacks provided after donation.', th: 'มีน้ำผลไม้และของว่างหลังบริจาค' },
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/17_blood_donatioin.jpg',
      publishedAt: new Date('2026-09-15T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_FRESHYNIGHT },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_FRESHYNIGHT,
      organizerId: org1.id,
      title: { en: 'CAMT Freshy Night 2027', th: 'CAMT Freshy Night 2027' },
      description: { en: 'A welcome party for incoming CAMT freshmen to kick off the new academic year with music, games, and new friendships. This listing is still in draft — full program details will be announced soon.', th: 'งานปาร์ตี้ต้อนรับน้องใหม่ CAMT เพื่อเปิดตัวปีการศึกษาใหม่ด้วยดนตรี เกม และมิตรภาพใหม่ๆ รายการนี้ยังอยู่ในสถานะฉบับร่าง รายละเอียดกำหนดการฉบับเต็มจะประกาศเร็วๆ นี้' },
      category: ['PARTY'],
      location: { en: 'CAMT Auditorium', th: 'ห้องประชุมใหญ่ CAMT' },
      mapLink: '',
      startAt: new Date('2027-08-20T18:00:00.000Z'),
      endAt: new Date('2027-08-20T22:00:00.000Z'),
      seatLimit: 200,
      seatsTaken: 0,
      status: EventStatus.DRAFT,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/18_freshman_night.jpg',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_STARTUPPITCH },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_STARTUPPITCH,
      organizerId: org3.id,
      title: { en: 'CMU Startup Pitch Competition 2026', th: 'การแข่งขันพิตช์สตาร์ทอัพ มช. 2026' },
      description: { en: 'Student teams pitch their startup ideas to a panel of investors and industry mentors for a chance to win seed funding. Each team gets ten minutes to present, followed by a Q&A round with the judges.', th: 'ทีมนักศึกษานำเสนอไอเดียสตาร์ทอัพต่อคณะกรรมการนักลงทุนและเมนเทอร์จากภาคอุตสาหกรรม เพื่อลุ้นรับเงินทุนตั้งต้น แต่ละทีมมีเวลานำเสนอ 10 นาที ตามด้วยช่วงถาม-ตอบกับกรรมการ' },
      category: ['COMPETITION', 'NETWORKING'],
      location: { en: 'CAMT Innovation Lab', th: 'ห้อง Innovation Lab CAMT' },
      mapLink: '',
      startAt: new Date('2026-11-05T13:00:00.000Z'),
      endAt: new Date('2026-11-05T17:00:00.000Z'),
      seatLimit: 60,
      seatsTaken: 2,
      status: EventStatus.PUBLISHED,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/19_startup_pitch.jpg',
      publishedAt: new Date('2026-09-11T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_FOOTBALL },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_FOOTBALL,
      organizerId: org3.id,
      title: { en: 'CMU Intramural Football Championship', th: 'ฟุตบอลเชื่อมสัมพันธ์ มช.' },
      description: { en: 'Faculty vs. faculty football tournament running through October, with matches held every weekend at the CMU Sports Complex. Come cheer on your faculty team as they compete for the championship trophy.', th: 'การแข่งขันฟุตบอลระหว่างคณะตลอดเดือนตุลาคม จัดการแข่งขันทุกสุดสัปดาห์ที่ศูนย์กีฬา มช. มาร่วมเชียร์ทีมคณะของคุณในการชิงถ้วยรางวัลแชมป์' },
      category: ['SPORT', 'COMPETITION'],
      location: { en: 'CMU Sports Complex', th: 'ศูนย์กีฬา มช.' },
      mapLink: '',
      startAt: new Date('2026-09-01T00:00:00.000Z'),
      endAt: new Date('2026-10-15T00:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.ONGOING,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/20_football.jpg',
      publishedAt: new Date('2026-08-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_PHOTOEXHIBIT },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_PHOTOEXHIBIT,
      organizerId: org2.id,
      title: { en: 'Student Photography Exhibition: "Chiang Mai Through Our Lens"', th: 'นิทรรศการภาพถ่ายนักศึกษา "เชียงใหม่ในมุมมองของเรา"' },
      description: { en: 'A week-long exhibition of student photography capturing everyday life and landscapes around Chiang Mai. Stop by the art museum to view the selected works and vote for your favorite piece.', th: 'นิทรรศการภาพถ่ายฝีมือนักศึกษาที่บอกเล่าวิถีชีวิตและทิวทัศน์รอบเชียงใหม่ ตลอดระยะเวลาหนึ่งสัปดาห์ แวะชมผลงานที่ได้รับคัดเลือกที่หอศิลปวัฒนธรรมและร่วมโหวตผลงานที่คุณชื่นชอบ' },
      category: ['CULTURAL', 'CLUB_ACTIVITY'],
      location: { en: 'CMU Art Museum', th: 'หอศิลปวัฒนธรรม มช.' },
      mapLink: '',
      startAt: new Date('2026-10-20T10:00:00.000Z'),
      endAt: new Date('2026-10-27T18:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.PUBLISHED,
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/21_photo_exhitbition.jpg',
      publishedAt: new Date('2026-09-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_CLEANUP },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_CLEANUP,
      organizerId: org1.id,
      title: { en: 'Ping River Clean-Up Day', th: 'วันทำความสะอาดแม่น้ำปิง' },
      description: { en: 'Volunteer clean-up along the Ping River, organized together with the local community to protect the waterway. Gloves, bags, and refreshments will be provided — just bring your energy and a good pair of shoes.', th: 'กิจกรรมอาสาทำความสะอาดริมแม่น้ำปิงร่วมกับชุมชนท้องถิ่น เพื่อร่วมกันดูแลรักษาแหล่งน้ำ ทางผู้จัดเตรียมถุงมือ ถุงขยะ และเครื่องดื่มไว้ให้ เพียงแค่เตรียมพลังและรองเท้าที่เหมาะสมมา' },
      category: ['VOLUNTEER'],
      location: { en: 'Ping River Promenade', th: 'ทางเดินริมแม่น้ำปิง' },
      mapLink: '',
      startAt: new Date('2026-08-15T07:00:00.000Z'),
      endAt: new Date('2026-08-15T12:00:00.000Z'),
      seatLimit: 80,
      seatsTaken: 2, // par2, par4 — tickets EXPIRED (concluded)
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'Water and snacks provided.', th: 'มีน้ำดื่มและของว่าง' },
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/22_river_clean.jpg',
      publishedAt: new Date('2026-07-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_MENTALHEALTH },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_MENTALHEALTH,
      organizerId: org1.id,
      title: { en: 'Mental Health Awareness Workshop', th: 'เวิร์กชอปสร้างความตระหนักด้านสุขภาพจิต' },
      description: { en: 'A workshop on stress management and mental wellness designed to help students navigate the pressures of university life. Led by a licensed counselor, the session includes practical coping techniques and an open discussion.', th: 'เวิร์กชอปการจัดการความเครียดและสุขภาพจิต ออกแบบมาเพื่อช่วยนักศึกษารับมือกับความกดดันในชีวิตมหาวิทยาลัย นำโดยนักให้คำปรึกษาที่มีใบอนุญาต พร้อมเทคนิคการรับมือที่นำไปใช้ได้จริงและช่วงเวลาพูดคุยแบบเปิด' },
      category: ['WORKSHOP'],
      location: { en: 'CAMT Building Room 205', th: 'ห้อง 205 อาคาร CAMT' },
      mapLink: '',
      startAt: new Date('2026-10-08T13:00:00.000Z'),
      endAt: new Date('2026-10-08T16:00:00.000Z'),
      seatLimit: 40,
      seatsTaken: 0, // no regs yet — open for registration
      status: EventStatus.PUBLISHED,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/23_mental_health.jpg',
      publishedAt: new Date('2026-09-18T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_OPENHOUSE },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_OPENHOUSE,
      organizerId: org1.id,
      title: { en: 'CMU Open House 2027', th: 'มช. เปิดบ้าน 2027' },
      description: { en: 'An open house for prospective students to explore CMU\'s faculties, meet current students, and learn about admission requirements. This listing is still in draft while the program schedule is being finalized.', th: 'งานเปิดบ้านสำหรับนักเรียนที่สนใจเข้าศึกษาต่อ เพื่อสำรวจคณะต่างๆ ของ มช. พบปะนักศึกษาปัจจุบัน และเรียนรู้เกี่ยวกับเกณฑ์การรับสมัคร รายการนี้ยังอยู่ในสถานะฉบับร่างระหว่างการสรุปกำหนดการ' },
      category: ['ORIENTATION'],
      location: { en: 'CMU Main Campus', th: 'มหาวิทยาลัยเชียงใหม่' },
      mapLink: '',
      startAt: new Date('2027-02-10T09:00:00.000Z'),
      endAt: new Date('2027-02-10T16:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.DRAFT,
      contactName: 'CMU Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/24_cmu_openhouse.jpg',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_DATASCIENCE },
    update: { seatsTaken: 2 },
    create: {
      ...eventBase,
      id: ID.EVT_DATASCIENCE,
      organizerId: org3.id,
      title: { en: 'Data Science Bootcamp Fall 2026', th: 'Data Science Bootcamp ฤดูใบไม้ร่วง 2026' },
      description: { en: "A hands-on bootcamp covering Python programming, statistics, and the fundamentals of machine learning over several weeks. Participants will work on a capstone project using real-world datasets to apply what they've learned.", th: 'บูตแคมป์ภาคปฏิบัติที่ครอบคลุมการเขียนโปรแกรม Python สถิติ และพื้นฐาน Machine Learning ตลอดหลายสัปดาห์ ผู้เข้าร่วมจะได้ทำโปรเจกต์ปิดท้ายโดยใช้ชุดข้อมูลจริงเพื่อประยุกต์ใช้สิ่งที่ได้เรียนรู้' },
      category: ['WORKSHOP', 'SEMINAR'],
      location: { en: 'CAMT Computer Lab 2', th: 'ห้องแล็บคอมพิวเตอร์ 2 CAMT' },
      mapLink: '',
      startAt: new Date('2026-09-01T09:00:00.000Z'),
      endAt: new Date('2026-12-15T17:00:00.000Z'),
      seatLimit: 30,
      seatsTaken: 2,
      status: EventStatus.ONGOING,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/25_data_science.jpg',
      publishedAt: new Date('2026-08-15T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_CHESS },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_CHESS,
      organizerId: org3.id,
      title: { en: 'CMU Chess Club Open Tournament', th: 'การแข่งขันหมากรุกสากล มช. เปิด' },
      description: { en: 'An open Swiss-format chess tournament welcoming players of all skill levels, from casual enthusiasts to competitive rated players. Prizes will be awarded to top finishers across multiple divisions.', th: 'การแข่งขันหมากรุกสากลระบบสวิสแบบเปิด เปิดรับผู้เล่นทุกระดับฝีมือ ตั้งแต่ผู้เล่นทั่วไปไปจนถึงนักแข่งขันที่มีคะแนนเรตติ้ง มีรางวัลมอบให้ผู้ที่ทำผลงานได้ดีที่สุดในแต่ละรุ่น' },
      category: ['COMPETITION'],
      location: { en: 'CMU Student Union Building', th: 'อาคารกิจกรรมนักศึกษา มช.' },
      mapLink: '',
      startAt: new Date('2026-10-25T09:00:00.000Z'),
      endAt: new Date('2026-10-25T18:00:00.000Z'),
      seatLimit: 32,
      seatsTaken: 0, // no regs yet — open for registration
      status: EventStatus.PUBLISHED,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/26_chess.jpg',
      publishedAt: new Date('2026-09-25T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_FOODFEST },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_FOODFEST,
      organizerId: org2.id,
      title: { en: 'CMU International Food Festival', th: 'เทศกาลอาหารนานาชาติ มช.' },
      description: { en: 'Food stalls run by student clubs and international student associations, offering dishes from around the world. Come hungry and explore a variety of cuisines while enjoying live performances on the main stage.', th: 'ร้านอาหารจากชมรมนักศึกษาและสมาคมนักศึกษาต่างชาติ นำเสนอเมนูอาหารจากทั่วทุกมุมโลก มาพร้อมความหิวและสำรวจความหลากหลายของอาหาร พร้อมชมการแสดงสดบนเวทีหลัก' },
      category: ['FESTIVAL', 'CULTURAL'],
      location: { en: 'CMU Art and Culture Square', th: 'ลานวัฒนธรรม มช.' },
      mapLink: '',
      startAt: new Date('2026-11-21T11:00:00.000Z'),
      endAt: new Date('2026-11-21T21:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: false,
      cateringDescription: { en: 'Food available for purchase from stalls.', th: 'มีอาหารจำหน่ายตามร้านค้า' },
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/27_food.jpg',
      publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_ROBOTICS },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_ROBOTICS,
      organizerId: org3.id,
      title: { en: 'CAMT Robotics Showcase 2026', th: 'งานแสดงหุ่นยนต์ CAMT 2026' },
      description: { en: 'Student robotics teams demonstrate the projects they built over the past semester, from autonomous rovers to robotic arms. Come see live demos and ask the teams about their design and engineering process.', th: 'ทีมหุ่นยนต์นักศึกษาสาธิตผลงานที่พัฒนาขึ้นตลอดภาคการศึกษาที่ผ่านมา ตั้งแต่รถสำรวจอัตโนมัติไปจนถึงแขนกล มาชมการสาธิตสดและพูดคุยกับทีมงานเกี่ยวกับกระบวนการออกแบบและวิศวกรรม' },
      category: ['CLUB_ACTIVITY'],
      location: { en: 'CAMT Innovation Lab', th: 'ห้อง Innovation Lab CAMT' },
      mapLink: '',
      startAt: new Date('2026-06-10T09:00:00.000Z'),
      endAt: new Date('2026-06-10T17:00:00.000Z'),
      seatLimit: 100,
      seatsTaken: 0,
      status: EventStatus.CONCLUDED,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/28_robotic.jpeg',
      publishedAt: new Date('2026-05-10T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_FRESHMENCAMP },
    update: { seatsTaken: 3 },
    create: {
      ...eventBase,
      id: ID.EVT_FRESHMENCAMP,
      organizerId: org1.id,
      title: { en: 'CAMT Freshmen Welcome Camp 2026', th: 'ค่ายต้อนรับน้องใหม่ CAMT 2026' },
      description: { en: "A three-day welcome camp for incoming first-year CAMT students, packed with team-building activities, campus tours, and senior mentorship sessions. It's the best way to make friends before classes officially begin.", th: 'ค่ายต้อนรับน้องใหม่ 3 วันสำหรับนักศึกษาชั้นปีที่ 1 CAMT เต็มไปด้วยกิจกรรมสร้างทีม การนำชมมหาวิทยาลัย และเซสชันให้คำแนะนำจากรุ่นพี่ เป็นวิธีที่ดีที่สุดในการสร้างมิตรภาพก่อนเปิดเทอมอย่างเป็นทางการ' },
      category: ['ORIENTATION'],
      location: { en: 'CAMT Building and Grounds', th: 'อาคารและบริเวณ CAMT' },
      mapLink: '',
      startAt: new Date('2026-06-01T08:00:00.000Z'),
      endAt: new Date('2026-06-03T17:00:00.000Z'),
      seatLimit: 300,
      seatsTaken: 3, // par1, par2, par3 — tickets EXPIRED (concluded)
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: { en: 'All meals provided during the camp.', th: 'มีอาหารครบทุกมื้อตลอดค่าย' },
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/29_camping.jpg',
      publishedAt: new Date('2026-05-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_CHOIR },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_CHOIR,
      organizerId: org2.id,
      title: { en: 'CMU Choir Winter Concert 2027', th: 'คอนเสิร์ตประสานเสียง มช. ฤดูหนาว 2027' },
      description: { en: 'A winter concert by the CMU Choir featuring a mix of classical choral pieces and contemporary arrangements. This listing is still in draft while the program is being arranged with the choir director.', th: 'คอนเสิร์ตประสานเสียงฤดูหนาวของคณะนักร้องประสานเสียง มช. นำเสนอบทเพลงคลาสสิกผสมผสานกับเพลงเรียบเรียงร่วมสมัย รายการนี้ยังอยู่ในสถานะฉบับร่างระหว่างจัดรายการร่วมกับผู้ควบคุมวง' },
      category: ['CULTURAL', 'CLUB_ACTIVITY'],
      location: { en: 'CMU Main Auditorium', th: 'หอประชุมใหญ่ มช.' },
      mapLink: '',
      startAt: new Date('2027-01-15T18:00:00.000Z'),
      endAt: new Date('2027-01-15T20:00:00.000Z'),
      seatLimit: 250,
      seatsTaken: 0,
      status: EventStatus.DRAFT,
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/30_choir.jpg',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_LIBRARY },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_LIBRARY,
      organizerId: org1.id,
      title: { en: 'Library Research Skills Workshop', th: 'เวิร์กชอปทักษะการสืบค้นงานวิจัยห้องสมุด' },
      description: { en: 'Learn how to use library databases, search academic journals, and manage citations effectively with tools like Zotero and EndNote. Ideal for students starting a thesis or major research project.', th: 'เรียนรู้การใช้ฐานข้อมูลห้องสมุด การสืบค้นวารสารวิชาการ และการจัดการการอ้างอิงอย่างมีประสิทธิภาพด้วยเครื่องมือ เช่น Zotero และ EndNote เหมาะสำหรับนักศึกษาที่กำลังเริ่มทำวิทยานิพนธ์หรือโครงงานวิจัยหลัก' },
      category: ['WORKSHOP'],
      location: { en: 'CMU Central Library, Room 3', th: 'ห้อง 3 สำนักหอสมุด มช.' },
      mapLink: '',
      startAt: new Date('2026-10-14T13:00:00.000Z'),
      endAt: new Date('2026-10-14T15:00:00.000Z'),
      seatLimit: 25,
      seatsTaken: 0, // no regs yet — open for registration
      status: EventStatus.PUBLISHED,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/31_lib_research_ws.jpg',
      publishedAt: new Date('2026-09-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_PRIDEWEEK },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_PRIDEWEEK,
      organizerId: org2.id,
      title: { en: 'CMU Pride Week Celebration', th: 'สัปดาห์ไพรด์ มช.' },
      description: { en: 'A week of talks, art, and performances celebrating the LGBTQ+ community at CMU and promoting awareness and inclusion on campus. Events run daily at the Art and Culture Square, open to all students and staff.', th: 'สัปดาห์แห่งการเสวนา ศิลปะ และการแสดง เพื่อเฉลิมฉลองชุมชน LGBTQ+ ใน มช. และส่งเสริมความตระหนักรู้และการยอมรับความหลากหลายในรั้วมหาวิทยาลัย มีกิจกรรมทุกวันที่ลานวัฒนธรรม เปิดให้นักศึกษาและบุคลากรทุกคนเข้าร่วม' },
      category: ['CULTURAL', 'FESTIVAL'],
      location: { en: 'CMU Art and Culture Square', th: 'ลานวัฒนธรรม มช.' },
      mapLink: '',
      startAt: new Date('2027-06-01T00:00:00.000Z'),
      endAt: new Date('2027-06-07T23:59:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.PUBLISHED,
      contactName: 'John Doe',
      contactEmail: 'organizer2@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/32_pride.jpg',
      publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_MUAYTHAI },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_MUAYTHAI,
      organizerId: org3.id,
      title: { en: 'CMU Muay Thai Exhibition Match', th: 'การแข่งขันมวยไทยอุ่นเครื่อง มช.' },
      description: { en: "Exhibition matches by the CMU Muay Thai club, showcasing traditional techniques alongside modern training methods. A great chance to experience Thailand's national sport up close, right on campus.", th: 'การแข่งขันอุ่นเครื่องโดยชมรมมวยไทย มช. นำเสนอเทคนิคดั้งเดิมควบคู่กับวิธีการฝึกซ้อมสมัยใหม่ เป็นโอกาสดีในการสัมผัสกีฬาประจำชาติของไทยอย่างใกล้ชิดภายในรั้วมหาวิทยาลัย' },
      category: ['SPORT', 'CULTURAL'],
      location: { en: 'CMU Sports Complex', th: 'ศูนย์กีฬา มช.' },
      mapLink: '',
      startAt: new Date('2026-07-12T18:00:00.000Z'),
      endAt: new Date('2026-07-12T21:00:00.000Z'),
      seatLimit: null,
      seatsTaken: 0,
      status: EventStatus.CONCLUDED,
      contactName: 'SE Department Club',
      contactEmail: 'organizer3@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/33_muay_thai.jpg',
      publishedAt: new Date('2026-06-12T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_GRADINFO },
    update: {},
    create: {
      ...eventBase,
      id: ID.EVT_GRADINFO,
      organizerId: org1.id,
      title: { en: 'Graduate School Info Session', th: 'เซสชันแนะนำหลักสูตรบัณฑิตศึกษา' },
      description: { en: "Learn about CMU's graduate programs, covering Master's and PhD tracks across faculties, admission requirements, and available scholarships. Faculty representatives will be on hand to answer questions about each program.", th: 'เรียนรู้เกี่ยวกับหลักสูตรบัณฑิตศึกษาของ มช. ทั้งระดับปริญญาโทและเอกในทุกคณะ เกณฑ์การรับสมัคร และทุนการศึกษาที่มี ตัวแทนจากคณะต่างๆ จะพร้อมตอบคำถามเกี่ยวกับแต่ละหลักสูตร' },
      category: ['SEMINAR'],
      location: { en: 'CAMT Building Room 101', th: 'ห้อง 101 อาคาร CAMT' },
      mapLink: '',
      startAt: new Date('2026-09-10T09:00:00.000Z'),
      endAt: new Date('2026-11-30T17:00:00.000Z'),
      seatLimit: 100,
      seatsTaken: 0, // no regs yet — open for registration
      status: EventStatus.ONGOING,
      contactName: 'CAMT Student Affairs',
      contactEmail: 'organizer1@cmu.ac.th',
      bannerUrl: 'https://yormcjfdvmqapksvdbrm.supabase.co/storage/v1/object/public/evenite-images/seeds/34_graduate.jpg',
      publishedAt: new Date('2026-08-25T00:00:00.000Z'),
    },
  });

  console.log('✓ Events (34 total — various statuses and seat limits)');

  // ── Forms and Fields ─────────────────────────────────────────────────────────

  // Halloween — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_HALLOWEEN, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_HALLOWEEN_REG, eventId: ID.EVT_HALLOWEEN, type: FormType.REGISTRATION, title: 'Halloween Night Registration', description: 'Fill in your details to join.' },
  });
  const halloweenFields = [
    { id: ID.FLD_H_FIRSTNAME, formId: ID.FORM_HALLOWEEN_REG, type: FieldType.TEXT,   label: 'First Name',  isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_H_LASTNAME,  formId: ID.FORM_HALLOWEEN_REG, type: FieldType.TEXT,   label: 'Last Name',   isRequired: true,  order: 1, options: [], autoFillKey: 'lastName' },
    { id: ID.FLD_H_STUDENTID, formId: ID.FORM_HALLOWEEN_REG, type: FieldType.TEXT,   label: 'Student ID',  isRequired: true,  order: 2, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_H_YEAR,      formId: ID.FORM_HALLOWEEN_REG, type: FieldType.CHOICE, label: 'Year of Study', isRequired: true, order: 3, options: ['Year 1', 'Year 2', 'Year 3', 'Year 4'], autoFillKey: null },
    { id: ID.FLD_H_DIET,      formId: ID.FORM_HALLOWEEN_REG, type: FieldType.CHOICE, label: 'Dietary Preference', isRequired: false, order: 4, options: ['None', 'Vegetarian', 'Vegan', 'Halal'], autoFillKey: null },
  ];
  for (const f of halloweenFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // New Year — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_NEW_YEAR, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_NEW_YEAR_REG, eventId: ID.EVT_NEW_YEAR, type: FormType.REGISTRATION, title: 'New Year Party Registration', description: 'Secure your spot!' },
  });
  const newYearRegFields = [
    { id: ID.FLD_NY_FIRSTNAME, formId: ID.FORM_NEW_YEAR_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_NY_NICKNAME,  formId: ID.FORM_NEW_YEAR_REG, type: FieldType.TEXT,   label: 'Nickname',   isRequired: false, order: 1, options: [], autoFillKey: 'nickname' },
    { id: ID.FLD_NY_STUDENTID, formId: ID.FORM_NEW_YEAR_REG, type: FieldType.TEXT,   label: 'Student ID', isRequired: true,  order: 2, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_NY_MAJOR,     formId: ID.FORM_NEW_YEAR_REG, type: FieldType.TEXT,   label: 'Major',      isRequired: false, order: 3, options: [], autoFillKey: 'major' },
    { id: ID.FLD_NY_TSHIRT,    formId: ID.FORM_NEW_YEAR_REG, type: FieldType.CHOICE, label: 'T-Shirt Size', isRequired: true, order: 4, options: ['S', 'M', 'L', 'XL', 'XXL'], autoFillKey: null },
  ];
  for (const f of newYearRegFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // New Year — Feedback form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_NEW_YEAR, type: FormType.FEEDBACK } },
    update: {},
    create: { id: ID.FORM_NEW_YEAR_FB, eventId: ID.EVT_NEW_YEAR, type: FormType.FEEDBACK, title: 'New Year Party Feedback', description: 'We would love your feedback!' },
  });
  const newYearFbFields = [
    { id: ID.FLD_NYFB_OVERALL, formId: ID.FORM_NEW_YEAR_FB, type: FieldType.RATING,   label: 'Overall Experience', isRequired: true,  order: 0, options: [], autoFillKey: null },
    { id: ID.FLD_NYFB_ORG,     formId: ID.FORM_NEW_YEAR_FB, type: FieldType.RATING,   label: 'Event Organization', isRequired: true,  order: 1, options: [], autoFillKey: null },
    { id: ID.FLD_NYFB_COMMENT, formId: ID.FORM_NEW_YEAR_FB, type: FieldType.TEXTAREA, label: 'Comments',           isRequired: false, order: 2, options: [], autoFillKey: null },
  ];
  for (const f of newYearFbFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Sukhothai — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_SUKHOTHAI, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_SUKHOTHAI_REG, eventId: ID.EVT_SUKHOTHAI, type: FormType.REGISTRATION, title: 'Sukhothai Trip Registration', description: 'Register for the trip.' },
  });
  const sukhothaiFields = [
    { id: ID.FLD_SK_FIRSTNAME, formId: ID.FORM_SUKHOTHAI_REG, type: FieldType.TEXT,   label: 'First Name',        isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_SK_STUDENTID, formId: ID.FORM_SUKHOTHAI_REG, type: FieldType.TEXT,   label: 'Student ID',        isRequired: true,  order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_SK_DIETARY,   formId: ID.FORM_SUKHOTHAI_REG, type: FieldType.CHOICE, label: 'Dietary Preference', isRequired: false, order: 2, options: ['None', 'Vegetarian', 'Halal'], autoFillKey: null },
  ];
  for (const f of sukhothaiFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Exchange — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_EXCHANGE, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_EXCHANGE_REG, eventId: ID.EVT_EXCHANGE, type: FormType.REGISTRATION, title: 'Exchange Program Registration', description: 'Apply for the exchange program.' },
  });
  const exchangeFields = [
    { id: ID.FLD_EX_FIRSTNAME, formId: ID.FORM_EXCHANGE_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_EX_STUDENTID, formId: ID.FORM_EXCHANGE_REG, type: FieldType.TEXT,   label: 'Student ID', isRequired: true,  order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_EX_MAJOR,     formId: ID.FORM_EXCHANGE_REG, type: FieldType.TEXT,   label: 'Major',      isRequired: true,  order: 2, options: [], autoFillKey: 'major' },
    { id: ID.FLD_EX_GPA,       formId: ID.FORM_EXCHANGE_REG, type: FieldType.NUMBER, label: 'GPA',        isRequired: true,  order: 3, options: [], autoFillKey: null },
  ];
  for (const f of exchangeFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Bootcamp — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_BOOTCAMP, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_BOOTCAMP_REG, eventId: ID.EVT_BOOTCAMP, type: FormType.REGISTRATION, title: 'Coding Bootcamp Registration', description: 'Register for the bootcamp.' },
  });
  const bootcampFields = [
    { id: ID.FLD_BC_FIRSTNAME,  formId: ID.FORM_BOOTCAMP_REG, type: FieldType.TEXT,   label: 'First Name',      isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_BC_STUDENTID,  formId: ID.FORM_BOOTCAMP_REG, type: FieldType.TEXT,   label: 'Student ID',      isRequired: true,  order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_BC_EXPERIENCE, formId: ID.FORM_BOOTCAMP_REG, type: FieldType.CHOICE, label: 'Experience Level', isRequired: true,  order: 2, options: ['Beginner', 'Intermediate', 'Advanced'], autoFillKey: null },
  ];
  for (const f of bootcampFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Hackathon — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_HACKATHON, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_HACKATHON_REG, eventId: ID.EVT_HACKATHON, type: FormType.REGISTRATION, title: 'SE Hackathon Registration', description: 'Register your team.' },
  });
  const hackathonRegFields = [
    { id: ID.FLD_HK_FIRSTNAME, formId: ID.FORM_HACKATHON_REG, type: FieldType.TEXT, label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_HK_LASTNAME,  formId: ID.FORM_HACKATHON_REG, type: FieldType.TEXT, label: 'Last Name',  isRequired: true, order: 1, options: [], autoFillKey: 'lastName' },
    { id: ID.FLD_HK_STUDENTID, formId: ID.FORM_HACKATHON_REG, type: FieldType.TEXT, label: 'Student ID', isRequired: true, order: 2, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_HK_TEAMNAME,  formId: ID.FORM_HACKATHON_REG, type: FieldType.TEXT, label: 'Team Name',  isRequired: true, order: 3, options: [], autoFillKey: null },
  ];
  for (const f of hackathonRegFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Hackathon — Feedback form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_HACKATHON, type: FormType.FEEDBACK } },
    update: {},
    create: { id: ID.FORM_HACKATHON_FB, eventId: ID.EVT_HACKATHON, type: FormType.FEEDBACK, title: 'SE Hackathon Feedback', description: 'Share your experience.' },
  });
  const hackathonFbFields = [
    { id: ID.FLD_HKFB_OVERALL, formId: ID.FORM_HACKATHON_FB, type: FieldType.RATING,   label: 'Overall Experience', isRequired: true,  order: 0, options: [], autoFillKey: null },
    { id: ID.FLD_HKFB_COMMENT, formId: ID.FORM_HACKATHON_FB, type: FieldType.TEXTAREA, label: 'What did you enjoy?', isRequired: false, order: 1, options: [], autoFillKey: null },
  ];
  for (const f of hackathonFbFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Sports Day — Registration form (minimal)
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_SPORTS, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_SPORTS_REG, eventId: ID.EVT_SPORTS, type: FormType.REGISTRATION, title: 'Sports Day Registration', description: 'Register for sports day.' },
  });
  const sportsFields = [
    { id: ID.FLD_SP_FIRSTNAME, formId: ID.FORM_SPORTS_REG, type: FieldType.TEXT,   label: 'First Name',    isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_SP_SPORT,     formId: ID.FORM_SPORTS_REG, type: FieldType.CHOICE, label: 'Preferred Sport', isRequired: true, order: 1, options: ['Football', 'Basketball', 'Volleyball', 'Badminton'], autoFillKey: null },
  ];
  for (const f of sportsFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Concert — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_CONCERT, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_CONCERT_REG, eventId: ID.EVT_CONCERT, type: FormType.REGISTRATION, title: 'CMU Annual Concert Registration', description: 'Register for the concert.' },
  });
  const concertFields = [
    { id: ID.FLD_CN_FIRSTNAME, formId: ID.FORM_CONCERT_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_CN_STUDENTID, formId: ID.FORM_CONCERT_REG, type: FieldType.TEXT,   label: 'Student ID', isRequired: true,  order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_CN_SECTION,   formId: ID.FORM_CONCERT_REG, type: FieldType.CHOICE, label: 'Seating Section', isRequired: true, order: 2, options: ['Zone A', 'Zone B', 'Zone C'], autoFillKey: null },
  ];
  for (const f of concertFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // TEDx — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_TEDX, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_TEDX_REG, eventId: ID.EVT_TEDX, type: FormType.REGISTRATION, title: 'TEDx Registration', description: 'Reserve your seat.' },
  });
  const tedxFields = [
    { id: ID.FLD_TX_FIRSTNAME, formId: ID.FORM_TEDX_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_TX_STUDENTID, formId: ID.FORM_TEDX_REG, type: FieldType.TEXT,   label: 'Student ID', isRequired: true, order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_TX_TOPIC,     formId: ID.FORM_TEDX_REG, type: FieldType.CHOICE, label: 'Topic You Are Most Interested In', isRequired: false, order: 2, options: ['AI & Society', 'Sustainability', 'Entrepreneurship', 'Design'], autoFillKey: null },
  ];
  for (const f of tedxFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Job Fair — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_JOBFAIR, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_JOBFAIR_REG, eventId: ID.EVT_JOBFAIR, type: FormType.REGISTRATION, title: 'Job Fair Registration', description: 'Register to attend.' },
  });
  const jobfairFields = [
    { id: ID.FLD_JF_FIRSTNAME, formId: ID.FORM_JOBFAIR_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_JF_MAJOR,     formId: ID.FORM_JOBFAIR_REG, type: FieldType.TEXT,   label: 'Major',      isRequired: true, order: 1, options: [], autoFillKey: 'major' },
    { id: ID.FLD_JF_INDUSTRY,  formId: ID.FORM_JOBFAIR_REG, type: FieldType.CHOICE, label: 'Industry of Interest', isRequired: false, order: 2, options: ['Tech', 'Finance', 'Engineering', 'Design', 'Other'], autoFillKey: null },
  ];
  for (const f of jobfairFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Blood Donation — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_BLOODDONATION, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_BLOODDONATION_REG, eventId: ID.EVT_BLOODDONATION, type: FormType.REGISTRATION, title: 'Blood Donation Registration', description: 'Sign up for a donation slot.' },
  });
  const blooddonationFields = [
    { id: ID.FLD_BD_FIRSTNAME, formId: ID.FORM_BLOODDONATION_REG, type: FieldType.TEXT,     label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_BD_STUDENTID, formId: ID.FORM_BLOODDONATION_REG, type: FieldType.TEXT,     label: 'Student ID', isRequired: true, order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_BD_BLOODTYPE, formId: ID.FORM_BLOODDONATION_REG, type: FieldType.CHOICE,   label: 'Blood Type', isRequired: false, order: 2, options: ['A', 'B', 'AB', 'O', 'Unknown'], autoFillKey: null },
    { id: ID.FLD_BD_HEALTHOK,  formId: ID.FORM_BLOODDONATION_REG, type: FieldType.CHECKBOX, label: 'Health Declaration', isRequired: true, order: 3, options: ['I am in good health and eligible to donate'], autoFillKey: null },
  ];
  for (const f of blooddonationFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Startup Pitch — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_STARTUPPITCH, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_STARTUPPITCH_REG, eventId: ID.EVT_STARTUPPITCH, type: FormType.REGISTRATION, title: 'Startup Pitch Registration', description: 'Register your team.' },
  });
  const startuppitchFields = [
    { id: ID.FLD_SP2_TEAMNAME,  formId: ID.FORM_STARTUPPITCH_REG, type: FieldType.TEXT, label: 'Team Name',       isRequired: true,  order: 0, options: [], autoFillKey: null },
    { id: ID.FLD_SP2_FIRSTNAME, formId: ID.FORM_STARTUPPITCH_REG, type: FieldType.TEXT, label: 'First Name',      isRequired: true,  order: 1, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_SP2_PITCHNAME, formId: ID.FORM_STARTUPPITCH_REG, type: FieldType.TEXT, label: 'Pitch Title',     isRequired: true,  order: 2, options: [], autoFillKey: null },
  ];
  for (const f of startuppitchFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Ping River Clean-Up — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_CLEANUP, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_CLEANUP_REG, eventId: ID.EVT_CLEANUP, type: FormType.REGISTRATION, title: 'Clean-Up Day Registration', description: 'Sign up to volunteer.' },
  });
  const cleanupFields = [
    { id: ID.FLD_CU_FIRSTNAME, formId: ID.FORM_CLEANUP_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_CU_STUDENTID, formId: ID.FORM_CLEANUP_REG, type: FieldType.TEXT,   label: 'Student ID', isRequired: true,  order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_CU_TSHIRT,    formId: ID.FORM_CLEANUP_REG, type: FieldType.CHOICE, label: 'T-Shirt Size', isRequired: false, order: 2, options: ['S', 'M', 'L', 'XL'], autoFillKey: null },
  ];
  for (const f of cleanupFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Mental Health Workshop — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_MENTALHEALTH, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_MENTALHEALTH_REG, eventId: ID.EVT_MENTALHEALTH, type: FormType.REGISTRATION, title: 'Mental Health Workshop Registration', description: 'Reserve your spot.' },
  });
  const mentalhealthFields = [
    { id: ID.FLD_MH_FIRSTNAME, formId: ID.FORM_MENTALHEALTH_REG, type: FieldType.TEXT,     label: 'First Name', isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_MH_FOCUS,     formId: ID.FORM_MENTALHEALTH_REG, type: FieldType.TEXTAREA, label: 'What would you like to focus on? (optional)', isRequired: false, order: 1, options: [], autoFillKey: null },
  ];
  for (const f of mentalhealthFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Data Science Bootcamp — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_DATASCIENCE, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_DATASCIENCE_REG, eventId: ID.EVT_DATASCIENCE, type: FormType.REGISTRATION, title: 'Data Science Bootcamp Registration', description: 'Register for the bootcamp.' },
  });
  const datascienceFields = [
    { id: ID.FLD_DS_FIRSTNAME,  formId: ID.FORM_DATASCIENCE_REG, type: FieldType.TEXT,   label: 'First Name',      isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_DS_STUDENTID,  formId: ID.FORM_DATASCIENCE_REG, type: FieldType.TEXT,   label: 'Student ID',      isRequired: true, order: 1, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_DS_EXPERIENCE, formId: ID.FORM_DATASCIENCE_REG, type: FieldType.CHOICE, label: 'Experience Level', isRequired: true, order: 2, options: ['Beginner', 'Intermediate', 'Advanced'], autoFillKey: null },
  ];
  for (const f of datascienceFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Chess Tournament — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_CHESS, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_CHESS_REG, eventId: ID.EVT_CHESS, type: FormType.REGISTRATION, title: 'Chess Tournament Registration', description: 'Register to compete.' },
  });
  const chessFields = [
    { id: ID.FLD_CH_FIRSTNAME, formId: ID.FORM_CHESS_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true,  order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_CH_RATING,    formId: ID.FORM_CHESS_REG, type: FieldType.NUMBER, label: 'Chess Rating (if known)', isRequired: false, order: 1, options: [], autoFillKey: null },
  ];
  for (const f of chessFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Freshmen Welcome Camp — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_FRESHMENCAMP, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_FRESHMENCAMP_REG, eventId: ID.EVT_FRESHMENCAMP, type: FormType.REGISTRATION, title: 'Freshmen Camp Registration', description: 'Register for the welcome camp.' },
  });
  const freshmencampFields = [
    { id: ID.FLD_FC_FIRSTNAME, formId: ID.FORM_FRESHMENCAMP_REG, type: FieldType.TEXT, label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_FC_LASTNAME,  formId: ID.FORM_FRESHMENCAMP_REG, type: FieldType.TEXT, label: 'Last Name',  isRequired: true, order: 1, options: [], autoFillKey: 'lastName' },
    { id: ID.FLD_FC_STUDENTID, formId: ID.FORM_FRESHMENCAMP_REG, type: FieldType.TEXT, label: 'Student ID', isRequired: true, order: 2, options: [], autoFillKey: 'studentId' },
    { id: ID.FLD_FC_FACULTY,   formId: ID.FORM_FRESHMENCAMP_REG, type: FieldType.TEXT, label: 'Faculty',    isRequired: true, order: 3, options: [], autoFillKey: null },
  ];
  for (const f of freshmencampFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Library Research Skills Workshop — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_LIBRARY, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_LIBRARY_REG, eventId: ID.EVT_LIBRARY, type: FormType.REGISTRATION, title: 'Library Workshop Registration', description: 'Reserve your seat.' },
  });
  const libraryFields = [
    { id: ID.FLD_LB_FIRSTNAME, formId: ID.FORM_LIBRARY_REG, type: FieldType.TEXT, label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_LB_STUDENTID, formId: ID.FORM_LIBRARY_REG, type: FieldType.TEXT, label: 'Student ID', isRequired: true, order: 1, options: [], autoFillKey: 'studentId' },
  ];
  for (const f of libraryFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Grad School Info Session — Registration form
  await prisma.form.upsert({
    where: { eventId_type: { eventId: ID.EVT_GRADINFO, type: FormType.REGISTRATION } },
    update: {},
    create: { id: ID.FORM_GRADINFO_REG, eventId: ID.EVT_GRADINFO, type: FormType.REGISTRATION, title: 'Grad Info Session Registration', description: 'Register to attend.' },
  });
  const gradinfoFields = [
    { id: ID.FLD_GI_FIRSTNAME, formId: ID.FORM_GRADINFO_REG, type: FieldType.TEXT,   label: 'First Name', isRequired: true, order: 0, options: [], autoFillKey: 'firstName' },
    { id: ID.FLD_GI_PROGRAM,   formId: ID.FORM_GRADINFO_REG, type: FieldType.CHOICE, label: 'Program of Interest', isRequired: true, order: 1, options: ['Master', 'PhD'], autoFillKey: null },
  ];
  for (const f of gradinfoFields) {
    await prisma.formField.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  console.log('✓ Forms and fields');

  // ── Registrations, Form Responses, Tickets ───────────────────────────────────
  // Generated from config — each entry creates: EventRegistration + FormResponse + FormFieldResponses + Ticket

  type RegConfig = {
    registrationId: string;
    ticketId: string;
    formResponseId: string;
    participantKey: keyof typeof PARTICIPANT_DATA;
    eventId: string;
    formId: string;
    formFields: { id: string; autoFillKey: string | null; type: FieldType; options: string[] }[];
    registrationStatus: RegistrationStatus;
    ticketStatus: TicketStatus;
    extraAnswers?: Record<string, string | number | string[]>;
    createdAt?: Date;
  };

  const registrationConfigs: RegConfig[] = [
    // ── Halloween — par1, par2, par3 CONFIRMED ──────────────────────────────
    {
      registrationId: 'a1000001-0000-4000-8000-000000000001',
      ticketId:       'b1000001-0000-4000-8000-000000000001',
      formResponseId: 'c1000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_HALLOWEEN, formId: ID.FORM_HALLOWEEN_REG,
      formFields: halloweenFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_H_YEAR]: ['Year 3'], [ID.FLD_H_DIET]: ['Vegetarian'] },
      createdAt: new Date('2026-09-05T10:00:00.000Z'),
    },
    {
      registrationId: 'a1000002-0000-4000-8000-000000000002',
      ticketId:       'b1000002-0000-4000-8000-000000000002',
      formResponseId: 'c1000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_HALLOWEEN, formId: ID.FORM_HALLOWEEN_REG,
      formFields: halloweenFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_H_YEAR]: ['Year 4'], [ID.FLD_H_DIET]: ['None'] },
      createdAt: new Date('2026-09-06T11:00:00.000Z'),
    },
    {
      registrationId: 'a1000003-0000-4000-8000-000000000003',
      ticketId:       'b1000003-0000-4000-8000-000000000003',
      formResponseId: 'c1000003-0000-4000-8000-000000000003',
      participantKey: 'PAR3', eventId: ID.EVT_HALLOWEEN, formId: ID.FORM_HALLOWEEN_REG,
      formFields: halloweenFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_H_YEAR]: ['Year 3'], [ID.FLD_H_DIET]: ['None'] },
      createdAt: new Date('2026-09-07T09:00:00.000Z'),
    },

    // ── New Year — ALL 5 participants CONFIRMED (event FULL, seatLimit=5) ───
    {
      registrationId: 'a2000001-0000-4000-8000-000000000001',
      ticketId:       'b2000001-0000-4000-8000-000000000001',
      formResponseId: 'c2000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['M'] },
      createdAt: new Date('2026-09-06T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000002-0000-4000-8000-000000000002',
      ticketId:       'b2000002-0000-4000-8000-000000000002',
      formResponseId: 'c2000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['L'] },
      createdAt: new Date('2026-09-07T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000003-0000-4000-8000-000000000003',
      ticketId:       'b2000003-0000-4000-8000-000000000003',
      formResponseId: 'c2000003-0000-4000-8000-000000000003',
      participantKey: 'PAR3', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['S'] },
      createdAt: new Date('2026-09-08T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000004-0000-4000-8000-000000000004',
      ticketId:       'b2000004-0000-4000-8000-000000000004',
      formResponseId: 'c2000004-0000-4000-8000-000000000004',
      participantKey: 'PAR4', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['XL'] },
      createdAt: new Date('2026-09-09T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000005-0000-4000-8000-000000000005',
      ticketId:       'b2000005-0000-4000-8000-000000000005',
      formResponseId: 'c2000005-0000-4000-8000-000000000005',
      participantKey: 'PAR5', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['XXL'] },
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
    },

    // ── Sukhothai — par1 CONFIRMED, par2 CANCELLED ──────────────────────────
    {
      registrationId: 'a3000001-0000-4000-8000-000000000001',
      ticketId:       'b3000001-0000-4000-8000-000000000001',
      formResponseId: 'c3000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_SUKHOTHAI, formId: ID.FORM_SUKHOTHAI_REG,
      formFields: sukhothaiFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_SK_DIETARY]: ['None'] },
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
    },
    {
      registrationId: 'a3000002-0000-4000-8000-000000000002',
      ticketId:       'b3000002-0000-4000-8000-000000000002',
      formResponseId: 'c3000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_SUKHOTHAI, formId: ID.FORM_SUKHOTHAI_REG,
      formFields: sukhothaiFields,
      registrationStatus: RegistrationStatus.CANCELLED, ticketStatus: TicketStatus.CANCELLED,
      extraAnswers: { [ID.FLD_SK_DIETARY]: ['Vegetarian'] },
      createdAt: new Date('2026-09-16T10:00:00.000Z'),
    },

    // ── Exchange — par1, par2, par3 CONFIRMED (event FULL, seatLimit=3) ─────
    {
      registrationId: 'a4000001-0000-4000-8000-000000000001',
      ticketId:       'b4000001-0000-4000-8000-000000000001',
      formResponseId: 'c4000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_EXCHANGE, formId: ID.FORM_EXCHANGE_REG,
      formFields: exchangeFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_EX_GPA]: 3.8 },
      createdAt: new Date('2026-08-05T10:00:00.000Z'),
    },
    {
      registrationId: 'a4000002-0000-4000-8000-000000000002',
      ticketId:       'b4000002-0000-4000-8000-000000000002',
      formResponseId: 'c4000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_EXCHANGE, formId: ID.FORM_EXCHANGE_REG,
      formFields: exchangeFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_EX_GPA]: 3.5 },
      createdAt: new Date('2026-08-06T10:00:00.000Z'),
    },
    {
      registrationId: 'a4000003-0000-4000-8000-000000000003',
      ticketId:       'b4000003-0000-4000-8000-000000000003',
      formResponseId: 'c4000003-0000-4000-8000-000000000003',
      participantKey: 'PAR3', eventId: ID.EVT_EXCHANGE, formId: ID.FORM_EXCHANGE_REG,
      formFields: exchangeFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_EX_GPA]: 3.2 },
      createdAt: new Date('2026-08-07T10:00:00.000Z'),
    },

    // ── Bootcamp — par1 CONFIRMED, par3 CONFIRMED ───────────────────────────
    {
      registrationId: 'a5000001-0000-4000-8000-000000000001',
      ticketId:       'b5000001-0000-4000-8000-000000000001',
      formResponseId: 'c5000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_BOOTCAMP, formId: ID.FORM_BOOTCAMP_REG,
      formFields: bootcampFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_BC_EXPERIENCE]: ['Intermediate'] },
      createdAt: new Date('2026-07-10T10:00:00.000Z'),
    },
    {
      registrationId: 'a5000002-0000-4000-8000-000000000002',
      ticketId:       'b5000002-0000-4000-8000-000000000002',
      formResponseId: 'c5000002-0000-4000-8000-000000000002',
      participantKey: 'PAR3', eventId: ID.EVT_BOOTCAMP, formId: ID.FORM_BOOTCAMP_REG,
      formFields: bootcampFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_BC_EXPERIENCE]: ['Beginner'] },
      createdAt: new Date('2026-07-11T10:00:00.000Z'),
    },

    // ── Hackathon — par1, par2 CONFIRMED, tickets EXPIRED (concluded event) ─
    {
      registrationId: 'a6000001-0000-4000-8000-000000000001',
      ticketId:       'b6000001-0000-4000-8000-000000000001',
      formResponseId: 'c6000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_HACKATHON, formId: ID.FORM_HACKATHON_REG,
      formFields: hackathonRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_HK_TEAMNAME]: 'Team Alpha' },
      createdAt: new Date('2026-04-25T10:00:00.000Z'),
    },
    {
      registrationId: 'a6000002-0000-4000-8000-000000000002',
      ticketId:       'b6000002-0000-4000-8000-000000000002',
      formResponseId: 'c6000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_HACKATHON, formId: ID.FORM_HACKATHON_REG,
      formFields: hackathonRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_HK_TEAMNAME]: 'Team Beta' },
      createdAt: new Date('2026-04-26T10:00:00.000Z'),
    },

    // ── Sports Day — par2, par4 CONFIRMED, tickets EXPIRED (concluded, unlimited) ─
    {
      registrationId: 'a7000001-0000-4000-8000-000000000001',
      ticketId:       'b7000001-0000-4000-8000-000000000001',
      formResponseId: 'c7000001-0000-4000-8000-000000000001',
      participantKey: 'PAR2', eventId: ID.EVT_SPORTS, formId: ID.FORM_SPORTS_REG,
      formFields: sportsFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_SP_SPORT]: ['Football'] },
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
    },
    {
      registrationId: 'a7000002-0000-4000-8000-000000000002',
      ticketId:       'b7000002-0000-4000-8000-000000000002',
      formResponseId: 'c7000002-0000-4000-8000-000000000002',
      participantKey: 'PAR4', eventId: ID.EVT_SPORTS, formId: ID.FORM_SPORTS_REG,
      formFields: sportsFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_SP_SPORT]: ['Basketball'] },
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
    },

    // ── TEDx — par1, par2 CONFIRMED ──────────────────────────────────────────
    {
      registrationId: 'a8000001-0000-4000-8000-000000000001',
      ticketId:       'b8000001-0000-4000-8000-000000000001',
      formResponseId: 'c8000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_TEDX, formId: ID.FORM_TEDX_REG,
      formFields: tedxFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_TX_TOPIC]: ['AI & Society'] },
      createdAt: new Date('2026-09-08T10:00:00.000Z'),
    },
    {
      registrationId: 'a8000002-0000-4000-8000-000000000002',
      ticketId:       'b8000002-0000-4000-8000-000000000002',
      formResponseId: 'c8000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_TEDX, formId: ID.FORM_TEDX_REG,
      formFields: tedxFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_TX_TOPIC]: ['Entrepreneurship'] },
      createdAt: new Date('2026-09-09T10:00:00.000Z'),
    },

    // ── Job Fair — par3, par4 CONFIRMED ──────────────────────────────────────
    {
      registrationId: 'a9000001-0000-4000-8000-000000000001',
      ticketId:       'b9000001-0000-4000-8000-000000000001',
      formResponseId: 'c9000001-0000-4000-8000-000000000001',
      participantKey: 'PAR3', eventId: ID.EVT_JOBFAIR, formId: ID.FORM_JOBFAIR_REG,
      formFields: jobfairFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_JF_INDUSTRY]: ['Tech'] },
      createdAt: new Date('2026-09-12T10:00:00.000Z'),
    },
    {
      registrationId: 'a9000002-0000-4000-8000-000000000002',
      ticketId:       'b9000002-0000-4000-8000-000000000002',
      formResponseId: 'c9000002-0000-4000-8000-000000000002',
      participantKey: 'PAR4', eventId: ID.EVT_JOBFAIR, formId: ID.FORM_JOBFAIR_REG,
      formFields: jobfairFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_JF_INDUSTRY]: ['Engineering'] },
      createdAt: new Date('2026-09-13T10:00:00.000Z'),
    },

    // ── Startup Pitch — par1, par3 CONFIRMED ─────────────────────────────────
    {
      registrationId: 'aa000001-0000-4000-8000-000000000001',
      ticketId:       'ba000001-0000-4000-8000-000000000001',
      formResponseId: 'ca000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_STARTUPPITCH, formId: ID.FORM_STARTUPPITCH_REG,
      formFields: startuppitchFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_SP2_TEAMNAME]: 'Team Nimbus', [ID.FLD_SP2_PITCHNAME]: 'Campus Ride-Share App' },
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
    },
    {
      registrationId: 'aa000002-0000-4000-8000-000000000002',
      ticketId:       'ba000002-0000-4000-8000-000000000002',
      formResponseId: 'ca000002-0000-4000-8000-000000000002',
      participantKey: 'PAR3', eventId: ID.EVT_STARTUPPITCH, formId: ID.FORM_STARTUPPITCH_REG,
      formFields: startuppitchFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_SP2_TEAMNAME]: 'Team GreenLoop', [ID.FLD_SP2_PITCHNAME]: 'Campus Recycling Rewards' },
      createdAt: new Date('2026-09-16T10:00:00.000Z'),
    },

    // ── Ping River Clean-Up — par2, par4 CONFIRMED, tickets EXPIRED (concluded) ─
    {
      registrationId: 'ab000001-0000-4000-8000-000000000001',
      ticketId:       'bb000001-0000-4000-8000-000000000001',
      formResponseId: 'cb000001-0000-4000-8000-000000000001',
      participantKey: 'PAR2', eventId: ID.EVT_CLEANUP, formId: ID.FORM_CLEANUP_REG,
      formFields: cleanupFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_CU_TSHIRT]: ['M'] },
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    },
    {
      registrationId: 'ab000002-0000-4000-8000-000000000002',
      ticketId:       'bb000002-0000-4000-8000-000000000002',
      formResponseId: 'cb000002-0000-4000-8000-000000000002',
      participantKey: 'PAR4', eventId: ID.EVT_CLEANUP, formId: ID.FORM_CLEANUP_REG,
      formFields: cleanupFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_CU_TSHIRT]: ['L'] },
      createdAt: new Date('2026-08-02T10:00:00.000Z'),
    },

    // ── Data Science Bootcamp — par1, par5 CONFIRMED ─────────────────────────
    {
      registrationId: 'ac000001-0000-4000-8000-000000000001',
      ticketId:       'bc000001-0000-4000-8000-000000000001',
      formResponseId: 'cc000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_DATASCIENCE, formId: ID.FORM_DATASCIENCE_REG,
      formFields: datascienceFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_DS_EXPERIENCE]: ['Intermediate'] },
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    },
    {
      registrationId: 'ac000002-0000-4000-8000-000000000002',
      ticketId:       'bc000002-0000-4000-8000-000000000002',
      formResponseId: 'cc000002-0000-4000-8000-000000000002',
      participantKey: 'PAR5', eventId: ID.EVT_DATASCIENCE, formId: ID.FORM_DATASCIENCE_REG,
      formFields: datascienceFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_DS_EXPERIENCE]: ['Beginner'] },
      createdAt: new Date('2026-08-21T10:00:00.000Z'),
    },

    // ── Freshmen Welcome Camp — par1, par2, par3 CONFIRMED, tickets EXPIRED (concluded) ─
    {
      registrationId: 'ad000001-0000-4000-8000-000000000001',
      ticketId:       'bd000001-0000-4000-8000-000000000001',
      formResponseId: 'cd000001-0000-4000-8000-000000000001',
      participantKey: 'PAR1', eventId: ID.EVT_FRESHMENCAMP, formId: ID.FORM_FRESHMENCAMP_REG,
      formFields: freshmencampFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_FC_FACULTY]: 'CAMT' },
      createdAt: new Date('2026-05-15T10:00:00.000Z'),
    },
    {
      registrationId: 'ad000002-0000-4000-8000-000000000002',
      ticketId:       'bd000002-0000-4000-8000-000000000002',
      formResponseId: 'cd000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_FRESHMENCAMP, formId: ID.FORM_FRESHMENCAMP_REG,
      formFields: freshmencampFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_FC_FACULTY]: 'CAMT' },
      createdAt: new Date('2026-05-16T10:00:00.000Z'),
    },
    {
      registrationId: 'ad000003-0000-4000-8000-000000000003',
      ticketId:       'bd000003-0000-4000-8000-000000000003',
      formResponseId: 'cd000003-0000-4000-8000-000000000003',
      participantKey: 'PAR3', eventId: ID.EVT_FRESHMENCAMP, formId: ID.FORM_FRESHMENCAMP_REG,
      formFields: freshmencampFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.EXPIRED,
      extraAnswers: { [ID.FLD_FC_FACULTY]: 'Engineering' },
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
    },
  ];

  // Execute all registrations
  let regCount = 0;
  for (const config of registrationConfigs) {
    await createFullRegistration({
      ...config,
      participantId: PARTICIPANT_DATA[config.participantKey].id,
      participant: PARTICIPANT_DATA[config.participantKey],
    });
    regCount++;
  }
  console.log(`✓ Registrations + Form Responses + Tickets (${regCount} registrations)`);

  // ── Feedback Responses ───────────────────────────────────────────────────────
  // Only for concluded events where participant was CONFIRMED

  type FeedbackConfig = {
    formResponseId: string;
    registrationId: string;
    formId: string;
    formFields: { id: string; autoFillKey: string | null; type: FieldType; options: string[] }[];
    answers: Record<string, string | number | string[] | null>;
  };

  const feedbackConfigs: FeedbackConfig[] = [
    // Hackathon feedback — par1
    {
      formResponseId: 'fb000001-0000-4000-8000-000000000001',
      registrationId: 'a6000001-0000-4000-8000-000000000001',
      formId: ID.FORM_HACKATHON_FB,
      formFields: hackathonFbFields,
      answers: {
        [ID.FLD_HKFB_OVERALL]: 5,
        [ID.FLD_HKFB_COMMENT]: 'Amazing experience! Learned a lot.',
      },
    },
    // Hackathon feedback — par2
    {
      formResponseId: 'fb000002-0000-4000-8000-000000000002',
      registrationId: 'a6000002-0000-4000-8000-000000000002',
      formId: ID.FORM_HACKATHON_FB,
      formFields: hackathonFbFields,
      answers: {
        [ID.FLD_HKFB_OVERALL]: 4,
        [ID.FLD_HKFB_COMMENT]: 'Well organized. Would join again.',
      },
    },
    // New Year feedback — par1 only (par2-par5 have NOT submitted — useful for testing)
    {
      formResponseId: 'fb000003-0000-4000-8000-000000000003',
      registrationId: 'a2000001-0000-4000-8000-000000000001',
      formId: ID.FORM_NEW_YEAR_FB,
      formFields: newYearFbFields,
      answers: {
        [ID.FLD_NYFB_OVERALL]: 5,
        [ID.FLD_NYFB_ORG]: 4,
        [ID.FLD_NYFB_COMMENT]: 'Had a great time!',
      },
    },
  ];

  for (const config of feedbackConfigs) {
    await createFeedbackResponse(config);
  }
  console.log(`✓ Feedback responses (${feedbackConfigs.length} responses)`);

  // ── Discussion Rooms ─────────────────────────────────────────────────────────
  // Every event gets a discussion room (1:1), regardless of status.

  const roomByEventId: Record<string, string> = {
    [ID.EVT_HALLOWEEN]:   ID.ROOM_HALLOWEEN,
    [ID.EVT_NEW_YEAR]:    ID.ROOM_NEW_YEAR,
    [ID.EVT_SUKHOTHAI]:   ID.ROOM_SUKHOTHAI,
    [ID.EVT_EXCHANGE]:    ID.ROOM_EXCHANGE,
    [ID.EVT_BOOTCAMP]:    ID.ROOM_BOOTCAMP,
    [ID.EVT_HACKATHON]:   ID.ROOM_HACKATHON,
    [ID.EVT_SPORTS]:      ID.ROOM_SPORTS,
    [ID.EVT_ORIENTATION]: ID.ROOM_ORIENTATION,
    [ID.EVT_AI_SEMINAR]:  ID.ROOM_AI_SEMINAR,
    [ID.EVT_NO_FORM]:     ID.ROOM_NO_FORM,
    [ID.EVT_DRAFT1]:      ID.ROOM_DRAFT1,
    [ID.EVT_DRAFT2]:      ID.ROOM_DRAFT2,
    [ID.EVT_DRAFT3]:      ID.ROOM_DRAFT3,
    [ID.EVT_CONCERT]:     ID.ROOM_CONCERT,

    [ID.EVT_TEDX]:          ID.ROOM_TEDX,
    [ID.EVT_JOBFAIR]:       ID.ROOM_JOBFAIR,
    [ID.EVT_BLOODDONATION]: ID.ROOM_BLOODDONATION,
    [ID.EVT_FRESHYNIGHT]:   ID.ROOM_FRESHYNIGHT,
    [ID.EVT_STARTUPPITCH]:  ID.ROOM_STARTUPPITCH,
    [ID.EVT_FOOTBALL]:      ID.ROOM_FOOTBALL,
    [ID.EVT_PHOTOEXHIBIT]:  ID.ROOM_PHOTOEXHIBIT,
    [ID.EVT_CLEANUP]:       ID.ROOM_CLEANUP,
    [ID.EVT_MENTALHEALTH]:  ID.ROOM_MENTALHEALTH,
    [ID.EVT_OPENHOUSE]:     ID.ROOM_OPENHOUSE,
    [ID.EVT_DATASCIENCE]:   ID.ROOM_DATASCIENCE,
    [ID.EVT_CHESS]:         ID.ROOM_CHESS,
    [ID.EVT_FOODFEST]:      ID.ROOM_FOODFEST,
    [ID.EVT_ROBOTICS]:      ID.ROOM_ROBOTICS,
    [ID.EVT_FRESHMENCAMP]:  ID.ROOM_FRESHMENCAMP,
    [ID.EVT_CHOIR]:         ID.ROOM_CHOIR,
    [ID.EVT_LIBRARY]:       ID.ROOM_LIBRARY,
    [ID.EVT_PRIDEWEEK]:     ID.ROOM_PRIDEWEEK,
    [ID.EVT_MUAYTHAI]:      ID.ROOM_MUAYTHAI,
    [ID.EVT_GRADINFO]:      ID.ROOM_GRADINFO,
  };

  await Promise.all(
    Object.entries(roomByEventId).map(([eventId, roomId]) =>
      prisma.discussionRoom.upsert({
        where: { eventId },
        update: {},
        create: { id: roomId, eventId },
      }),
    ),
  );
  console.log(`✓ Discussion rooms (${Object.keys(roomByEventId).length} — one per event)`);

  // ── Discussion Messages ──────────────────────────────────────────────────────
  // Only seeded for rooms whose event has confirmed registrations to chat with.
  // Note: Hackathon and Sports Day concluded well outside the 72h read-only grace
  // period, so their rooms are already read-only — useful for testing that state.

  type MessageConfig = {
    id: string;
    roomId: string;
    content: string;
    isAnnouncement?: boolean;
    senderParticipantId?: string;
    senderOrganizerId?: string;
    createdAt: Date;
    serialNumber: number;
  };

  const messageConfigs: MessageConfig[] = [
    // ── Halloween ────────────────────────────────────────────────────────────
    { id: '81000001-0000-4000-8000-000000000001', roomId: ID.ROOM_HALLOWEEN, content: 'Welcome to the Halloween Night discussion room! Costume contest signup closes Oct 25.', isAnnouncement: true, senderOrganizerId: org1.id, createdAt: new Date('2026-09-05T12:00:00.000Z'), serialNumber: 1 },
    { id: '81000002-0000-4000-8000-000000000002', roomId: ID.ROOM_HALLOWEEN, content: 'Excited for this!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-09-05T13:00:00.000Z'), serialNumber: 2 },
    { id: '81000003-0000-4000-8000-000000000003', roomId: ID.ROOM_HALLOWEEN, content: 'What should we wear?', senderParticipantId: ID.PAR2, createdAt: new Date('2026-09-05T14:00:00.000Z'), serialNumber: 3 },
    { id: '81000004-0000-4000-8000-000000000004', roomId: ID.ROOM_HALLOWEEN, content: 'Costumes encouraged but not required!', senderOrganizerId: org1.id, createdAt: new Date('2026-09-05T15:00:00.000Z'), serialNumber: 4 },
    { id: '81000005-0000-4000-8000-000000000005', roomId: ID.ROOM_HALLOWEEN, content: "Can't wait!", senderParticipantId: ID.PAR3, createdAt: new Date('2026-09-05T16:00:00.000Z'), serialNumber: 5 },

    // ── New Year ─────────────────────────────────────────────────────────────
    { id: '82000001-0000-4000-8000-000000000001', roomId: ID.ROOM_NEW_YEAR, content: 'Countdown party details have been posted — check the agenda!', isAnnouncement: true, senderOrganizerId: org1.id, createdAt: new Date('2026-09-06T12:00:00.000Z'), serialNumber: 1 },
    { id: '82000002-0000-4000-8000-000000000002', roomId: ID.ROOM_NEW_YEAR, content: 'So hyped!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-09-06T13:00:00.000Z'), serialNumber: 2 },
    { id: '82000003-0000-4000-8000-000000000003', roomId: ID.ROOM_NEW_YEAR, content: 'Where do we park?', senderParticipantId: ID.PAR4, createdAt: new Date('2026-09-06T14:00:00.000Z'), serialNumber: 3 },
    { id: '82000004-0000-4000-8000-000000000004', roomId: ID.ROOM_NEW_YEAR, content: 'Parking is available at the CAMT lot.', senderOrganizerId: org1.id, createdAt: new Date('2026-09-06T15:00:00.000Z'), serialNumber: 4 },

    // ── Sukhothai ────────────────────────────────────────────────────────────
    { id: '83000001-0000-4000-8000-000000000001', roomId: ID.ROOM_SUKHOTHAI, content: 'Trip itinerary has been emailed to everyone.', senderOrganizerId: org2.id, createdAt: new Date('2026-09-15T12:00:00.000Z'), serialNumber: 1 },
    { id: '83000002-0000-4000-8000-000000000002', roomId: ID.ROOM_SUKHOTHAI, content: 'Looking forward to it!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-09-15T13:00:00.000Z'), serialNumber: 2 },

    // ── Exchange ─────────────────────────────────────────────────────────────
    { id: '84000001-0000-4000-8000-000000000001', roomId: ID.ROOM_EXCHANGE, content: 'Orientation session has been moved online.', isAnnouncement: true, senderOrganizerId: org2.id, createdAt: new Date('2026-08-05T12:00:00.000Z'), serialNumber: 1 },
    { id: '84000002-0000-4000-8000-000000000002', roomId: ID.ROOM_EXCHANGE, content: 'Thanks for the update.', senderParticipantId: ID.PAR2, createdAt: new Date('2026-08-05T13:00:00.000Z'), serialNumber: 2 },
    { id: '84000003-0000-4000-8000-000000000003', roomId: ID.ROOM_EXCHANGE, content: 'Noted, thanks.', senderParticipantId: ID.PAR1, createdAt: new Date('2026-08-05T14:00:00.000Z'), serialNumber: 3 },
    { id: '84000004-0000-4000-8000-000000000004', roomId: ID.ROOM_EXCHANGE, content: 'Let us know if you have any questions.', senderOrganizerId: org2.id, createdAt: new Date('2026-08-05T15:00:00.000Z'), serialNumber: 4 },
    { id: '84000005-0000-4000-8000-000000000005', roomId: ID.ROOM_EXCHANGE, content: "When's the first session?", senderParticipantId: ID.PAR3, createdAt: new Date('2026-08-05T16:00:00.000Z'), serialNumber: 5 },

    // ── Bootcamp ─────────────────────────────────────────────────────────────
    { id: '85000001-0000-4000-8000-000000000001', roomId: ID.ROOM_BOOTCAMP, content: 'Welcome to the bootcamp cohort!', senderOrganizerId: org2.id, createdAt: new Date('2026-07-10T12:00:00.000Z'), serialNumber: 1 },
    { id: '85000002-0000-4000-8000-000000000002', roomId: ID.ROOM_BOOTCAMP, content: 'Excited to start!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-07-10T13:00:00.000Z'), serialNumber: 2 },
    { id: '85000003-0000-4000-8000-000000000003', roomId: ID.ROOM_BOOTCAMP, content: 'Same here!', senderParticipantId: ID.PAR3, createdAt: new Date('2026-07-10T14:00:00.000Z'), serialNumber: 3 },
    { id: '85000004-0000-4000-8000-000000000004', roomId: ID.ROOM_BOOTCAMP, content: 'Lab access codes were sent via email.', isAnnouncement: true, senderOrganizerId: org2.id, createdAt: new Date('2026-07-10T15:00:00.000Z'), serialNumber: 4 },

    // ── Hackathon (CONCLUDED, past 72h grace — room is read-only) ──────────────
    { id: '86000001-0000-4000-8000-000000000001', roomId: ID.ROOM_HACKATHON, content: 'Good luck to all teams!', senderOrganizerId: org3.id, createdAt: new Date('2026-05-20T09:30:00.000Z'), serialNumber: 1 },
    { id: '86000002-0000-4000-8000-000000000002', roomId: ID.ROOM_HACKATHON, content: 'Team Alpha ready!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-05-20T09:45:00.000Z'), serialNumber: 2 },
    { id: '86000003-0000-4000-8000-000000000003', roomId: ID.ROOM_HACKATHON, content: "Team Beta here, let's go!", senderParticipantId: ID.PAR2, createdAt: new Date('2026-05-20T10:00:00.000Z'), serialNumber: 3 },
    { id: '86000004-0000-4000-8000-000000000004', roomId: ID.ROOM_HACKATHON, content: 'Submissions close at 5pm on the 22nd.', senderOrganizerId: org3.id, createdAt: new Date('2026-05-20T10:15:00.000Z'), serialNumber: 4 },

    // ── Sports Day (CONCLUDED, past 72h grace — room is read-only) ─────────────
    { id: '87000001-0000-4000-8000-000000000001', roomId: ID.ROOM_SPORTS, content: 'Good luck at Sports Day!', senderOrganizerId: org3.id, createdAt: new Date('2026-04-10T08:15:00.000Z'), serialNumber: 1 },
    { id: '87000002-0000-4000-8000-000000000002', roomId: ID.ROOM_SPORTS, content: 'Go team!', senderParticipantId: ID.PAR2, createdAt: new Date('2026-04-10T08:30:00.000Z'), serialNumber: 2 },

    // ── TEDx ─────────────────────────────────────────────────────────────────
    { id: '88000001-0000-4000-8000-000000000001', roomId: ID.ROOM_TEDX, content: 'Speaker lineup has been finalized — check the agenda!', isAnnouncement: true, senderOrganizerId: org1.id, createdAt: new Date('2026-09-08T12:00:00.000Z'), serialNumber: 1 },
    { id: '88000002-0000-4000-8000-000000000002', roomId: ID.ROOM_TEDX, content: 'Can’t wait to hear the AI talk!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-09-08T13:00:00.000Z'), serialNumber: 2 },
    { id: '88000003-0000-4000-8000-000000000003', roomId: ID.ROOM_TEDX, content: 'Is there a livestream for those who can’t attend?', senderParticipantId: ID.PAR2, createdAt: new Date('2026-09-08T14:00:00.000Z'), serialNumber: 3 },
    { id: '88000004-0000-4000-8000-000000000004', roomId: ID.ROOM_TEDX, content: 'Yes, we’ll share a livestream link closer to the date.', senderOrganizerId: org1.id, createdAt: new Date('2026-09-08T15:00:00.000Z'), serialNumber: 4 },

    // ── Job Fair ─────────────────────────────────────────────────────────────
    { id: '89000001-0000-4000-8000-000000000001', roomId: ID.ROOM_JOBFAIR, content: 'Bring printed copies of your resume — 40+ companies attending.', isAnnouncement: true, senderOrganizerId: org1.id, createdAt: new Date('2026-09-12T12:00:00.000Z'), serialNumber: 1 },
    { id: '89000002-0000-4000-8000-000000000002', roomId: ID.ROOM_JOBFAIR, content: 'Is there a dress code?', senderParticipantId: ID.PAR3, createdAt: new Date('2026-09-12T13:00:00.000Z'), serialNumber: 2 },
    { id: '89000003-0000-4000-8000-000000000003', roomId: ID.ROOM_JOBFAIR, content: 'Business casual is recommended.', senderOrganizerId: org1.id, createdAt: new Date('2026-09-12T14:00:00.000Z'), serialNumber: 3 },

    // ── Startup Pitch ────────────────────────────────────────────────────────
    { id: '8a000001-0000-4000-8000-000000000001', roomId: ID.ROOM_STARTUPPITCH, content: 'Pitch decks are due by Nov 1st, 11:59pm.', isAnnouncement: true, senderOrganizerId: org3.id, createdAt: new Date('2026-09-15T12:00:00.000Z'), serialNumber: 1 },
    { id: '8a000002-0000-4000-8000-000000000002', roomId: ID.ROOM_STARTUPPITCH, content: 'Team Nimbus is ready!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-09-15T13:00:00.000Z'), serialNumber: 2 },
    { id: '8a000003-0000-4000-8000-000000000003', roomId: ID.ROOM_STARTUPPITCH, content: 'Team GreenLoop here, excited to present.', senderParticipantId: ID.PAR3, createdAt: new Date('2026-09-15T14:00:00.000Z'), serialNumber: 3 },

    // ── Ping River Clean-Up (CONCLUDED, past 72h grace — room is read-only) ────
    { id: '8b000001-0000-4000-8000-000000000001', roomId: ID.ROOM_CLEANUP, content: 'Thanks everyone for a great turnout today!', senderOrganizerId: org1.id, createdAt: new Date('2026-08-15T11:30:00.000Z'), serialNumber: 1 },
    { id: '8b000002-0000-4000-8000-000000000002', roomId: ID.ROOM_CLEANUP, content: 'Glad to help, felt great giving back!', senderParticipantId: ID.PAR2, createdAt: new Date('2026-08-15T11:45:00.000Z'), serialNumber: 2 },

    // ── Data Science Bootcamp ────────────────────────────────────────────────
    { id: '8c000001-0000-4000-8000-000000000001', roomId: ID.ROOM_DATASCIENCE, content: 'Welcome to the cohort! Week 1 materials are up on the portal.', senderOrganizerId: org3.id, createdAt: new Date('2026-09-01T12:00:00.000Z'), serialNumber: 1 },
    { id: '8c000002-0000-4000-8000-000000000002', roomId: ID.ROOM_DATASCIENCE, content: 'Looking forward to it!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-09-01T13:00:00.000Z'), serialNumber: 2 },
    { id: '8c000003-0000-4000-8000-000000000003', roomId: ID.ROOM_DATASCIENCE, content: 'Same here, first time learning ML properly.', senderParticipantId: ID.PAR5, createdAt: new Date('2026-09-01T14:00:00.000Z'), serialNumber: 3 },

    // ── Freshmen Welcome Camp (CONCLUDED, past 72h grace — room is read-only) ──
    { id: '8d000001-0000-4000-8000-000000000001', roomId: ID.ROOM_FRESHMENCAMP, content: 'Welcome to CAMT! Check-in starts at 8am at the main lobby.', isAnnouncement: true, senderOrganizerId: org1.id, createdAt: new Date('2026-06-01T07:30:00.000Z'), serialNumber: 1 },
    { id: '8d000002-0000-4000-8000-000000000002', roomId: ID.ROOM_FRESHMENCAMP, content: 'So excited to meet everyone!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-06-01T07:45:00.000Z'), serialNumber: 2 },
    { id: '8d000003-0000-4000-8000-000000000003', roomId: ID.ROOM_FRESHMENCAMP, content: 'See you all there!', senderParticipantId: ID.PAR2, createdAt: new Date('2026-06-01T07:50:00.000Z'), serialNumber: 3 },
  ];

  for (const m of messageConfigs) {
    await prisma.message.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        roomId: m.roomId,
        content: m.content,
        isAnnouncement: m.isAnnouncement ?? false,
        senderParticipantId: m.senderParticipantId ?? null,
        senderOrganizerId: m.senderOrganizerId ?? null,
        createdAt: m.createdAt,
        serialNumber: m.serialNumber,
      },
    });
  }

  // sync each room's lastSerialNumber to the highest serialNumber seeded for it
  const maxSerialByRoom = messageConfigs.reduce<Record<string, number>>((acc, m) => {
    acc[m.roomId] = Math.max(acc[m.roomId] ?? 0, m.serialNumber);
    return acc;
  }, {});
  await Promise.all(
    Object.entries(maxSerialByRoom).map(([roomId, lastSerialNumber]) =>
      prisma.discussionRoom.update({ where: { id: roomId }, data: { lastSerialNumber } }),
    ),
  );
  console.log(`✓ Discussion messages (${messageConfigs.length} messages across 13 rooms)`);

  // ── Room Read Statuses ───────────────────────────────────────────────────────
  // Mix of fully-read, partially-read, and never-opened rooms per participant/organizer
  // — useful for testing unread counts and chat-list ordering.

  type ReadStatusConfig = {
    roomId: string;
    readerParticipantId?: string;
    readerOrganizerId?: string;
    lastReadMessageId: string;
    lastReadSerialNumber: number;
  };

  const readStatusConfigs: ReadStatusConfig[] = [
    // Halloween: par1 fully read, par2 read only the first message, par3 never opened
    { roomId: ID.ROOM_HALLOWEEN, readerParticipantId: ID.PAR1, lastReadMessageId: '81000005-0000-4000-8000-000000000005', lastReadSerialNumber: 5 },
    { roomId: ID.ROOM_HALLOWEEN, readerParticipantId: ID.PAR2, lastReadMessageId: '81000001-0000-4000-8000-000000000001', lastReadSerialNumber: 1 },

    // New Year: par1 fully read, par2 read only the announcement
    { roomId: ID.ROOM_NEW_YEAR, readerParticipantId: ID.PAR1, lastReadMessageId: '82000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_NEW_YEAR, readerParticipantId: ID.PAR2, lastReadMessageId: '82000001-0000-4000-8000-000000000001', lastReadSerialNumber: 1 },

    // Sukhothai: par1 fully read
    { roomId: ID.ROOM_SUKHOTHAI, readerParticipantId: ID.PAR1, lastReadMessageId: '83000002-0000-4000-8000-000000000002', lastReadSerialNumber: 2 },

    // Exchange: par1 fully read, par2 read up to message 3, par3 never opened
    { roomId: ID.ROOM_EXCHANGE, readerParticipantId: ID.PAR1, lastReadMessageId: '84000005-0000-4000-8000-000000000005', lastReadSerialNumber: 5 },
    { roomId: ID.ROOM_EXCHANGE, readerParticipantId: ID.PAR2, lastReadMessageId: '84000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },

    // Bootcamp: par1 fully read, par3 read only the first message
    { roomId: ID.ROOM_BOOTCAMP, readerParticipantId: ID.PAR1, lastReadMessageId: '85000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_BOOTCAMP, readerParticipantId: ID.PAR3, lastReadMessageId: '85000001-0000-4000-8000-000000000001', lastReadSerialNumber: 1 },

    // Hackathon (read-only): par1 fully read, par2 never opened
    { roomId: ID.ROOM_HACKATHON, readerParticipantId: ID.PAR1, lastReadMessageId: '86000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },

    // TEDx: par1 fully read, par2 read only the announcement
    { roomId: ID.ROOM_TEDX, readerParticipantId: ID.PAR1, lastReadMessageId: '88000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_TEDX, readerParticipantId: ID.PAR2, lastReadMessageId: '88000001-0000-4000-8000-000000000001', lastReadSerialNumber: 1 },

    // Job Fair: par3 fully read, par4 never opened
    { roomId: ID.ROOM_JOBFAIR, readerParticipantId: ID.PAR3, lastReadMessageId: '89000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },

    // Startup Pitch: par1 fully read, par3 never opened
    { roomId: ID.ROOM_STARTUPPITCH, readerParticipantId: ID.PAR1, lastReadMessageId: '8a000002-0000-4000-8000-000000000002', lastReadSerialNumber: 2 },

    // Ping River Clean-Up (read-only): par2 fully read, par4 never opened
    { roomId: ID.ROOM_CLEANUP, readerParticipantId: ID.PAR2, lastReadMessageId: '8b000002-0000-4000-8000-000000000002', lastReadSerialNumber: 2 },

    // Data Science Bootcamp: par1 fully read, par5 read only the first message
    { roomId: ID.ROOM_DATASCIENCE, readerParticipantId: ID.PAR1, lastReadMessageId: '8c000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
    { roomId: ID.ROOM_DATASCIENCE, readerParticipantId: ID.PAR5, lastReadMessageId: '8c000001-0000-4000-8000-000000000001', lastReadSerialNumber: 1 },

    // Freshmen Welcome Camp (read-only): par1 fully read, par2 read only the announcement, par3 never opened
    { roomId: ID.ROOM_FRESHMENCAMP, readerParticipantId: ID.PAR1, lastReadMessageId: '8d000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
    { roomId: ID.ROOM_FRESHMENCAMP, readerParticipantId: ID.PAR2, lastReadMessageId: '8d000001-0000-4000-8000-000000000001', lastReadSerialNumber: 1 },

    // Organizers: each has read their own event's latest message
    { roomId: ID.ROOM_HALLOWEEN, readerOrganizerId: org1.id, lastReadMessageId: '81000005-0000-4000-8000-000000000005', lastReadSerialNumber: 5 },
    { roomId: ID.ROOM_NEW_YEAR, readerOrganizerId: org1.id, lastReadMessageId: '82000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_EXCHANGE, readerOrganizerId: org2.id, lastReadMessageId: '84000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_BOOTCAMP, readerOrganizerId: org2.id, lastReadMessageId: '85000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
    { roomId: ID.ROOM_TEDX, readerOrganizerId: org1.id, lastReadMessageId: '88000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_JOBFAIR, readerOrganizerId: org1.id, lastReadMessageId: '89000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
    { roomId: ID.ROOM_STARTUPPITCH, readerOrganizerId: org3.id, lastReadMessageId: '8a000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
    { roomId: ID.ROOM_DATASCIENCE, readerOrganizerId: org3.id, lastReadMessageId: '8c000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
  ];

  for (const rs of readStatusConfigs) {
    const where = rs.readerOrganizerId
      ? { roomId_readerOrganizerId: { roomId: rs.roomId, readerOrganizerId: rs.readerOrganizerId } }
      : { roomId_readerParticipantId: { roomId: rs.roomId, readerParticipantId: rs.readerParticipantId! } };

    await prisma.roomReadStatus.upsert({
      where,
      update: { lastReadMessageId: rs.lastReadMessageId, lastReadSerialNumber: rs.lastReadSerialNumber },
      create: {
        roomId: rs.roomId,
        readerParticipantId: rs.readerParticipantId ?? null,
        readerOrganizerId: rs.readerOrganizerId ?? null,
        lastReadMessageId: rs.lastReadMessageId,
        lastReadSerialNumber: rs.lastReadSerialNumber,
      },
    });
  }
  console.log(`✓ Room read statuses (${readStatusConfigs.length})`);

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log('');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('  1  university  (CMU — cmu.ac.th)');
  console.log('  8  users       (password: 12345678 for all)');
  console.log('     organizer1@cmu.ac.th  (org1 — CAMT Student Affairs)');
  console.log('     organizer2@cmu.ac.th  (org2 — CMU Music and Arts Club)');
  console.log('     organizer3@cmu.ac.th  (org3 — SE Department Club)');
  console.log('     participant1@cmu.ac.th  (Su Su Myint)');
  console.log('     participant2@cmu.ac.th  (Chaiwat Srisuk)');
  console.log('     participant3@cmu.ac.th  (Min Thant Ko)');
  console.log('     participant4@cmu.ac.th  (Nattapon Wongkham)');
  console.log('     participant5@cmu.ac.th  (Pimchanok Rattana)');
  console.log('');
  console.log('  34 events:');
  console.log('     PUBLISHED:  Halloween, New Year FULL, Sukhothai, Concert, TEDx, Job Fair, Blood Donation,');
  console.log('                 Startup Pitch, Photo Exhibit, Mental Health Workshop, Chess Tournament,');
  console.log('                 Food Fest, Library Workshop, Pride Week');
  console.log('     ONGOING:    Exchange FULL, Bootcamp, AI Seminar (no form), Football, Data Science Bootcamp,');
  console.log('                 Grad Info Session');
  console.log('     CONCLUDED:  Hackathon, Sports Day, Orientation, Ping River Clean-Up, Robotics Showcase,');
  console.log('                 Freshmen Welcome Camp, Muay Thai Exhibition');
  console.log('     DRAFT:      SE Workshop, Music Concert, Cultural Festival, Freshy Night, Open House, Choir Concert');
  console.log('     PUBLISHED:  No Form Event (0/∞ — no form)');
  console.log('');
  console.log('  21 forms  (reg + feedback for various events)');
  console.log('');
  console.log('  Registration summary:');
  console.log('     Halloween:      par1✓ par2✓ par3✓         (3 CONFIRMED, tickets ACTIVE)');
  console.log('     New Year:       par1✓ par2✓ par3✓ par4✓ par5✓  (5 CONFIRMED, FULL, tickets ACTIVE)');
  console.log('     Sukhothai:      par1✓ par2✗               (1 CONFIRMED, 1 CANCELLED)');
  console.log('     Exchange:       par1✓ par2✓ par3✓         (3 CONFIRMED, FULL, tickets ACTIVE)');
  console.log('     Bootcamp:       par1✓ par3✓               (2 CONFIRMED, tickets ACTIVE)');
  console.log('     Hackathon:      par1✓ par2✓               (2 CONFIRMED, tickets EXPIRED)');
  console.log('     Sports:         par2✓ par4✓               (2 CONFIRMED, tickets EXPIRED, unlimited)');
  console.log('     TEDx:           par1✓ par2✓               (2 CONFIRMED, tickets ACTIVE)');
  console.log('     Job Fair:       par3✓ par4✓               (2 CONFIRMED, tickets ACTIVE)');
  console.log('     Startup Pitch:  par1✓ par3✓               (2 CONFIRMED, tickets ACTIVE)');
  console.log('     Clean-Up Day:   par2✓ par4✓               (2 CONFIRMED, tickets EXPIRED)');
  console.log('     Data Science:   par1✓ par5✓               (2 CONFIRMED, tickets ACTIVE)');
  console.log('     Freshmen Camp:  par1✓ par2✓ par3✓         (3 CONFIRMED, tickets EXPIRED)');
  console.log('');
  console.log('  Feedback responses: 3');
  console.log('     Hackathon: par1(5★), par2(4★)');
  console.log('     New Year:  par1(5★) only — par2-5 not submitted yet');
  console.log('');
  console.log('  34 discussion rooms (one per event)');
  console.log('     With messages: Halloween, New Year, Sukhothai, Exchange, Bootcamp, Hackathon*, Sports*,');
  console.log('                    TEDx, Job Fair, Startup Pitch, Clean-Up Day*, Data Science, Freshmen Camp*');
  console.log('     (* rooms are read-only — event concluded past the 72h grace period)');
  console.log('     Empty (no messages): Orientation, AI Seminar, No Form, Drafts x6, Concert, Blood Donation,');
  console.log('                          Football, Photo Exhibit, Mental Health, Chess, Food Fest, Robotics,');
  console.log('                          Library, Pride Week, Muay Thai, Grad Info');
  console.log('');
  console.log('  Useful test scenarios:');
  console.log('     EventFullException:     try registering any participant for New Year or Exchange');
  console.log('     AlreadyRegistered:      try registering par1 for Halloween again');
  console.log('     FormNotFoundException:  try registering for AI Seminar or No Form Event');
  console.log('     CancelledTicket:        par2 Sukhothai ticket');
  console.log('     ExpiredTickets:         Hackathon, Sports Day, Clean-Up Day, Freshmen Camp tickets');
  console.log('     FeedbackAlreadyExists:  par1 submitting New Year feedback again');
  console.log('     NotRegistered(feedback):par4 trying to submit Hackathon feedback');
  console.log('     ReadOnlyRoom:           Hackathon, Sports Day, Clean-Up Day, or Freshmen Camp room');
  console.log('─────────────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });