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
        imageUrl: null,
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
        imageUrl: null,
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
        imageUrl: null,
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
          imageUrl: null,
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
      description: { en: 'Join us for a spooky Halloween night!', th: 'มาร่วมสนุกกับคืนฮาโลวีนสุดหลอน!' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Halloween+Night',
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
      description: { en: 'Ring in the New Year with us!', th: 'ฉลองปีใหม่ไปด้วยกัน!' },
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
      bannerUrl: 'https://placehold.co/600x400?text=New+Year+2027',
      publishedAt: new Date('2026-10-01T00:00:00.000Z'),
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
      description: { en: 'Two-day trip to Sukhothai Historical Park.', th: 'ทริป 2 วัน 1 คืนที่อุทยานประวัติศาสตร์สุโขทัย' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Sukhothai+Trip',
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
      description: { en: 'Exchange program with partner universities.', th: 'โครงการแลกเปลี่ยนกับมหาวิทยาลัยพันธมิตร' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Exchange+Program',
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
      description: { en: 'Intensive coding bootcamp covering web development.', th: 'Coding Bootcamp เข้มข้นครอบคลุมการพัฒนาเว็บ' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Coding+Bootcamp',
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
      description: { en: '48-hour hackathon for SE students.', th: 'แข่งขัน Hackathon 48 ชั่วโมงสำหรับนักศึกษา SE' },
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
      bannerUrl: 'https://placehold.co/600x400?text=SE+Hackathon',
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
      description: { en: 'Annual sports day with various competitions.', th: 'งานกีฬาสีประจำปี' },
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
      bannerUrl: 'https://placehold.co/600x400?text=CMU+Sports+Day',
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
      description: { en: 'Welcome week for new students.', th: 'สัปดาห์ต้อนรับนักศึกษาใหม่' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Orientation+Week',
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
      description: { en: 'Ongoing seminar series on AI research.', th: 'ชุดสัมมนาต่อเนื่องด้าน AI' },
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
      bannerUrl: 'https://placehold.co/600x400?text=AI+Research+Seminar',
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
      description: { en: 'Published event with no registration form for testing.', th: 'กิจกรรมที่เผยแพร่โดยไม่มีฟอร์ม' },
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
      bannerUrl: 'https://placehold.co/600x400?text=No+Form+Event',
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
      description: { en: 'Draft workshop for SE students.', th: 'เวิร์กชอปฉบับร่าง' },
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
      bannerUrl: 'https://placehold.co/600x400?text=SE+Workshop+Draft',
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
      description: { en: 'Draft for annual music concert.', th: 'ฉบับร่างคอนเสิร์ตประจำปี' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Music+Concert+Draft',
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
      description: { en: 'Draft for upcoming cultural festival.', th: 'ฉบับร่างเทศกาลวัฒนธรรม' },
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
      bannerUrl: 'https://placehold.co/600x400?text=Cultural+Festival+Draft',
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
      description: { en: 'Annual concert featuring student performances.', th: 'คอนเสิร์ตประจำปีที่มีการแสดงของนักศึกษา' },
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
      bannerUrl: 'https://placehold.co/600x400?text=CMU+Annual+Concert',
      publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  });

  console.log('✓ Events (14 total — various statuses and seat limits)');

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
      createdAt: new Date('2026-10-05T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000002-0000-4000-8000-000000000002',
      ticketId:       'b2000002-0000-4000-8000-000000000002',
      formResponseId: 'c2000002-0000-4000-8000-000000000002',
      participantKey: 'PAR2', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['L'] },
      createdAt: new Date('2026-10-06T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000003-0000-4000-8000-000000000003',
      ticketId:       'b2000003-0000-4000-8000-000000000003',
      formResponseId: 'c2000003-0000-4000-8000-000000000003',
      participantKey: 'PAR3', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['S'] },
      createdAt: new Date('2026-10-07T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000004-0000-4000-8000-000000000004',
      ticketId:       'b2000004-0000-4000-8000-000000000004',
      formResponseId: 'c2000004-0000-4000-8000-000000000004',
      participantKey: 'PAR4', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['XL'] },
      createdAt: new Date('2026-10-08T10:00:00.000Z'),
    },
    {
      registrationId: 'a2000005-0000-4000-8000-000000000005',
      ticketId:       'b2000005-0000-4000-8000-000000000005',
      formResponseId: 'c2000005-0000-4000-8000-000000000005',
      participantKey: 'PAR5', eventId: ID.EVT_NEW_YEAR, formId: ID.FORM_NEW_YEAR_REG,
      formFields: newYearRegFields,
      registrationStatus: RegistrationStatus.CONFIRMED, ticketStatus: TicketStatus.ACTIVE,
      extraAnswers: { [ID.FLD_NY_TSHIRT]: ['XXL'] },
      createdAt: new Date('2026-10-09T10:00:00.000Z'),
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
    { id: '82000001-0000-4000-8000-000000000001', roomId: ID.ROOM_NEW_YEAR, content: 'Countdown party details have been posted — check the agenda!', isAnnouncement: true, senderOrganizerId: org1.id, createdAt: new Date('2026-10-05T12:00:00.000Z'), serialNumber: 1 },
    { id: '82000002-0000-4000-8000-000000000002', roomId: ID.ROOM_NEW_YEAR, content: 'So hyped!', senderParticipantId: ID.PAR1, createdAt: new Date('2026-10-05T13:00:00.000Z'), serialNumber: 2 },
    { id: '82000003-0000-4000-8000-000000000003', roomId: ID.ROOM_NEW_YEAR, content: 'Where do we park?', senderParticipantId: ID.PAR4, createdAt: new Date('2026-10-05T14:00:00.000Z'), serialNumber: 3 },
    { id: '82000004-0000-4000-8000-000000000004', roomId: ID.ROOM_NEW_YEAR, content: 'Parking is available at the CAMT lot.', senderOrganizerId: org1.id, createdAt: new Date('2026-10-05T15:00:00.000Z'), serialNumber: 4 },

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
  console.log(`✓ Discussion messages (${messageConfigs.length} messages across 7 rooms)`);

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

    // Organizers: each has read their own event's latest message
    { roomId: ID.ROOM_HALLOWEEN, readerOrganizerId: org1.id, lastReadMessageId: '81000005-0000-4000-8000-000000000005', lastReadSerialNumber: 5 },
    { roomId: ID.ROOM_NEW_YEAR, readerOrganizerId: org1.id, lastReadMessageId: '82000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_EXCHANGE, readerOrganizerId: org2.id, lastReadMessageId: '84000004-0000-4000-8000-000000000004', lastReadSerialNumber: 4 },
    { roomId: ID.ROOM_BOOTCAMP, readerOrganizerId: org2.id, lastReadMessageId: '85000003-0000-4000-8000-000000000003', lastReadSerialNumber: 3 },
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
  console.log('  14 events:');
  console.log('     PUBLISHED:  Halloween (3/100 seats), New Year FULL (5/5), Sukhothai (1/10), Concert (0/300)');
  console.log('     ONGOING:    Exchange FULL (3/3), Bootcamp (2/25), AI Seminar (0/50 — no form)');
  console.log('     CONCLUDED:  Hackathon (2/60), Sports Day (2/∞), Orientation (0/200)');
  console.log('     DRAFT:      SE Workshop, Music Concert, Cultural Festival');
  console.log('     PUBLISHED:  No Form Event (0/∞ — no form)');
  console.log('');
  console.log('  10 forms  (reg + feedback for various events)');
  console.log('');
  console.log('  Registration summary:');
  console.log('     Halloween:  par1✓ par2✓ par3✓         (3 CONFIRMED, tickets ACTIVE)');
  console.log('     New Year:   par1✓ par2✓ par3✓ par4✓ par5✓  (5 CONFIRMED, FULL, tickets ACTIVE)');
  console.log('     Sukhothai:  par1✓ par2✗               (1 CONFIRMED, 1 CANCELLED)');
  console.log('     Exchange:   par1✓ par2✓ par3✓         (3 CONFIRMED, FULL, tickets ACTIVE)');
  console.log('     Bootcamp:   par1✓ par3✓               (2 CONFIRMED, tickets ACTIVE)');
  console.log('     Hackathon:  par1✓ par2✓               (2 CONFIRMED, tickets EXPIRED)');
  console.log('     Sports:     par2✓ par4✓               (2 CONFIRMED, tickets EXPIRED, unlimited)');
  console.log('');
  console.log('  Feedback responses: 3');
  console.log('     Hackathon: par1(5★), par2(4★)');
  console.log('     New Year:  par1(5★) only — par2-5 not submitted yet');
  console.log('');
  console.log('  14 discussion rooms (one per event)');
  console.log('     With messages: Halloween, New Year, Sukhothai, Exchange, Bootcamp, Hackathon*, Sports*');
  console.log('     (* Hackathon and Sports Day rooms are read-only — past the 72h grace period)');
  console.log('     Empty (no messages): Orientation, AI Seminar, No Form, Drafts x3, Concert');
  console.log('');
  console.log('  Useful test scenarios:');
  console.log('     EventFullException:     try registering any participant for New Year or Exchange');
  console.log('     AlreadyRegistered:      try registering par1 for Halloween again');
  console.log('     FormNotFoundException:  try registering for AI Seminar or No Form Event');
  console.log('     CancelledTicket:        par2 Sukhothai ticket');
  console.log('     ExpiredTickets:         Hackathon and Sports Day tickets');
  console.log('     FeedbackAlreadyExists:  par1 submitting New Year feedback again');
  console.log('     NotRegistered(feedback):par4 trying to submit Hackathon feedback');
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