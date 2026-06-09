import {
  PrismaClient,
  EventStatus,
  FormType,
  FieldType,
  Role,
  RegistrationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── FIXED IDs ───────────────────────────────────────────────────────────────
const ID = {
  // University
  CMU: 'a0000001-0000-4000-8000-000000000001',

  // Users
  USER_NO_PROFILE: 'b0000001-0000-4000-8000-000000000001',
  USER_ONLY_ORG1:  'b0000002-0000-4000-8000-000000000002',
  USER_ONLY_ORG2:  'b0000003-0000-4000-8000-000000000003',
  USER_ONLY_PAR1:  'b0000004-0000-4000-8000-000000000004',
  USER_ONLY_PAR2:  'b0000005-0000-4000-8000-000000000005',
  USER_BOTH:       'b0000006-0000-4000-8000-000000000006',

  // Organizer Profiles
  ORG1: 'c0000001-0000-4000-8000-000000000001',
  ORG2: 'c0000002-0000-4000-8000-000000000002',
  ORG3: 'c0000003-0000-4000-8000-000000000003',

  // Participant Profiles
  PAR1: 'd0000001-0000-4000-8000-000000000001',
  PAR2: 'd0000002-0000-4000-8000-000000000002',
  PAR3: 'd0000003-0000-4000-8000-000000000003',

  // Events - org1
  EVT_DRAFT1:      'e0000001-0000-4000-8000-000000000001',
  EVT_HALLOWEEN:   'e0000002-0000-4000-8000-000000000002',
  EVT_AI_RESEARCH: 'e0000003-0000-4000-8000-000000000003',
  EVT_ORIENTATION: 'e0000004-0000-4000-8000-000000000004',
  // Events - org2
  EVT_DRAFT2:      'e0000005-0000-4000-8000-000000000005',
  EVT_SUKHOTHAI:   'e0000006-0000-4000-8000-000000000006',
  EVT_BOOTCAMP:    'e0000007-0000-4000-8000-000000000007',
  EVT_SPORTS:      'e0000008-0000-4000-8000-000000000008',
  // Events - org3
  EVT_DRAFT3:      'e0000009-0000-4000-8000-000000000009',
  EVT_DRAFT_TEST:  'e0000010-0000-4000-8000-000000000010',
  EVT_NEW_YEAR:    'e0000011-0000-4000-8000-000000000011',
  EVT_NO_FORM:     'e0000012-0000-4000-8000-000000000012',
  EVT_EXCHANGE:    'e0000013-0000-4000-8000-000000000013',
  EVT_HACKATHON:   'e0000014-0000-4000-8000-000000000014',

  // Forms
  FORM_HALLOWEEN_REG: 'f0000001-0000-4000-8000-000000000001',
  FORM_NEW_YEAR_REG:  'f0000002-0000-4000-8000-000000000002',
  FORM_NEW_YEAR_FB:   'f0000003-0000-4000-8000-000000000003',

  // Form Fields - Halloween Reg
  FLD_H_NAME:  'f1000001-0000-4000-8000-000000000001',
  FLD_H_STUID: 'f1000002-0000-4000-8000-000000000002',
  FLD_H_YEAR:  'f1000003-0000-4000-8000-000000000003',
  FLD_H_DIET:  'f1000004-0000-4000-8000-000000000004',
  // Form Fields - New Year Reg
  FLD_NY_NAME:   'f2000001-0000-4000-8000-000000000001',
  FLD_NY_NICK:   'f2000002-0000-4000-8000-000000000002',
  FLD_NY_TSHIRT: 'f2000003-0000-4000-8000-000000000003',
  FLD_NY_HEAR:   'f2000004-0000-4000-8000-000000000004',
  // Form Fields - New Year Feedback
  FLD_FB_OVERALL: 'f3000001-0000-4000-8000-000000000001',
  FLD_FB_ORG:     'f3000002-0000-4000-8000-000000000002',
  FLD_FB_COMMENT: 'f3000003-0000-4000-8000-000000000003',

  // Event Registrations
  REG_HALLOWEEN_PAR1: 'a1000001-0000-4000-8000-000000000001',
  REG_HALLOWEEN_PAR2: 'a1000002-0000-4000-8000-000000000002',
  REG_HALLOWEEN_PAR3: 'a1000003-0000-4000-8000-000000000003',
  REG_AI_PAR1:        'a1000004-0000-4000-8000-000000000004',
  REG_AI_PAR3:        'a1000005-0000-4000-8000-000000000005',
  REG_ORIENT_PAR2:    'a1000006-0000-4000-8000-000000000006',
  REG_ORIENT_PAR3:    'a1000007-0000-4000-8000-000000000007',
  REG_BOOT_PAR1:      'a1000008-0000-4000-8000-000000000008',
  REG_BOOT_PAR2:      'a1000009-0000-4000-8000-000000000009',
  REG_SPORTS_PAR1:    'a2000001-0000-4000-8000-000000000001',
  REG_SPORTS_PAR3:    'a2000002-0000-4000-8000-000000000002',
  REG_NY_PAR1:        'a2000003-0000-4000-8000-000000000003',
  REG_NY_PAR2:        'a2000004-0000-4000-8000-000000000004',
  REG_EXCHANGE_PAR2:  'a2000005-0000-4000-8000-000000000005',
  REG_EXCHANGE_PAR3:  'a2000006-0000-4000-8000-000000000006',
  REG_HACK_PAR1:      'a2000007-0000-4000-8000-000000000007',
  REG_HACK_PAR2:      'a2000008-0000-4000-8000-000000000008',

  // Form Responses
  FRS_HALLOWEEN_PAR1: 'a3000001-0000-4000-8000-000000000001',
  FRS_HALLOWEEN_PAR2: 'a3000002-0000-4000-8000-000000000002',
  FRS_HALLOWEEN_PAR3: 'a3000003-0000-4000-8000-000000000003',
  FRS_NY_PAR1:        'a3000004-0000-4000-8000-000000000004',
  FRS_NY_PAR2:        'a3000005-0000-4000-8000-000000000005',
};

async function main() {
  const passwordHash = await bcrypt.hash('12345678', 10);

  // ─── UNIVERSITY ──────────────────────────────────────────────────────────────
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
  console.log('✓ University seeded');

  // ─── USERS ───────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'noprofile1@cmu.ac.th' },
    update: {},
    create: {
      id: ID.USER_NO_PROFILE,
      universityId: cmu.id,
      email: 'noprofile1@cmu.ac.th',
      passwordHash,
      currentRole: null,
      isVerified: true,
    },
  });

  const userOnlyOrg1 = await prisma.user.upsert({
    where: { email: 'onlyorganizer1@cmu.ac.th' },
    update: {},
    create: {
      id: ID.USER_ONLY_ORG1,
      universityId: cmu.id,
      email: 'onlyorganizer1@cmu.ac.th',
      passwordHash,
      currentRole: Role.ORGANIZER,
      isVerified: true,
    },
  });

  const userOnlyOrg2 = await prisma.user.upsert({
    where: { email: 'onlyorganizer2@cmu.ac.th' },
    update: {},
    create: {
      id: ID.USER_ONLY_ORG2,
      universityId: cmu.id,
      email: 'onlyorganizer2@cmu.ac.th',
      passwordHash,
      currentRole: Role.ORGANIZER,
      isVerified: true,
    },
  });

  const userOnlyPar1 = await prisma.user.upsert({
    where: { email: 'onlyparticipant1@cmu.ac.th' },
    update: {},
    create: {
      id: ID.USER_ONLY_PAR1,
      universityId: cmu.id,
      email: 'onlyparticipant1@cmu.ac.th',
      passwordHash,
      currentRole: Role.PARTICIPANT,
      isVerified: true,
    },
  });

  const userOnlyPar2 = await prisma.user.upsert({
    where: { email: 'onlyparticipant2@cmu.ac.th' },
    update: {},
    create: {
      id: ID.USER_ONLY_PAR2,
      universityId: cmu.id,
      email: 'onlyparticipant2@cmu.ac.th',
      passwordHash,
      currentRole: Role.PARTICIPANT,
      isVerified: true,
    },
  });

  const userBoth = await prisma.user.upsert({
    where: { email: 'bothprofile1@cmu.ac.th' },
    update: {},
    create: {
      id: ID.USER_BOTH,
      universityId: cmu.id,
      email: 'bothprofile1@cmu.ac.th',
      passwordHash,
      currentRole: Role.ORGANIZER,
      isVerified: true,
    },
  });
  console.log('✓ Users seeded');

  // ─── ORGANIZER PROFILES ──────────────────────────────────────────────────────
  const org1 = await prisma.organizerProfile.upsert({
    where: { userId: userOnlyOrg1.id },
    update: {},
    create: {
      id: ID.ORG1,
      userId: userOnlyOrg1.id,
      name: 'CAMT Student Affairs',
      bio: 'Organizing academic and social events for CAMT students.',
      contactEmail: 'onlyorganizer1@cmu.ac.th',
      contactPhone: '0812345671',
      contactLineId: 'camt_affairs',
      imageUrl: null,
      externalUrl: 'https://camt.cmu.ac.th',
    },
  });

  const org2 = await prisma.organizerProfile.upsert({
    where: { userId: userOnlyOrg2.id },
    update: {},
    create: {
      id: ID.ORG2,
      userId: userOnlyOrg2.id,
      name: 'CMU Music and Arts Club',
      bio: 'Bringing music and arts to the CMU community.',
      contactEmail: 'onlyorganizer2@cmu.ac.th',
      contactPhone: '0812345672',
      contactLineId: 'cmu_music',
      imageUrl: null,
      externalUrl: '',
    },
  });

  const org3 = await prisma.organizerProfile.upsert({
    where: { userId: userBoth.id },
    update: {},
    create: {
      id: ID.ORG3,
      userId: userBoth.id,
      name: 'SE Department Club',
      bio: 'Software Engineering department club organizing tech and social events.',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0812345676',
      contactLineId: 'se_club',
      imageUrl: null,
      externalUrl: 'https://se.camt.cmu.ac.th',
    },
  });
  console.log('✓ Organizer profiles seeded');

  // ─── PARTICIPANT PROFILES ────────────────────────────────────────────────────
  const par1 = await prisma.participantProfile.upsert({
    where: { userId: userOnlyPar1.id },
    update: {},
    create: {
      id: ID.PAR1,
      userId: userOnlyPar1.id,
      firstName: 'Su Su',
      lastName: 'Myint',
      nickname: 'Su',
      studentId: '662115522',
      major: 'Software Engineering',
      contactEmail: 'onlyparticipant1@cmu.ac.th',
      contactPhone: '0823456781',
      contactLineId: 'susu_line',
      imageUrl: null,
      preferences: {
        personal: ['MUSIC', 'TECHNOLOGY'],
        event: ['SEMINAR', 'WORKSHOP', 'CULTURAL'],
        language: ['en', 'th'],
      },
    },
  });

  const par2 = await prisma.participantProfile.upsert({
    where: { userId: userOnlyPar2.id },
    update: {},
    create: {
      id: ID.PAR2,
      userId: userOnlyPar2.id,
      firstName: 'Chaiwat',
      lastName: 'Srisuk',
      nickname: 'Chai',
      studentId: '662115533',
      major: 'Computer Engineering',
      contactEmail: 'onlyparticipant2@cmu.ac.th',
      contactPhone: '0823456782',
      contactLineId: 'chai_line',
      imageUrl: null,
      preferences: {
        personal: ['SPORTS', 'GAMING'],
        event: ['HACKATHON', 'COMPETITION', 'WORKSHOP'],
        language: ['en', 'th'],
      },
    },
  });

  const par3 = await prisma.participantProfile.upsert({
    where: { userId: userBoth.id },
    update: {},
    create: {
      id: ID.PAR3,
      userId: userBoth.id,
      firstName: 'Min Thant',
      lastName: 'Ko',
      nickname: 'Min',
      studentId: '662115510',
      major: 'Software Engineering',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0823456783',
      contactLineId: 'min_line',
      imageUrl: null,
      preferences: {
        personal: ['TECHNOLOGY', 'MUSIC'],
        event: ['SEMINAR', 'HACKATHON', 'NETWORKING'],
        language: ['en'],
      },
    },
  });
  console.log('✓ Participant profiles seeded');

  // ─── EVENTS ──────────────────────────────────────────────────────────────────

  // --- org1 events ---
  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT1 },
    update: {},
    create: {
      id: ID.EVT_DRAFT1,
      organizerId: org1.id,
      universityId: cmu.id,
      title: { en: 'SE Workshop Draft', th: 'เวิร์กชอป SE ฉบับร่าง' },
      description: {
        en: 'Draft workshop for SE students.',
        th: 'เวิร์กชอปฉบับร่างสำหรับนักศึกษา SE',
      },
      category: ['WORKSHOP'],
      location: { en: 'CAMT Building Room 101', th: 'ห้อง 101 อาคาร CAMT' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-11-15T09:00:00.000Z'),
      endAt: new Date('2026-11-15T12:00:00.000Z'),
      seatLimit: 30,
      status: EventStatus.DRAFT,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'CAMT Student Affairs',
      contactEmail: 'onlyorganizer1@cmu.ac.th',
      contactPhone: '0812345671',
      contactLineId: 'camt_affairs',
      externalUrl: '',
      remarks: { en: '', th: '' },
      bannerUrl: 'https://placehold.co/600x400?text=SE+Workshop+Draft',
    },
  });

  const evtHalloween = await prisma.event.upsert({
    where: { id: ID.EVT_HALLOWEEN },
    update: {},
    create: {
      id: ID.EVT_HALLOWEEN,
      organizerId: org1.id,
      universityId: cmu.id,
      title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
      description: {
        en: 'Join us for a spooky Halloween night filled with costume contests, games, and surprises at CAMT!',
        th: 'มาร่วมสนุกกับคืนฮาโลวีนสุดหลอนพร้อมประกวดชุดแฟนซี เกม และเซอร์ไพรส์มากมายที่ CAMT!',
      },
      category: ['PARTY', 'CULTURAL'],
      location: { en: 'CAMT Auditorium', th: 'ห้องประชุมใหญ่ CAMT' },
      mapLink: 'https://maps.google.com/?q=CAMT+CMU',
      isOnline: false,
      startAt: new Date('2026-10-31T10:00:00.000Z'),
      endAt: new Date('2026-10-31T14:00:00.000Z'),
      seatLimit: 100,
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: {
        en: 'Light snacks and drinks will be provided.',
        th: 'มีของว่างและเครื่องดื่มให้บริการ',
      },
      agenda: [
        {
          time: '17:00',
          activity: {
            en: 'Registration and Welcome',
            th: 'ลงทะเบียนและต้อนรับ',
          },
        },
        {
          time: '18:00',
          activity: { en: 'Costume Contest', th: 'ประกวดชุดแฟนซี' },
        },
        {
          time: '19:30',
          activity: { en: 'Games and Activities', th: 'เกมและกิจกรรม' },
        },
        {
          time: '20:30',
          activity: { en: 'Lucky Draw and Closing', th: 'จับรางวัลและปิดงาน' },
        },
      ],
      contactName: 'CAMT Student Affairs',
      contactEmail: 'onlyorganizer1@cmu.ac.th',
      contactPhone: '0812345671',
      contactLineId: 'camt_affairs',
      externalUrl: '',
      remarks: {
        en: 'Please wear a costume for the contest!',
        th: 'กรุณาแต่งกายแฟนซีเพื่อร่วมประกวด!',
      },
      bannerUrl: 'https://placehold.co/600x400?text=CAMT+Halloween+2026',
      publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_AI_RESEARCH },
    update: {},
    create: {
      id: ID.EVT_AI_RESEARCH,
      organizerId: org1.id,
      universityId: cmu.id,
      title: { en: 'AI Research Seminar Series', th: 'ชุดสัมมนาการวิจัย AI' },
      description: {
        en: 'An ongoing seminar series covering the latest trends and research in artificial intelligence.',
        th: 'ชุดสัมมนาต่อเนื่องที่ครอบคลุมแนวโน้มล่าสุดและการวิจัยด้านปัญญาประดิษฐ์',
      },
      category: ['SEMINAR', 'LECTURE'],
      location: { en: 'CAMT Building Room 202', th: 'ห้อง 202 อาคาร CAMT' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-06-01T02:00:00.000Z'),
      endAt: new Date('2026-11-30T08:00:00.000Z'),
      seatLimit: 50,
      status: EventStatus.ONGOING,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'CAMT Student Affairs',
      contactEmail: 'onlyorganizer1@cmu.ac.th',
      contactPhone: '0812345671',
      contactLineId: 'camt_affairs',
      externalUrl: '',
      remarks: { en: 'Sessions held every two weeks.', th: 'จัดทุกสองสัปดาห์' },
      bannerUrl: 'https://placehold.co/600x400?text=AI+Research+Seminar',
      publishedAt: new Date('2026-05-15T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_ORIENTATION },
    update: {},
    create: {
      id: ID.EVT_ORIENTATION,
      organizerId: org1.id,
      universityId: cmu.id,
      title: { en: 'Orientation Week 2026', th: 'สัปดาห์ปฐมนิเทศ 2026' },
      description: {
        en: 'Welcome week for new students to get acquainted with campus life and facilities.',
        th: 'สัปดาห์ต้อนรับนักศึกษาใหม่เพื่อทำความรู้จักกับชีวิตในมหาวิทยาลัย',
      },
      category: ['ORIENTATION'],
      location: { en: 'CAMT Main Hall', th: 'ห้องโถงหลัก CAMT' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-05-01T02:00:00.000Z'),
      endAt: new Date('2026-06-07T10:00:00.000Z'),
      seatLimit: 200,
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: {
        en: 'Lunch provided on all days.',
        th: 'มีอาหารกลางวันให้ทุกวัน',
      },
      agenda: [],
      contactName: 'CAMT Student Affairs',
      contactEmail: 'onlyorganizer1@cmu.ac.th',
      contactPhone: '0812345671',
      contactLineId: 'camt_affairs',
      externalUrl: '',
      remarks: { en: '', th: '' },
      bannerUrl: 'https://placehold.co/600x400?text=Orientation+Week+2026',
      publishedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
  });

  // --- org2 events ---
  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT2 },
    update: {},
    create: {
      id: ID.EVT_DRAFT2,
      organizerId: org2.id,
      universityId: cmu.id,
      title: {
        en: 'Music Club Annual Concert Draft',
        th: 'ฉบับร่างคอนเสิร์ตประจำปีชมรมดนตรี',
      },
      description: {
        en: 'Draft for the annual music club concert.',
        th: 'ฉบับร่างสำหรับคอนเสิร์ตประจำปีชมรมดนตรี',
      },
      category: ['CULTURAL', 'FESTIVAL'],
      location: { en: 'CMU Auditorium', th: 'หอประชุม มช.' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-12-15T11:00:00.000Z'),
      endAt: new Date('2026-12-15T15:00:00.000Z'),
      seatLimit: 300,
      status: EventStatus.DRAFT,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'onlyorganizer2@cmu.ac.th',
      contactPhone: '0812345672',
      contactLineId: 'cmu_music',
      externalUrl: '',
      remarks: { en: '', th: '' },
      bannerUrl: 'https://placehold.co/600x400?text=Music+Concert+Draft',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_SUKHOTHAI },
    update: {},
    create: {
      id: ID.EVT_SUKHOTHAI,
      organizerId: org2.id,
      universityId: cmu.id,
      title: {
        en: 'Sukhothai Excursion Trip',
        th: 'ทริปทัศนศึกษาจังหวัดสุโขทัย',
      },
      description: {
        en: 'A two-day excursion to Sukhothai to explore UNESCO World Heritage sites and enjoy the Loi Krathong festival.',
        th: 'ทริป 2 วัน 1 คืนที่สุโขทัย สำรวจโบราณสถาน UNESCO และเพลิดเพลินกับเทศกาลลอยกระทง',
      },
      category: ['TRIP', 'CULTURAL'],
      location: {
        en: 'Sukhothai Historical Park',
        th: 'อุทยานประวัติศาสตร์สุโขทัย',
      },
      mapLink: 'https://maps.google.com/?q=Sukhothai+Historical+Park',
      isOnline: false,
      startAt: new Date('2026-10-25T01:00:00.000Z'),
      endAt: new Date('2026-10-26T10:00:00.000Z'),
      seatLimit: 40,
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: false,
      cateringDescription: {
        en: 'Meals included in the trip package.',
        th: 'รวมอาหารในแพ็กเกจทริป',
      },
      agenda: [
        {
          time: '06:00',
          activity: { en: 'Departure from CMU', th: 'ออกเดินทางจาก มช.' },
        },
        {
          time: '12:00',
          activity: {
            en: 'Lunch at Sukhothai',
            th: 'รับประทานอาหารกลางวันที่สุโขทัย',
          },
        },
        {
          time: '14:00',
          activity: {
            en: 'Visit Historical Park',
            th: 'เยี่ยมชมอุทยานประวัติศาสตร์',
          },
        },
        {
          time: '19:00',
          activity: { en: 'Loi Krathong Festival', th: 'เทศกาลลอยกระทง' },
        },
      ],
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'onlyorganizer2@cmu.ac.th',
      contactPhone: '0812345672',
      contactLineId: 'cmu_music',
      externalUrl: '',
      remarks: {
        en: 'Registration closes October 15th. Payment required upon registration.',
        th: 'ปิดรับสมัครวันที่ 15 ตุลาคม ชำระเงินเมื่อลงทะเบียน',
      },
      bannerUrl: 'https://placehold.co/600x400?text=Sukhothai+Trip',
      publishedAt: new Date('2026-09-10T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_BOOTCAMP },
    update: {},
    create: {
      id: ID.EVT_BOOTCAMP,
      organizerId: org2.id,
      universityId: cmu.id,
      title: {
        en: 'Coding Bootcamp Summer 2026',
        th: 'Coding Bootcamp ซัมเมอร์ 2026',
      },
      description: {
        en: 'An intensive coding bootcamp covering web development fundamentals throughout summer.',
        th: 'Coding Bootcamp เข้มข้นครอบคลุมพื้นฐานการพัฒนาเว็บตลอดช่วงซัมเมอร์',
      },
      category: ['WORKSHOP', 'SEMINAR'],
      location: { en: 'CAMT Computer Lab 1', th: 'ห้องแล็บคอมพิวเตอร์ 1 CAMT' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-06-02T02:00:00.000Z'),
      endAt: new Date('2026-11-15T08:00:00.000Z'),
      seatLimit: 25,
      status: EventStatus.ONGOING,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'onlyorganizer2@cmu.ac.th',
      contactPhone: '0812345672',
      contactLineId: 'cmu_music',
      externalUrl: '',
      remarks: { en: 'Sessions held every Saturday.', th: 'จัดทุกวันเสาร์' },
      bannerUrl: 'https://placehold.co/600x400?text=Coding+Bootcamp',
      publishedAt: new Date('2026-05-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_SPORTS },
    update: {},
    create: {
      id: ID.EVT_SPORTS,
      organizerId: org2.id,
      universityId: cmu.id,
      title: { en: 'CMU Sports Day 2026', th: 'กีฬาสี CMU 2026' },
      description: {
        en: 'Annual sports day event featuring various competitions and team activities.',
        th: 'งานกีฬาสีประจำปีที่มีการแข่งขันหลากหลายและกิจกรรมทีม',
      },
      category: ['SPORT'],
      location: { en: 'CMU Sports Complex', th: 'ศูนย์กีฬา มช.' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-05-15T01:00:00.000Z'),
      endAt: new Date('2026-06-05T10:00:00.000Z'),
      seatLimit: 500,
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: {
        en: 'Food stalls available throughout the day.',
        th: 'มีร้านอาหารตลอดวัน',
      },
      agenda: [],
      contactName: 'CMU Music and Arts Club',
      contactEmail: 'onlyorganizer2@cmu.ac.th',
      contactPhone: '0812345672',
      contactLineId: 'cmu_music',
      externalUrl: '',
      remarks: { en: '', th: '' },
      bannerUrl: 'https://placehold.co/600x400?text=CMU+Sports+Day',
      publishedAt: new Date('2026-04-15T00:00:00.000Z'),
    },
  });

  // --- org3 events ---
  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT3 },
    update: {},
    create: {
      id: ID.EVT_DRAFT3,
      organizerId: org3.id,
      universityId: cmu.id,
      title: { en: 'Cultural Festival Draft', th: 'ฉบับร่างเทศกาลวัฒนธรรม' },
      description: {
        en: 'Draft for the upcoming cultural festival.',
        th: 'ฉบับร่างสำหรับเทศกาลวัฒนธรรมที่กำลังจะมาถึง',
      },
      category: ['CULTURAL', 'FESTIVAL'],
      location: { en: 'CMU Cultural Center', th: 'ศูนย์วัฒนธรรม มช.' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-11-20T04:00:00.000Z'),
      endAt: new Date('2026-11-22T11:00:00.000Z'),
      seatLimit: 150,
      status: EventStatus.DRAFT,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'SE Department Club',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0812345676',
      contactLineId: 'se_club',
      externalUrl: '',
      remarks: { en: '', th: '' },
      bannerUrl: 'https://placehold.co/600x400?text=Cultural+Festival+Draft',
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_DRAFT_TEST },
    update: {},
    create: {
      id: ID.EVT_DRAFT_TEST,
      organizerId: org3.id,
      universityId: cmu.id,
      title: { en: 'Test Event to Update', th: 'กิจกรรมทดสอบสำหรับอัปเดต' },
      description: {
        en: 'This is a test draft event for update testing purposes.',
        th: 'กิจกรรมฉบับร่างทดสอบสำหรับทดสอบการอัปเดต',
      },
      category: ['OTHER'],
      location: { en: 'Test Room', th: 'ห้องทดสอบ' },
      mapLink: '',
      isOnline: false,
      startAt: null,
      endAt: null,
      seatLimit: null,
      status: EventStatus.DRAFT,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactLineId: '',
      externalUrl: '',
      remarks: { en: '', th: '' },
      bannerUrl: 'https://placehold.co/600x400?text=No+Image',
    },
  });

  const evtNewYear = await prisma.event.upsert({
    where: { id: ID.EVT_NEW_YEAR },
    update: {},
    create: {
      id: ID.EVT_NEW_YEAR,
      organizerId: org3.id,
      universityId: cmu.id,
      title: {
        en: 'New Year Countdown Party 2027',
        th: 'ปาร์ตี้เคาท์ดาวน์ปีใหม่ 2027',
      },
      description: {
        en: 'Celebrate the New Year with fellow students at CAMT! Enjoy music, food, and a spectacular countdown.',
        th: 'ฉลองปีใหม่กับเพื่อนนักศึกษาที่ CAMT! เพลิดเพลินกับดนตรี อาหาร และการเคาท์ดาวน์สุดอลังการ',
      },
      category: ['PARTY', 'FESTIVAL'],
      location: { en: 'CAMT Rooftop Garden', th: 'สวนดาดฟ้า CAMT' },
      mapLink: 'https://maps.google.com/?q=CAMT+CMU',
      isOnline: false,
      startAt: new Date('2026-12-31T15:00:00.000Z'),
      endAt: new Date('2027-01-01T00:00:00.000Z'),
      seatLimit: 80,
      status: EventStatus.PUBLISHED,
      hasCatering: true,
      isCateringFree: false,
      cateringDescription: {
        en: 'Food and drinks available for purchase.',
        th: 'มีอาหารและเครื่องดื่มจำหน่าย',
      },
      agenda: [
        {
          time: '22:00',
          activity: { en: 'Gates Open and Welcome', th: 'เปิดประตูต้อนรับ' },
        },
        {
          time: '22:30',
          activity: { en: 'Live Music Performance', th: 'การแสดงดนตรีสด' },
        },
        {
          time: '23:45',
          activity: { en: 'Countdown to New Year', th: 'เคาท์ดาวน์ปีใหม่' },
        },
        {
          time: '00:00',
          activity: {
            en: 'Fireworks and Celebration',
            th: 'พลุและการเฉลิมฉลอง',
          },
        },
      ],
      contactName: 'SE Department Club',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0812345676',
      contactLineId: 'se_club',
      externalUrl: '',
      remarks: {
        en: 'Ticket required for entry. Limited seats available.',
        th: 'ต้องมีบัตรเข้างาน ที่นั่งมีจำนวนจำกัด',
      },
      bannerUrl: 'https://placehold.co/600x400?text=New+Year+Party+2027',
      publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_NO_FORM },
    update: {},
    create: {
      id: ID.EVT_NO_FORM,
      organizerId: org3.id,
      universityId: cmu.id,
      title: {
        en: 'Test Published Event No Form',
        th: 'กิจกรรมที่เผยแพร่ทดสอบ ไม่มีฟอร์ม',
      },
      description: {
        en: 'A published test event without any registration form for testing purposes.',
        th: 'กิจกรรมทดสอบที่เผยแพร่โดยไม่มีฟอร์มลงทะเบียนสำหรับทดสอบ',
      },
      category: ['OTHER'],
      location: { en: 'CAMT Building Room 301', th: 'ห้อง 301 อาคาร CAMT' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-10-20T03:00:00.000Z'),
      endAt: new Date('2026-10-20T06:00:00.000Z'),
      seatLimit: null,
      status: EventStatus.PUBLISHED,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'SE Department Club',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0812345676',
      contactLineId: 'se_club',
      externalUrl: '',
      remarks: { en: 'No registration required.', th: 'ไม่ต้องลงทะเบียน' },
      bannerUrl: 'https://placehold.co/600x400?text=Test+Published+No+Form',
      publishedAt: new Date('2026-09-20T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_EXCHANGE },
    update: {},
    create: {
      id: ID.EVT_EXCHANGE,
      organizerId: org3.id,
      universityId: cmu.id,
      title: {
        en: 'Semester Exchange Program 2026',
        th: 'โครงการแลกเปลี่ยนนักศึกษา 2026',
      },
      description: {
        en: 'An exchange program connecting CMU students with partner universities abroad.',
        th: 'โครงการแลกเปลี่ยนที่เชื่อมโยงนักศึกษา มช. กับมหาวิทยาลัยพันธมิตรต่างประเทศ',
      },
      category: ['SEMINAR', 'NETWORKING'],
      location: { en: 'Online and CAMT Building', th: 'ออนไลน์และอาคาร CAMT' },
      mapLink: '',
      isOnline: true,
      startAt: new Date('2026-06-03T02:00:00.000Z'),
      endAt: new Date('2026-11-20T08:00:00.000Z'),
      seatLimit: 20,
      status: EventStatus.ONGOING,
      hasCatering: false,
      isCateringFree: false,
      cateringDescription: { en: '', th: '' },
      agenda: [],
      contactName: 'SE Department Club',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0812345676',
      contactLineId: 'se_club',
      externalUrl: 'https://exchange.cmu.ac.th',
      remarks: {
        en: 'Must have GPA 3.0 or above to apply.',
        th: 'ต้องมี GPA 3.0 ขึ้นไปจึงสมัครได้',
      },
      bannerUrl: 'https://placehold.co/600x400?text=Semester+Exchange+2026',
      publishedAt: new Date('2026-05-01T00:00:00.000Z'),
    },
  });

  await prisma.event.upsert({
    where: { id: ID.EVT_HACKATHON },
    update: {},
    create: {
      id: ID.EVT_HACKATHON,
      organizerId: org3.id,
      universityId: cmu.id,
      title: { en: 'SE Hackathon 2026', th: 'SE Hackathon 2026' },
      description: {
        en: '48-hour hackathon challenge for SE students to build innovative solutions.',
        th: 'แข่งขัน Hackathon 48 ชั่วโมงสำหรับนักศึกษา SE เพื่อสร้างโซลูชั่นใหม่',
      },
      category: ['HACKATHON', 'COMPETITION'],
      location: { en: 'CAMT Innovation Lab', th: 'ห้อง Innovation Lab CAMT' },
      mapLink: '',
      isOnline: false,
      startAt: new Date('2026-05-20T01:00:00.000Z'),
      endAt: new Date('2026-06-06T09:00:00.000Z'),
      seatLimit: 60,
      status: EventStatus.CONCLUDED,
      hasCatering: true,
      isCateringFree: true,
      cateringDescription: {
        en: 'Meals and snacks provided throughout the event.',
        th: 'มีอาหารและของว่างตลอดงาน',
      },
      agenda: [
        {
          time: '09:00',
          activity: {
            en: 'Opening and Team Formation',
            th: 'เปิดงานและจัดทีม',
          },
        },
        {
          time: '10:00',
          activity: { en: 'Hacking Begins', th: 'เริ่มแข่งขัน' },
        },
        {
          time: '14:00',
          activity: {
            en: 'Presentations and Awards',
            th: 'นำเสนอผลงานและมอบรางวัล',
          },
        },
      ],
      contactName: 'SE Department Club',
      contactEmail: 'bothprofile1@cmu.ac.th',
      contactPhone: '0812345676',
      contactLineId: 'se_club',
      externalUrl: '',
      remarks: { en: 'Teams of 3 to 5 members.', th: 'ทีม 3 ถึง 5 คน' },
      bannerUrl: 'https://placehold.co/600x400?text=SE+Hackathon+2026',
      publishedAt: new Date('2026-04-20T00:00:00.000Z'),
    },
  });
  console.log('✓ Events seeded');

  // ─── FORMS ───────────────────────────────────────────────────────────────────

  const formHalloweenReg = await prisma.form.upsert({
    where: {
      eventId_type: { eventId: evtHalloween.id, type: FormType.REGISTRATION },
    },
    update: {},
    create: {
      id: ID.FORM_HALLOWEEN_REG,
      eventId: evtHalloween.id,
      type: FormType.REGISTRATION,
      title: 'Halloween Night Registration',
      description: 'Please fill in your details to register for the event.',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_H_NAME },
    update: {},
    create: {
      id: ID.FLD_H_NAME,
      formId: formHalloweenReg.id,
      type: FieldType.TEXT,
      label: 'Full Name',
      isRequired: true,
      order: 0,
      options: [],
      autoFillKey: 'firstName',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_H_STUID },
    update: {},
    create: {
      id: ID.FLD_H_STUID,
      formId: formHalloweenReg.id,
      type: FieldType.TEXT,
      label: 'Student ID',
      isRequired: true,
      order: 1,
      options: [],
      autoFillKey: 'studentId',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_H_YEAR },
    update: {},
    create: {
      id: ID.FLD_H_YEAR,
      formId: formHalloweenReg.id,
      type: FieldType.CHOICE,
      label: 'Year of Study',
      isRequired: true,
      order: 2,
      options: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
      autoFillKey: null,
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_H_DIET },
    update: {},
    create: {
      id: ID.FLD_H_DIET,
      formId: formHalloweenReg.id,
      type: FieldType.CHOICE,
      label: 'Dietary Preference',
      isRequired: false,
      order: 3,
      options: ['None', 'Vegetarian', 'Vegan', 'Halal'],
      autoFillKey: null,
    },
  });

  const formNewYearReg = await prisma.form.upsert({
    where: {
      eventId_type: { eventId: evtNewYear.id, type: FormType.REGISTRATION },
    },
    update: {},
    create: {
      id: ID.FORM_NEW_YEAR_REG,
      eventId: evtNewYear.id,
      type: FormType.REGISTRATION,
      title: 'New Year Party Registration',
      description: 'Secure your spot for the countdown party!',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_NY_NAME },
    update: {},
    create: {
      id: ID.FLD_NY_NAME,
      formId: formNewYearReg.id,
      type: FieldType.TEXT,
      label: 'Full Name',
      isRequired: true,
      order: 0,
      options: [],
      autoFillKey: 'firstName',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_NY_NICK },
    update: {},
    create: {
      id: ID.FLD_NY_NICK,
      formId: formNewYearReg.id,
      type: FieldType.TEXT,
      label: 'Nickname',
      isRequired: false,
      order: 1,
      options: [],
      autoFillKey: 'nickname',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_NY_TSHIRT },
    update: {},
    create: {
      id: ID.FLD_NY_TSHIRT,
      formId: formNewYearReg.id,
      type: FieldType.CHOICE,
      label: 'T-Shirt Size',
      isRequired: true,
      order: 2,
      options: ['S', 'M', 'L', 'XL', 'XXL'],
      autoFillKey: null,
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_NY_HEAR },
    update: {},
    create: {
      id: ID.FLD_NY_HEAR,
      formId: formNewYearReg.id,
      type: FieldType.CHOICE,
      label: 'How did you hear about this event?',
      isRequired: false,
      order: 3,
      options: ['Instagram', 'Facebook', 'Friend', 'Poster', 'Line'],
      autoFillKey: null,
    },
  });

  const formNewYearFeedback = await prisma.form.upsert({
    where: {
      eventId_type: { eventId: evtNewYear.id, type: FormType.FEEDBACK },
    },
    update: {},
    create: {
      id: ID.FORM_NEW_YEAR_FB,
      eventId: evtNewYear.id,
      type: FormType.FEEDBACK,
      title: 'New Year Party Feedback',
      description: 'We would love to hear your feedback!',
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_FB_OVERALL },
    update: {},
    create: {
      id: ID.FLD_FB_OVERALL,
      formId: formNewYearFeedback.id,
      type: FieldType.RATING,
      label: 'Overall Experience',
      isRequired: true,
      order: 0,
      options: [],
      autoFillKey: null,
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_FB_ORG },
    update: {},
    create: {
      id: ID.FLD_FB_ORG,
      formId: formNewYearFeedback.id,
      type: FieldType.RATING,
      label: 'Event Organization',
      isRequired: true,
      order: 1,
      options: [],
      autoFillKey: null,
    },
  });

  await prisma.formField.upsert({
    where: { id: ID.FLD_FB_COMMENT },
    update: {},
    create: {
      id: ID.FLD_FB_COMMENT,
      formId: formNewYearFeedback.id,
      type: FieldType.TEXTAREA,
      label: 'Comments',
      isRequired: false,
      order: 2,
      options: [],
      autoFillKey: null,
    },
  });
  console.log('✓ Forms and fields seeded');

  // ─── EVENT REGISTRATIONS ─────────────────────────────────────────────────────

  const regHalloweenPar1 = await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par1.id,
        eventId: evtHalloween.id,
      },
    },
    update: {},
    create: {
      id: ID.REG_HALLOWEEN_PAR1,
      participantId: par1.id,
      eventId: evtHalloween.id,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  const regHalloweenPar2 = await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par2.id,
        eventId: evtHalloween.id,
      },
    },
    update: {},
    create: {
      id: ID.REG_HALLOWEEN_PAR2,
      participantId: par2.id,
      eventId: evtHalloween.id,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  const regHalloweenPar3 = await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par3.id,
        eventId: evtHalloween.id,
      },
    },
    update: {},
    create: {
      id: ID.REG_HALLOWEEN_PAR3,
      participantId: par3.id,
      eventId: evtHalloween.id,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par1.id,
        eventId: ID.EVT_AI_RESEARCH,
      },
    },
    update: {},
    create: {
      id: ID.REG_AI_PAR1,
      participantId: par1.id,
      eventId: ID.EVT_AI_RESEARCH,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par3.id,
        eventId: ID.EVT_AI_RESEARCH,
      },
    },
    update: {},
    create: {
      id: ID.REG_AI_PAR3,
      participantId: par3.id,
      eventId: ID.EVT_AI_RESEARCH,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par2.id,
        eventId: ID.EVT_ORIENTATION,
      },
    },
    update: {},
    create: {
      id: ID.REG_ORIENT_PAR2,
      participantId: par2.id,
      eventId: ID.EVT_ORIENTATION,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par3.id,
        eventId: ID.EVT_ORIENTATION,
      },
    },
    update: {},
    create: {
      id: ID.REG_ORIENT_PAR3,
      participantId: par3.id,
      eventId: ID.EVT_ORIENTATION,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par1.id,
        eventId: ID.EVT_BOOTCAMP,
      },
    },
    update: {},
    create: {
      id: ID.REG_BOOT_PAR1,
      participantId: par1.id,
      eventId: ID.EVT_BOOTCAMP,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par2.id,
        eventId: ID.EVT_BOOTCAMP,
      },
    },
    update: {},
    create: {
      id: ID.REG_BOOT_PAR2,
      participantId: par2.id,
      eventId: ID.EVT_BOOTCAMP,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: { participantId: par1.id, eventId: ID.EVT_SPORTS },
    },
    update: {},
    create: {
      id: ID.REG_SPORTS_PAR1,
      participantId: par1.id,
      eventId: ID.EVT_SPORTS,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: { participantId: par3.id, eventId: ID.EVT_SPORTS },
    },
    update: {},
    create: {
      id: ID.REG_SPORTS_PAR3,
      participantId: par3.id,
      eventId: ID.EVT_SPORTS,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  const regNewYearPar1 = await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: { participantId: par1.id, eventId: evtNewYear.id },
    },
    update: {},
    create: {
      id: ID.REG_NY_PAR1,
      participantId: par1.id,
      eventId: evtNewYear.id,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  const regNewYearPar2 = await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: { participantId: par2.id, eventId: evtNewYear.id },
    },
    update: {},
    create: {
      id: ID.REG_NY_PAR2,
      participantId: par2.id,
      eventId: evtNewYear.id,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par2.id,
        eventId: ID.EVT_EXCHANGE,
      },
    },
    update: {},
    create: {
      id: ID.REG_EXCHANGE_PAR2,
      participantId: par2.id,
      eventId: ID.EVT_EXCHANGE,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par3.id,
        eventId: ID.EVT_EXCHANGE,
      },
    },
    update: {},
    create: {
      id: ID.REG_EXCHANGE_PAR3,
      participantId: par3.id,
      eventId: ID.EVT_EXCHANGE,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par1.id,
        eventId: ID.EVT_HACKATHON,
      },
    },
    update: {},
    create: {
      id: ID.REG_HACK_PAR1,
      participantId: par1.id,
      eventId: ID.EVT_HACKATHON,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      participantId_eventId: {
        participantId: par2.id,
        eventId: ID.EVT_HACKATHON,
      },
    },
    update: {},
    create: {
      id: ID.REG_HACK_PAR2,
      participantId: par2.id,
      eventId: ID.EVT_HACKATHON,
      status: RegistrationStatus.CONFIRMED,
    },
  });
  console.log('✓ Event registrations seeded');

  // ─── FORM RESPONSES ──────────────────────────────────────────────────────────

  // Halloween REGISTRATION - par1
  const frsHalloweenPar1 = await prisma.formResponse.upsert({
    where: { id: ID.FRS_HALLOWEEN_PAR1 },
    update: {},
    create: {
      id: ID.FRS_HALLOWEEN_PAR1,
      formId: formHalloweenReg.id,
      eventRegistrationId: regHalloweenPar1.id,
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar1.id,
        formFieldId: ID.FLD_H_NAME,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar1.id,
      formFieldId: ID.FLD_H_NAME,
      formId: formHalloweenReg.id,
      valueText: 'Su Su Myint',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar1.id,
        formFieldId: ID.FLD_H_STUID,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar1.id,
      formFieldId: ID.FLD_H_STUID,
      formId: formHalloweenReg.id,
      valueText: '662115522',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar1.id,
        formFieldId: ID.FLD_H_YEAR,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar1.id,
      formFieldId: ID.FLD_H_YEAR,
      formId: formHalloweenReg.id,
      valueArray: ['Year 3'],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar1.id,
        formFieldId: ID.FLD_H_DIET,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar1.id,
      formFieldId: ID.FLD_H_DIET,
      formId: formHalloweenReg.id,
      valueArray: ['Vegetarian'],
    },
  });

  // Halloween REGISTRATION - par2
  const frsHalloweenPar2 = await prisma.formResponse.upsert({
    where: { id: ID.FRS_HALLOWEEN_PAR2 },
    update: {},
    create: {
      id: ID.FRS_HALLOWEEN_PAR2,
      formId: formHalloweenReg.id,
      eventRegistrationId: regHalloweenPar2.id,
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar2.id,
        formFieldId: ID.FLD_H_NAME,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar2.id,
      formFieldId: ID.FLD_H_NAME,
      formId: formHalloweenReg.id,
      valueText: 'Chaiwat Srisuk',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar2.id,
        formFieldId: ID.FLD_H_STUID,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar2.id,
      formFieldId: ID.FLD_H_STUID,
      formId: formHalloweenReg.id,
      valueText: '662115533',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar2.id,
        formFieldId: ID.FLD_H_YEAR,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar2.id,
      formFieldId: ID.FLD_H_YEAR,
      formId: formHalloweenReg.id,
      valueArray: ['Year 4'],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar2.id,
        formFieldId: ID.FLD_H_DIET,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar2.id,
      formFieldId: ID.FLD_H_DIET,
      formId: formHalloweenReg.id,
      valueArray: ['None'],
    },
  });

  // Halloween REGISTRATION - par3
  const frsHalloweenPar3 = await prisma.formResponse.upsert({
    where: { id: ID.FRS_HALLOWEEN_PAR3 },
    update: {},
    create: {
      id: ID.FRS_HALLOWEEN_PAR3,
      formId: formHalloweenReg.id,
      eventRegistrationId: regHalloweenPar3.id,
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar3.id,
        formFieldId: ID.FLD_H_NAME,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar3.id,
      formFieldId: ID.FLD_H_NAME,
      formId: formHalloweenReg.id,
      valueText: 'Min Thant Ko',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar3.id,
        formFieldId: ID.FLD_H_STUID,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar3.id,
      formFieldId: ID.FLD_H_STUID,
      formId: formHalloweenReg.id,
      valueText: '662115510',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar3.id,
        formFieldId: ID.FLD_H_YEAR,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar3.id,
      formFieldId: ID.FLD_H_YEAR,
      formId: formHalloweenReg.id,
      valueArray: ['Year 3'],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsHalloweenPar3.id,
        formFieldId: ID.FLD_H_DIET,
      },
    },
    update: {},
    create: {
      formResponseId: frsHalloweenPar3.id,
      formFieldId: ID.FLD_H_DIET,
      formId: formHalloweenReg.id,
      valueArray: ['None'],
    },
  });

  // New Year REGISTRATION - par1
  const frsNewYearPar1 = await prisma.formResponse.upsert({
    where: { id: ID.FRS_NY_PAR1 },
    update: {},
    create: {
      id: ID.FRS_NY_PAR1,
      formId: formNewYearReg.id,
      eventRegistrationId: regNewYearPar1.id,
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar1.id,
        formFieldId: ID.FLD_NY_NAME,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar1.id,
      formFieldId: ID.FLD_NY_NAME,
      formId: formNewYearReg.id,
      valueText: 'Su Su Myint',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar1.id,
        formFieldId: ID.FLD_NY_NICK,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar1.id,
      formFieldId: ID.FLD_NY_NICK,
      formId: formNewYearReg.id,
      valueText: 'Su',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar1.id,
        formFieldId: ID.FLD_NY_TSHIRT,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar1.id,
      formFieldId: ID.FLD_NY_TSHIRT,
      formId: formNewYearReg.id,
      valueArray: ['M'],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar1.id,
        formFieldId: ID.FLD_NY_HEAR,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar1.id,
      formFieldId: ID.FLD_NY_HEAR,
      formId: formNewYearReg.id,
      valueArray: ['Instagram'],
    },
  });

  // New Year REGISTRATION - par2
  const frsNewYearPar2 = await prisma.formResponse.upsert({
    where: { id: ID.FRS_NY_PAR2 },
    update: {},
    create: {
      id: ID.FRS_NY_PAR2,
      formId: formNewYearReg.id,
      eventRegistrationId: regNewYearPar2.id,
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar2.id,
        formFieldId: ID.FLD_NY_NAME,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar2.id,
      formFieldId: ID.FLD_NY_NAME,
      formId: formNewYearReg.id,
      valueText: 'Chaiwat Srisuk',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar2.id,
        formFieldId: ID.FLD_NY_NICK,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar2.id,
      formFieldId: ID.FLD_NY_NICK,
      formId: formNewYearReg.id,
      valueText: 'Chai',
      valueArray: [],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar2.id,
        formFieldId: ID.FLD_NY_TSHIRT,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar2.id,
      formFieldId: ID.FLD_NY_TSHIRT,
      formId: formNewYearReg.id,
      valueArray: ['L'],
    },
  });

  await prisma.formFieldResponse.upsert({
    where: {
      formResponseId_formFieldId: {
        formResponseId: frsNewYearPar2.id,
        formFieldId: ID.FLD_NY_HEAR,
      },
    },
    update: {},
    create: {
      formResponseId: frsNewYearPar2.id,
      formFieldId: ID.FLD_NY_HEAR,
      formId: formNewYearReg.id,
      valueArray: ['Friend'],
    },
  });

  console.log('✓ Form responses seeded');
  console.log('');
  console.log('─────────────────────────────────────────────────');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('  1  university  (CMU)');
  console.log('  6  users       (password: 12345678)');
  console.log('     noprofile1@cmu.ac.th');
  console.log('     onlyorganizer1@cmu.ac.th');
  console.log('     onlyorganizer2@cmu.ac.th');
  console.log('     onlyparticipant1@cmu.ac.th');
  console.log('     onlyparticipant2@cmu.ac.th');
  console.log('     bothprofile1@cmu.ac.th');
  console.log('  3  organizer profiles');
  console.log('  3  participant profiles');
  console.log('  14 events across 3 organizers');
  console.log('     org1: DRAFT, PUBLISHED(form+reg), ONGOING, CONCLUDED');
  console.log('     org2: DRAFT, PUBLISHED(form), ONGOING, CONCLUDED');
  console.log(
    '     org3: DRAFT x2, PUBLISHED x2(form+reg/no-form), ONGOING, CONCLUDED',
  );
  console.log('  3  forms  (Halloween reg, New Year reg, New Year feedback)');
  console.log('  11 form fields');
  console.log('  17 event registrations');
  console.log('  5  form responses with field responses');
  console.log('─────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// To run: npx prisma db seed
