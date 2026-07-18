import {
  EventStatus,
  FieldType,
  FormType,
  RegistrationStatus,
  TicketStatus,
} from '@prisma/client';

export const MOCK_EVENT_ID = 'e0000002-0000-4000-8000-000000000002';
export const MOCK_PARTICIPANT_PROFILE_ID =
  'd0000001-0000-4000-8000-000000000001';
export const MOCK_ORGANIZER_PROFILE_ID = 'c0000001-0000-4000-8000-000000000001';
export const MOCK_REGISTRATION_ID = 'a1000001-0000-4000-8000-000000000001';
export const MOCK_TICKET_ID = 'b1000001-0000-4000-8000-000000000001';
export const MOCK_FORM_ID = 'f0000001-0000-4000-8000-000000000001';
export const MOCK_FIELD_ID_FIRSTNAME = 'f1000001-0000-4000-8000-000000000001';
export const MOCK_FIELD_ID_STUDENTID = 'f1000002-0000-4000-8000-000000000002';
export const MOCK_FIELD_ID_LASTNAME = 'f1000003-0000-4000-8000-000000000003';
export const MOCK_FIELD_ID_NICKNAME = 'f1000004-0000-4000-8000-000000000004';
export const MOCK_FIELD_ID_MAJOR = 'f1000005-0000-4000-8000-000000000005';
export const MOCK_QR_TOKEN = '868af4ff-48f6-42b5-a612-c04cbcaf861a';
export const MOCK_OTHER_PARTICIPANT_ID = 'd9999999-0000-4000-8000-000000000099';

export const MOCK_PARTICIPANT_SNAPSHOT = {
  firstName: 'Su Su',
  lastName: 'Myint',
  nickname: 'Su',
  studentId: '662115522',
  major: 'Software Engineering',
};

export const MOCK_SNAPSHOT_NO_STUDENT_ID = {
  firstName: 'Su Su',
  lastName: 'Myint',
  nickname: 'Su',
  studentId: '',
  major: '',
};

export const MOCK_FUTURE_DATE = new Date('2026-10-31T10:00:00.000Z');
export const MOCK_FUTURE_END_DATE = new Date('2026-10-31T14:00:00.000Z');
export const MOCK_PAST_DATE = new Date('2026-01-01T10:00:00.000Z');
export const MOCK_CREATED_AT = new Date('2026-07-08T14:24:52.668Z');
export const MOCK_ISSUED_AT = new Date('2026-07-08T14:24:52.680Z');

// Events

export const MOCK_PUBLISHED_EVENT = {
  id: MOCK_EVENT_ID,
  organizerId: MOCK_ORGANIZER_PROFILE_ID,
  universityId: 'a0000001-0000-4000-8000-000000000001',
  title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
  description: { en: 'A spooky event', th: 'งานสุดหลอน' },
  category: ['PARTY'],
  bannerUrl: '',
  location: { en: 'CAMT Auditorium', th: 'ห้องประชุม CAMT' },
  mapLink: '',
  isOnline: false,
  startAt: MOCK_FUTURE_DATE,
  endAt: MOCK_FUTURE_END_DATE,
  seatLimit: 100,
  seatsTaken: 3,
  status: EventStatus.PUBLISHED,
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
  createdAt: MOCK_CREATED_AT,
  updatedAt: MOCK_CREATED_AT,
  publishedAt: MOCK_CREATED_AT,
};

export const MOCK_ONGOING_EVENT = {
  ...MOCK_PUBLISHED_EVENT,
  status: EventStatus.ONGOING,
};

export const MOCK_DRAFT_EVENT = {
  ...MOCK_PUBLISHED_EVENT,
  status: EventStatus.DRAFT,
};

export const MOCK_CONCLUDED_EVENT = {
  ...MOCK_PUBLISHED_EVENT,
  status: EventStatus.CONCLUDED,
  startAt: MOCK_PAST_DATE,
  endAt: new Date('2026-01-01T14:00:00.000Z'),
};

export const MOCK_CANCELLED_EVENT = {
  ...MOCK_PUBLISHED_EVENT,
  status: EventStatus.CANCELLED,
};

export const MOCK_FULL_EVENT = {
  ...MOCK_PUBLISHED_EVENT,
  seatLimit: 3,
  seatsTaken: 3,
};

export const MOCK_UNLIMITED_EVENT = {
  ...MOCK_PUBLISHED_EVENT,
  seatLimit: null,
  seatsTaken: 5,
};

export const MOCK_EVENT_WITH_ORGANIZER = {
  ...MOCK_PUBLISHED_EVENT,
  organizer: {
    name: 'CAMT Student Affairs',
    imageUrl: '',
  },
};

export const MOCK_EVENT_PAST_STARTAT = {
  ...MOCK_PUBLISHED_EVENT,
  startAt: MOCK_PAST_DATE,
};

// Registrations

export const MOCK_CONFIRMED_REGISTRATION = {
  id: MOCK_REGISTRATION_ID,
  status: RegistrationStatus.CONFIRMED,
  participantId: MOCK_PARTICIPANT_PROFILE_ID,
  eventId: MOCK_EVENT_ID,
  createdAt: MOCK_CREATED_AT,
};

export const MOCK_CANCELLED_REGISTRATION = {
  ...MOCK_CONFIRMED_REGISTRATION,
  status: RegistrationStatus.CANCELLED,
};

// tickets 

export const MOCK_ACTIVE_TICKET = {
  id: MOCK_TICKET_ID,
  eventRegistrationId: MOCK_REGISTRATION_ID,
  qrToken: MOCK_QR_TOKEN,
  status: TicketStatus.ACTIVE,
  participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT,
  issuedAt: MOCK_ISSUED_AT,
};

export const MOCK_CANCELLED_TICKET = {
  ...MOCK_ACTIVE_TICKET,
  status: TicketStatus.CANCELLED,
};

// form fields

export const MOCK_FIRSTNAME_FIELD = {
  id: MOCK_FIELD_ID_FIRSTNAME,
  formId: MOCK_FORM_ID,
  type: FieldType.TEXT,
  label: 'First Name',
  isRequired: true,
  order: 0,
  options: [],
  autoFillKey: 'firstName',
};

export const MOCK_STUDENTID_FIELD = {
  id: MOCK_FIELD_ID_STUDENTID,
  formId: MOCK_FORM_ID,
  type: FieldType.TEXT,
  label: 'Student ID',
  isRequired: true,
  order: 1,
  options: [],
  autoFillKey: 'studentId',
};

export const MOCK_LASTNAME_FIELD = {
  id: MOCK_FIELD_ID_LASTNAME,
  formId: MOCK_FORM_ID,
  type: FieldType.TEXT,
  label: 'Last Name',
  isRequired: false,
  order: 2,
  options: [],
  autoFillKey: 'lastName',
};

export const MOCK_NICKNAME_FIELD = {
  id: MOCK_FIELD_ID_NICKNAME,
  formId: MOCK_FORM_ID,
  type: FieldType.TEXT,
  label: 'Nickname',
  isRequired: false,
  order: 3,
  options: [],
  autoFillKey: 'nickname',
};

export const MOCK_MAJOR_FIELD = {
  id: MOCK_FIELD_ID_MAJOR,
  formId: MOCK_FORM_ID,
  type: FieldType.TEXT,
  label: 'Major',
  isRequired: false,
  order: 4,
  options: [],
  autoFillKey: 'major',
}

export const MOCK_CHOICE_FIELD = {
  id: 'f1000003-0000-4000-8000-000000000003',
  formId: MOCK_FORM_ID,
  type: FieldType.CHOICE,
  label: 'Year of Study',
  isRequired: false,
  order: 2,
  options: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
  autoFillKey: null,
};

export const MOCK_NUMBER_FIELD = {
  id: 'f1000004-0000-4000-8000-000000000004',
  formId: MOCK_FORM_ID,
  type: FieldType.NUMBER,
  label: 'Age',
  isRequired: false,
  order: 3,
  options: [],
  autoFillKey: null,
};

export const MOCK_FORM_WITH_FIELDS = {
  id: MOCK_FORM_ID,
  eventId: MOCK_EVENT_ID,
  type: FormType.REGISTRATION,
  title: 'Halloween Night Registration',
  description: 'Please fill in your details.',
  fields: [MOCK_FIRSTNAME_FIELD, MOCK_STUDENTID_FIELD],
};

//form resopnse that match autofill key
export const MOCK_VALID_ANSWERS = [
  { formFieldId: MOCK_FIELD_ID_FIRSTNAME, value: 'Su Su Myint' },
  { formFieldId: MOCK_FIELD_ID_STUDENTID, value: '662115522' },
];

// participant profile
export const MOCK_PARTICIPANT_PROFILE = {
  id: MOCK_PARTICIPANT_PROFILE_ID,
  userId: 'b0000004-0000-4000-8000-000000000004',
  firstName: 'Su Su',
  lastName: 'Myint',
  nickname: 'Su',
  studentId: '662115522',
  major: 'Software Engineering',
  contactEmail: 'onlyparticipant1@cmu.ac.th',
  contactPhone: '0823456781',
  contactLineId: 'susu_line',
  imageUrl: null,
  preferences: null,
  createdAt: MOCK_CREATED_AT,
};

export const MOCK_RETURN_TICKET_DETAIL_DTO = {
  id: MOCK_TICKET_ID,
  qrToken: MOCK_QR_TOKEN,
  status: TicketStatus.ACTIVE,
  issuedAt: MOCK_ISSUED_AT,
  participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT,
  registration: {
    id: MOCK_REGISTRATION_ID,
    status: RegistrationStatus.CONFIRMED,
    createdAt: MOCK_CREATED_AT,
  },
  event: {
    id: MOCK_EVENT_ID,
    title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
    bannerUrl: '',
    startAt: MOCK_FUTURE_DATE,
    endAt: MOCK_FUTURE_END_DATE,
    location: { en: 'CAMT Auditorium', th: 'ห้องประชุม CAMT' },
    mapLink: '',
    status: EventStatus.PUBLISHED,
    seatLimit: 100,
    seatsTaken: 3,
    organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
  },
};

export const MOCK_RETURN_REGISTRANT_DTO = {
  id: MOCK_REGISTRATION_ID,
  status: RegistrationStatus.CONFIRMED,
  createdAt: MOCK_CREATED_AT,
  ticketStatus: TicketStatus.ACTIVE,
  ticketIssuedAt: MOCK_ISSUED_AT,
  participantSnapshot: MOCK_PARTICIPANT_SNAPSHOT,
};

export const MOCK_RETURN_REGISTERED_EVENT_DTO = {
  id: MOCK_EVENT_ID,
  title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
  bannerUrl: '',
  startAt: MOCK_FUTURE_DATE,
  endAt: MOCK_FUTURE_END_DATE,
  location: { en: 'CAMT Auditorium', th: 'ห้องประชุม CAMT' },
  status: EventStatus.PUBLISHED,
  organizer: { name: 'CAMT Student Affairs', imageUrl: '' },
  registration: {
    id: MOCK_REGISTRATION_ID,
    status: RegistrationStatus.CONFIRMED,
    createdAt: MOCK_CREATED_AT,
  },
};

export const MOCK_RETURN_TICKET_LIST_DTO = {
  id: MOCK_TICKET_ID,
  status: TicketStatus.ACTIVE,
  issuedAt: MOCK_ISSUED_AT,
  registrationStatus: RegistrationStatus.CONFIRMED,
  event: {
    id: MOCK_EVENT_ID,
    title: { en: 'CAMT Halloween Night 2026', th: 'คืนฮาโลวีน CAMT 2026' },
    bannerUrl: '',
    startAt: MOCK_FUTURE_DATE,
    endAt: MOCK_FUTURE_END_DATE,
    status: EventStatus.PUBLISHED,
  },
};
