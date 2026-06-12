import { Test, TestingModule } from '@nestjs/testing';
import { FieldType, FormType } from '@prisma/client';
import { FormCrudService } from './form-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';
import { SaveFormException } from '../exceptions/save-form.exception';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

const mockPrisma = {
  form: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  formResponse: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockTx = {
  form: { update: jest.fn(), findUnique: jest.fn() },
  formField: { deleteMany: jest.fn(), createMany: jest.fn() },
};

const mockForm1 = () => ({
  id: 'f2000000-0000-0000-0000-000000000002',
  eventId: 'e1000000-0000-0000-0000-000000000002',
  type: FormType.FEEDBACK,
  title: 'NestJS Workshop Feedback',
  description: '',
  fields: [
    {
      id: 'dc200000-0000-0000-0000-000000000005',
      formId: 'f2000000-0000-0000-0000-000000000002',
      type: FieldType.RATING,
      label: 'Overall Rating',
      isRequired: true,
      order: 0,
      options: [],
      autoFillKey: null,
    },
  ],
});

const mockFormResponseSummary1 = () => ({
  formId: 'f3000000-0000-0000-0000-000000000001',
  totalResponses: 2,
  summary: [
    {
      formFieldId: 'dc300000-0000-0000-0000-000000000001',
      label: 'Full Name',
      type: FieldType.TEXT,
      answers: [
        {
          responseId: 'ae300000-0000-0000-0000-000000000001',
          createdAt: new Date('2026-07-06T10:00:00.000Z'),
          value: 'Min Thant Ko',
        },
        {
          responseId: 'ae300000-0000-0000-0000-000000000002',
          createdAt: new Date('2026-07-06T10:05:00.000Z'),
          value: 'Su Su',
        },
      ],
    },
    {
      formFieldId: 'dc300000-0000-0000-0000-000000000002',
      label: 'Student ID',
      type: FieldType.TEXT,
      answers: [
        {
          responseId: 'ae300000-0000-0000-0000-000000000001',
          createdAt: new Date('2026-07-06T10:00:00.000Z'),
          value: '662115510',
        },
        {
          responseId: 'ae300000-0000-0000-0000-000000000002',
          createdAt: new Date('2026-07-06T10:05:00.000Z'),
          value: '662115511',
        },
      ],
    },
  ],
});

const mockFormResponse1 = () => ({
  formId: 'f4000000-0000-0000-0000-000000000001',
  totalResponses: 1,
  responses: [
    {
      id: 'ae400000-0000-0000-0000-000000000001',
      createdAt: new Date('2026-07-18T09:00:00.000Z'),
      answers: [
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000001',
          label: 'Full Name',
          type: FieldType.TEXT,
          value: 'Kyaw Gye',
        },
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000002',
          label: 'Student ID',
          type: FieldType.TEXT,
          value: '662115515',
        },
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000003',
          label: 'Year of Study',
          type: FieldType.CHOICE,
          value: ['Year 3'],
        },
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000004',
          label: 'Track',
          type: FieldType.CHECKBOX,
          value: ['Web', 'AI'],
        },
      ],
    },
  ],
});

const mockFormResponse2 = () => ({
  formId: 'f4000000-0000-0000-0000-000000000001',
  totalResponses: 1,
  responses: [
    {
      id: 'ae400000-0000-0000-0000-000000000001',
      createdAt: new Date('2026-07-18T09:00:00.000Z'),
      answers: [
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000001',
          label: 'Full Name',
          type: FieldType.TEXT,
          value: 'Kai Htwe',
        },
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000002',
          label: 'Student ID',
          type: FieldType.TEXT,
          value: '',
        },
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000003',
          label: 'Year of Study',
          type: FieldType.CHOICE,
          value: [],
        },
        {
          formFieldId: 'dc400000-0000-0000-0000-000000000004',
          label: 'Track',
          type: FieldType.CHECKBOX,
          value: ['Web', 'AI'],
        },
      ],
    },
  ],
});

describe('FormCrudService - createForm', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-M042-01: should return ReturnFormWithFields when dto is valid with fields', async () => {
    const formId = uuidv4();
    const formFieldId = uuidv4();
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      dto: {
        title: 'CMU Marathon Registration',
        description: 'Register for the CMU Marathon 2026',
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Full Name',
            isRequired: true,
            options: [],
          },
        ],
      },
    };
    const expected = {
      id: formId,
      eventId: input.eventId,
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: 'Register for the CMU Marathon 2026',
      fields: [
        {
          id: formFieldId,
          formId: formId,
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockPrisma.form.create.mockResolvedValue(expected);

    const result = await service.createForm(
      input.eventId,
      input.type,
      input.dto,
    );

    // console.log('[UT-M042-01] Input :', input);
    // console.log('[UT-M042-01] Expected :', expected);
    // console.log('[UT-M042-01] Actual :', result);

    expect(result).toEqual(expected);
  });

  it('UT-M042-02: should create form with title "" and description "" when dto has no title or description', async () => {
    const formId = uuidv4();
    const formFieldId = uuidv4();
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.FEEDBACK,
      dto: {
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Comment',
            isRequired: false,
            options: [],
          },
        ],
      },
    };
    const expected = {
      id: formId,
      eventId: input.eventId,
      type: FormType.FEEDBACK,
      title: '',
      description: '',
      fields: [
        {
          id: formFieldId,
          formId: formId,
          type: FieldType.TEXT,
          label: 'Comment',
          isRequired: false,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockPrisma.form.create.mockResolvedValue(expected);

    const result = await service.createForm(
      input.eventId,
      input.type,
      input.dto,
    );

    // console.log('[UT-M042-02] Input :', input);
    // console.log('[UT-M042-02] Expected :', expected);
    // console.log('[UT-M042-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.title).toBe('');
    expect(result.description).toBe('');
  });

  it('UT-M042-03: should create form with empty fields array when dto has empty fields', async () => {
    const formId = uuidv4();
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      dto: {
        title: 'Empty Form',
        description: 'form with empty fields',
        fields: [],
      },
    };
    const expected = {
      id: formId,
      eventId: input.eventId,
      type: FormType.REGISTRATION,
      title: 'Empty Form',
      description: 'form with empty fields',
      fields: [],
    };
    mockPrisma.form.create.mockResolvedValue(expected);

    const result = await service.createForm(
      input.eventId,
      input.type,
      input.dto,
    );

    // console.log('[UT-M042-03] Input :', input);
    // console.log('[UT-M042-03] Expected :', expected);
    // console.log('[UT-M042-03] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields).toEqual([]);
  });

  it('UT-M042-04: should throw SaveFormException when database fails', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      dto: {
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Full Name',
            isRequired: true,
            options: [],
          },
        ],
      },
    };
    mockPrisma.form.create.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );
    mockPrisma.form.create.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );

    await expect(
      service.createForm(input.eventId, input.type, input.dto),
    ).rejects.toThrow(SaveFormException);
    await expect(
      service.createForm(input.eventId, input.type, input.dto),
    ).rejects.toThrow('Failed to save form. Please try again.');
  });
});

describe('FormCrudService - getFormsByEventId', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-M043-01: should return array of mapped forms when event has multiple forms', async () => {
    const eventId = 'e1000000-0000-0000-0000-000000000001';
    const expected = [
      {
        id: 'f1000000-0000-0000-0000-000000000001',
        eventId,
        type: FormType.REGISTRATION,
        title: 'CMU Marathon Registration',
        description: 'Register for the CMU Marathon 2026',
        fields: [
          {
            id: 'dc100000-0000-0000-0000-000000000001',
            formId: 'f1000000-0000-0000-0000-000000000001',
            type: FieldType.TEXT,
            label: 'Full Name',
            isRequired: true,
            order: 0,
            options: [],
            autoFillKey: null,
          },
        ],
      },
      {
        id: 'f1000000-0000-0000-0000-000000000002',
        eventId,
        type: FormType.FEEDBACK,
        title: 'CMU Marathon Feedback',
        description: '',
        fields: [
          {
            id: 'dc100000-0000-0000-0000-000000000002',
            formId: 'f1000000-0000-0000-0000-000000000002',
            type: FieldType.RATING,
            label: 'Overall Rating',
            isRequired: true,
            order: 0,
            options: [],
            autoFillKey: null,
          },
        ],
      },
    ];
    mockPrisma.form.findMany.mockResolvedValue(expected);

    const result = await service.getFormsByEventId(eventId);
    // console.log('[UT-M043-01] Input :', { eventId });
    // console.log('[UT-M043-01] Expected :', expected);
    // console.log('[UT-M043-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.form.findMany).toHaveBeenCalledWith({
      where: { eventId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    expect(mockPrisma.form.findMany).toHaveBeenCalledTimes(1);
  });

  it('UT-M043-02: should return empty array when event has no forms', async () => {
    const eventId = 'e1000000-0000-0000-0000-000000000002';
    const expected: any[] = [];
    mockPrisma.form.findMany.mockResolvedValue([]);
    const result = await service.getFormsByEventId(eventId);
    // console.log('[UT-M043-02] Input :', { eventId });
    // console.log('[UT-M043-02] Expected :', expected);
    // console.log('[UT-M043-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.form.findMany).toHaveBeenCalledWith({
      where: { eventId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  });

  it('UT-M043-03: should return form with empty fields array when form has no fields', async () => {
    const eventId = 'e1000000-0000-0000-0000-000000000003';
    const expected = [
      {
        id: 'f1000000-0000-0000-0000-000000000003',
        eventId,
        type: FormType.REGISTRATION,
        title: 'Empty Form',
        description: '',
        fields: [],
      },
    ];
    mockPrisma.form.findMany.mockResolvedValue(expected);
    const result = await service.getFormsByEventId(eventId);
    // console.log('[UT-M043-03] Input :', { eventId });
    // console.log('[UT-M043-03] Expected :', expected);
    // console.log('[UT-M043-03] Actual :', result);

    expect(result).toEqual(expected);
    expect(result[0].fields).toEqual([]);
  });
});

describe('FormCrudService - getFormByEventAndType', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-M044-01: should return ReturnFormWithFields when form is found', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: input.eventId,
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: 'Register for the CMU Marathon 2026',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockPrisma.form.findUnique.mockResolvedValue(expected);

    const result = await service.getFormByEventAndType(
      input.eventId,
      input.type,
    );
    // console.log('[UT-M044-01] Input :', input);
    // console.log('[UT-M044-01] Expected :', expected);
    // console.log('[UT-M044-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockPrisma.form.findUnique).toHaveBeenCalledWith({
      where: { eventId_type: { eventId: input.eventId, type: input.type } },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    expect(mockPrisma.form.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-M044-02: should throw FormNotFoundException when form is not found', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000003',
      type: FormType.FEEDBACK,
    };
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.getFormByEventAndType(input.eventId, input.type),
    ).rejects.toThrow(FormNotFoundException);
    await expect(
      service.getFormByEventAndType(input.eventId, input.type),
    ).rejects.toThrow('Form not found.');
  });
});

describe('FormCrudService - updateFormByFormId', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
  });

  it('UT-M045-01: should delete old fields, create new fields, and return updated form when dto has title, description, and fields', async () => {
    const input = {
      formId: 'f2000000-0000-0000-0000-000000000002',
      dto: {
        title: 'Updated Marathon Feedback',
        description: 'Updated description',
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Suggestion',
            isRequired: false,
            options: [],
          },
        ],
      },
    };
    const expected = {
      id: input.formId,
      eventId: 'e1000000-0000-0000-0000-000000000002',
      type: FormType.FEEDBACK,
      title: 'Updated Marathon Feedback',
      description: 'Updated description',
      fields: [
        {
          id: 'dc200000-0000-0000-0000-000000000099',
          formId: input.formId,
          type: FieldType.TEXT,
          label: 'Suggestion',
          isRequired: false,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockTx.form.update.mockResolvedValue(undefined);
    mockTx.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.formField.createMany.mockResolvedValue({ count: 1 });
    mockTx.form.findUnique.mockResolvedValue(expected);

    const result = await service.updateFormByFormId(input.formId, input.dto);
    // console.log('[UT-M045-01] Input :', input);
    // console.log('[UT-M045-01] Expected :', expected);
    // console.log('[UT-M045-01] Actual :', result);

    expect(result).toEqual(expected);
    expect(mockTx.formField.deleteMany).toHaveBeenCalled();
    expect(mockTx.formField.createMany).toHaveBeenCalled();
  });

  it('UT-M045-02: should update only title and leave fields unchanged when dto.fields is undefined', async () => {
    const input = {
      formId: 'f2000000-0000-0000-0000-000000000002',
      dto: { title: 'New Title Only' },
    };
    const expected = { ...mockForm1(), title: 'New Title Only' };
    mockTx.form.update.mockResolvedValue(undefined);
    mockTx.form.findUnique.mockResolvedValue(expected);

    const result = await service.updateFormByFormId(input.formId, input.dto);

    // console.log('[UT-M045-02] Input :', input);
    // console.log('[UT-M045-02] Expected :', expected);
    // console.log('[UT-M045-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.title).toBe('New Title Only');
    expect(result.fields).toEqual(mockForm1().fields);
    expect(mockTx.formField.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.formField.createMany).not.toHaveBeenCalled();
  });

  it('UT-M045-03: should call deleteMany and return form with no fields when dto.fields is empty array', async () => {
    const input = {
      formId: 'f2000000-0000-0000-0000-000000000002',
      dto: { fields: [] },
    };
    const expected = { ...mockForm1(), fields: [] };
    mockTx.form.update.mockResolvedValue(undefined);
    mockTx.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.formField.createMany.mockResolvedValue({ count: 0 });
    mockTx.form.findUnique.mockResolvedValue(expected);

    const result = await service.updateFormByFormId(input.formId, input.dto);

    // console.log('[UT-M045-03] Input :', input);
    // console.log('[UT-M045-03] Expected :', expected);
    // console.log('[UT-M045-03] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields).toEqual([]);
    expect(mockTx.formField.deleteMany).toHaveBeenCalled();
    expect(mockTx.formField.createMany).toHaveBeenCalledWith({ data: [] });
  });

  it('UT-M045-04: should throw SaveFormException when database transaction fails', async () => {
    const input = {
      formId: 'f1000000-0000-0000-0000-000000000001',
      dto: { title: 'Title' },
    };
    mockPrisma.$transaction.mockRejectedValueOnce(
      new Error('Transaction failed'),
    );
    mockPrisma.$transaction.mockRejectedValueOnce(
      new Error('Transaction failed'),
    );

    await expect(
      service.updateFormByFormId(input.formId, input.dto),
    ).rejects.toThrow(SaveFormException);
    await expect(
      service.updateFormByFormId(input.formId, input.dto),
    ).rejects.toThrow('Failed to save form. Please try again.');
  });
});

describe('FormCrudService - getFormResponses', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-M046-01: should throw FormNotFoundException when form is not found', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000009',
      type: FormType.REGISTRATION,
    };
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.getFormResponses(input.eventId, input.type),
    ).rejects.toThrow(FormNotFoundException);
    await expect(
      service.getFormResponses(input.eventId, input.type),
    ).rejects.toThrow('Form not found.');
  });

  it('UT-M046-02: should return totalResponses 0 and empty responses array when form has no responses', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
    };
    const expected = {
      formId: 'f1000000-0000-0000-0000-000000000001',
      totalResponses: 0,
      responses: [],
    };
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f1000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([]);

    const result = await service.getFormResponses(input.eventId, input.type);

    // console.log('[UT-M046-02] Input :', input);
    // console.log('[UT-M046-02] Expected :', expected);
    // console.log('[UT-M046-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.totalResponses).toBe(0);
    expect(result.responses).toEqual([]);
  });

  it('UT-M046-03: should return correct response structure when form has responses with all fields answered', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000007',
      type: FormType.REGISTRATION,
    };
    const expected = mockFormResponse1();
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f4000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc400000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc400000-0000-0000-0000-000000000002',
          type: FieldType.TEXT,
          label: 'Student ID',
          isRequired: true,
          order: 1,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc400000-0000-0000-0000-000000000003',
          type: FieldType.CHOICE,
          label: 'Year of Study',
          isRequired: false,
          order: 2,
          options: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
          autoFillKey: null,
        },
        {
          id: 'dc400000-0000-0000-0000-000000000004',
          type: FieldType.CHECKBOX,
          label: 'Track',
          isRequired: false,
          order: 3,
          options: ['Web', 'AI', 'Mobile'],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([
      {
        id: 'ae400000-0000-0000-0000-000000000001',
        createdAt: new Date('2026-07-18T09:00:00.000Z'),
        fieldResponses: [
          {
            formFieldId: 'dc400000-0000-0000-0000-000000000001',
            valueText: 'Kyaw Gye',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
          {
            formFieldId: 'dc400000-0000-0000-0000-000000000002',
            valueText: '662115515',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
          {
            formFieldId: 'dc400000-0000-0000-0000-000000000003',
            valueText: null,
            valueNumber: null,
            valueDate: null,
            valueArray: ['Year 3'],
          },
          {
            formFieldId: 'dc400000-0000-0000-0000-000000000004',
            valueText: null,
            valueNumber: null,
            valueDate: null,
            valueArray: ['Web', 'AI'],
          },
        ],
      },
    ]);

    const result = await service.getFormResponses(input.eventId, input.type);

    // console.log('[UT-M046-03] Input :', input);
    // console.log('[UT-M046-03] Expected :', expected);
    // console.log('[UT-M046-03] Actual :', result);

    expect(result).toEqual(expected);
  });

  it('UT-M046-04: should return type-appropriate default values for fields missing fieldResponse', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000005',
      type: FormType.REGISTRATION,
    };
    const expected = mockFormResponse2();
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f4000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc400000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc400000-0000-0000-0000-000000000002',
          type: FieldType.TEXT,
          label: 'Student ID',
          isRequired: false,
          order: 1,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc400000-0000-0000-0000-000000000003',
          type: FieldType.CHOICE,
          label: 'Year of Study',
          isRequired: false,
          order: 2,
          options: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
          autoFillKey: null,
        },
        {
          id: 'dc400000-0000-0000-0000-000000000004',
          type: FieldType.CHECKBOX,
          label: 'Track',
          isRequired: false,
          order: 3,
          options: ['Web', 'AI', 'Mobile'],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([
      {
        id: 'ae400000-0000-0000-0000-000000000001',
        createdAt: new Date('2026-07-18T09:00:00.000Z'),
        fieldResponses: [
          {
            formFieldId: 'dc400000-0000-0000-0000-000000000001',
            valueText: 'Kai Htwe',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
          {
            formFieldId: 'dc400000-0000-0000-0000-000000000004',
            valueText: null,
            valueNumber: null,
            valueDate: null,
            valueArray: ['Web', 'AI'],
          },
        ],
      },
    ]);

    const result = await service.getFormResponses(input.eventId, input.type);

    // console.log('[UT-M046-04] Input :', input);
    // console.log('[UT-M046-04] Expected :', expected);
    // console.log('[UT-M046-04] Actual :', result);

    expect(result).toEqual(expected);
  });
});

describe('FormCrudService - getFormResponsesSummary', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-M047-01: should throw FormNotFoundException when form is not found', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000005',
      type: FormType.FEEDBACK,
    };
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.getFormResponsesSummary(input.eventId, input.type),
    ).rejects.toThrow(FormNotFoundException);
    await expect(
      service.getFormResponsesSummary(input.eventId, input.type),
    ).rejects.toThrow('Form not found.');
  });

  it('UT-M047-02: should return totalResponses 0 and empty answers for each field when form has no responses', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000003',
      type: FormType.FEEDBACK,
    };
    const expected = {
      formId: 'f5000000-0000-0000-0000-000000000001',
      totalResponses: 0,
      summary: [
        {
          formFieldId: 'dc500000-0000-0000-0000-000000000001',
          label: 'Full Name',
          type: FieldType.TEXT,
          answers: [],
        },
      ],
    };
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f5000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc500000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([]);

    const result = await service.getFormResponsesSummary(
      input.eventId,
      input.type,
    );
    // console.log('[UT-M047-02] Input :', input);
    // console.log('[UT-M047-02] Expected :', expected);
    // console.log('[UT-M047-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.totalResponses).toBe(0);
    expect(result.summary[0].answers).toEqual([]);
  });

  it('UT-M047-03: should return correct summary when form has 2 responses', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.FEEDBACK,
    };
    const expected = mockFormResponseSummary1();
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f3000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc300000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc300000-0000-0000-0000-000000000002',
          type: FieldType.TEXT,
          label: 'Student ID',
          isRequired: true,
          order: 1,
          options: [],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([
      {
        id: 'ae300000-0000-0000-0000-000000000001',
        createdAt: new Date('2026-07-06T10:00:00.000Z'),
        fieldResponses: [
          {
            formFieldId: 'dc300000-0000-0000-0000-000000000001',
            valueText: 'Min Thant Ko',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
          {
            formFieldId: 'dc300000-0000-0000-0000-000000000002',
            valueText: '662115510',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
        ],
      },
      {
        id: 'ae300000-0000-0000-0000-000000000002',
        createdAt: new Date('2026-07-06T10:05:00.000Z'),
        fieldResponses: [
          {
            formFieldId: 'dc300000-0000-0000-0000-000000000001',
            valueText: 'Su Su',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
          {
            formFieldId: 'dc300000-0000-0000-0000-000000000002',
            valueText: '662115511',
            valueNumber: null,
            valueDate: null,
            valueArray: [],
          },
        ],
      },
    ]);

    const result = await service.getFormResponsesSummary(
      input.eventId,
      input.type,
    );
    // console.log('[UT-M047-03] Input :', input);
    // console.log('[UT-M047-03] Expected :', expected);
    // console.log('[UT-M047-03] Actual :', result);

    expect(result).toEqual(expected);
  });

  it('UT-M047-04: should return null as answer value for RATING field with no matching fieldResponse', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.FEEDBACK,
    };
    const expected = {
      formId: 'f3000000-0000-0000-0000-000000000001',
      totalResponses: 1,
      summary: [
        {
          formFieldId: 'dc300000-0000-0000-0000-000000000001',
          label: 'Rating',
          type: FieldType.RATING,
          answers: [
            {
              responseId: 'ae300000-0000-0000-0000-000000000001',
              createdAt: new Date('2026-07-06T10:00:00.000Z'),
              value: null,
            },
          ],
        },
      ],
    };
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f3000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc300000-0000-0000-0000-000000000001',
          type: FieldType.RATING,
          label: 'Rating',
          isRequired: false,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([
      {
        id: 'ae300000-0000-0000-0000-000000000001',
        createdAt: new Date('2026-07-06T10:00:00.000Z'),
        fieldResponses: [],
      },
    ]);

    const result = await service.getFormResponsesSummary(
      input.eventId,
      input.type,
    );

    // console.log('[UT-M047-04] Input :', input);
    // console.log('[UT-M047-04] Expected :', expected);
    // console.log('[UT-M047-04] Actual :', result);

    expect(result).toEqual(expected);
  });
});

describe('FormCrudService - mapToReturnFormWithFields', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-M048-01: should return fully mapped ReturnFormWithFields when full form object is provided', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: 'Register for the CMU Marathon 2026',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: ['Option A', 'Option B'],
          autoFillKey: 'firstName',
        },
      ],
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: 'Register for the CMU Marathon 2026',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: ['Option A', 'Option B'],
          autoFillKey: 'firstName',
        },
      ],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-01] Input :', input);
    // console.log('[UT-M048-01] Expected :', expected);
    // console.log('[UT-M048-01] Actual :', result);

    expect(result).toEqual(expected);
  });

  it('UT-M048-02: should return null for title and description when both are null', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: null,
      description: null,
      fields: [],
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: null,
      description: null,
      fields: [],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-02] Input :', input);
    // console.log('[UT-M048-02] Expected :', expected);
    // console.log('[UT-M048-02] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
  });

  it('UT-M048-03: should return empty fields array when form has no fields', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [],
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-03] Input :', input);
    // console.log('[UT-M048-03] Expected :', expected);
    // console.log('[UT-M048-03] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields).toEqual([]);
  });

  it('UT-M048-04: should return empty fields array when form.fields is not an array', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: null,
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-04] Input :', input);
    // console.log('[UT-M048-04] Expected :', expected);
    // console.log('[UT-M048-04] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields).toEqual([]);
  });

  it('UT-M048-05: should default options to [] when field.options is null', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: null,
          autoFillKey: null,
        },
      ],
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-05] Input :', input);
    // console.log('[UT-M048-05] Expected :', expected);
    // console.log('[UT-M048-05] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields[0].options).toEqual([]);
  });

  it('UT-M048-06: should default autoFillKey to null when field.autoFillKey is null', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-06] Input :', input);
    // console.log('[UT-M048-06] Expected :', expected);
    // console.log('[UT-M048-06] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields[0].autoFillKey).toBeNull();
  });

  it('UT-M048-07: should map multiple fields in correct order', () => {
    const input = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: 'firstName',
        },
        {
          id: 'dc100000-0000-0000-0000-000000000002',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Student ID',
          isRequired: true,
          order: 1,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc100000-0000-0000-0000-000000000003',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.CHOICE,
          label: 'T-Shirt Size',
          isRequired: false,
          order: 2,
          options: ['S', 'M', 'L', 'XL'],
          autoFillKey: null,
        },
      ],
    };
    const expected = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'CMU Marathon Registration',
      description: '',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: 'firstName',
        },
        {
          id: 'dc100000-0000-0000-0000-000000000002',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Student ID',
          isRequired: true,
          order: 1,
          options: [],
          autoFillKey: null,
        },
        {
          id: 'dc100000-0000-0000-0000-000000000003',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.CHOICE,
          label: 'T-Shirt Size',
          isRequired: false,
          order: 2,
          options: ['S', 'M', 'L', 'XL'],
          autoFillKey: null,
        },
      ],
    };

    const result = (service as any).mapToReturnFormWithFields(input);

    // console.log('[UT-M048-07] Input :', input);
    // console.log('[UT-M048-07] Expected :', expected);
    // console.log('[UT-M048-07] Actual :', result);

    expect(result).toEqual(expected);
    expect(result.fields).toHaveLength(3);
    expect(result.fields[0].label).toBe('Full Name');
    expect(result.fields[1].label).toBe('Student ID');
    expect(result.fields[2].label).toBe('T-Shirt Size');
  });
});

describe('FormCrudService - resolveFieldValue', () => {
  let service: FormCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormCrudService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormCrudService>(FormCrudService);
    jest.clearAllMocks();
  });

  it('UT-MX003-01: should return empty string when fieldResponse is null and fieldType is TEXT', () => {
    const input = { fieldResponse: null, fieldType: FieldType.TEXT };
    const expected = '';
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-01] Input :', input);
    // console.log('[UT-MX003-01] Expected :', expected);
    // console.log('[UT-MX003-01] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-02: should return empty string when fieldResponse is null and fieldType is TEXTAREA', () => {
    const input = { fieldResponse: null, fieldType: FieldType.TEXTAREA };
    const expected = '';
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-02] Input :', input);
    // console.log('[UT-MX003-02] Expected :', expected);
    // console.log('[UT-MX003-02] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-03: should return null when fieldResponse is null and fieldType is NUMBER', () => {
    const input = { fieldResponse: null, fieldType: FieldType.NUMBER };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-03] Input :', input);
    // console.log('[UT-MX003-03] Expected :', expected);
    // console.log('[UT-MX003-03] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-04: should return null when fieldResponse is null and fieldType is RATING', () => {
    const input = { fieldResponse: null, fieldType: FieldType.RATING };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-04] Input :', input);
    // console.log('[UT-MX003-04] Expected :', expected);
    // console.log('[UT-MX003-04] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-05: should return null when fieldResponse is null and fieldType is DATE', () => {
    const input = { fieldResponse: null, fieldType: FieldType.DATE };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-05] Input :', input);
    // console.log('[UT-MX003-05] Expected :', expected);
    // console.log('[UT-MX003-05] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-06: should return [] when fieldResponse is null and fieldType is CHOICE', () => {
    const input = { fieldResponse: null, fieldType: FieldType.CHOICE };
    const expected: string[] = [];
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-06] Input :', input);
    // console.log('[UT-MX003-06] Expected :', expected);
    // console.log('[UT-MX003-06] Actual :', result);
    expect(result).toEqual(expected);
  });

  it('UT-MX003-07: should return [] when fieldResponse is null and fieldType is CHECKBOX', () => {
    const input = { fieldResponse: null, fieldType: FieldType.CHECKBOX };
    const expected: string[] = [];
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-07] Input :', input);
    // console.log('[UT-MX003-07] Expected :', expected);
    // console.log('[UT-MX003-07] Actual :', result);
    expect(result).toEqual(expected);
  });

  it('UT-MX003-08: should return "" when fieldResponse is undefined and fieldType is TEXT', () => {
    const input = { fieldResponse: undefined, fieldType: FieldType.TEXT };
    const expected = '';
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-08] Input :', input);
    // console.log('[UT-MX003-08] Expected :', expected);
    // console.log('[UT-MX003-08] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-09: should return null when fieldResponse is undefined and fieldType is NUMBER', () => {
    const input = { fieldResponse: undefined, fieldType: FieldType.NUMBER };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-09] Input :', input);
    // console.log('[UT-MX003-09] Expected :', expected);
    // console.log('[UT-MX003-09] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-10: should return [] when fieldResponse is undefined and fieldType is CHOICE', () => {
    const input = { fieldResponse: undefined, fieldType: FieldType.CHOICE };
    const expected: string[] = [];
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-10] Input :', input);
    // console.log('[UT-MX003-10] Expected :', expected);
    // console.log('[UT-MX003-10] Actual :', result);
    expect(result).toEqual(expected);
  });

  it('UT-MX003-11: should return valueText when TEXT field has string value', () => {
    const input = {
      fieldResponse: {
        valueText: 'Min Thant Ko',
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.TEXT,
    };
    const expected = 'Min Thant Ko';
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-11] Input :', input);
    // console.log('[UT-MX003-11] Expected :', expected);
    // console.log('[UT-MX003-11] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-12: should return "" when TEXT field has null valueText', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.TEXT,
    };
    const expected = '';
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-12] Input :', input);
    // console.log('[UT-MX003-12] Expected :', expected);
    // console.log('[UT-MX003-12] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-13: should return "" when TEXTAREA field has null valueText', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.TEXTAREA,
    };
    const expected = '';
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-13] Input :', input);
    // console.log('[UT-MX003-13] Expected :', expected);
    // console.log('[UT-MX003-13] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-14: should call toNumber() and return 25 when NUMBER field has valueNumber present', () => {
    const toNumber = jest.fn().mockReturnValue(25);
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: { toNumber },
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.NUMBER,
    };
    const expected = 25;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-14] Input :', input);
    // console.log('[UT-MX003-14] Expected :', expected);
    // console.log('[UT-MX003-14] Actual :', result);
    expect(result).toBe(expected);
    expect(toNumber).toHaveBeenCalled();
  });

  it('UT-MX003-15: should return null when NUMBER field has null valueNumber', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.NUMBER,
    };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-15] Input :', input);
    // console.log('[UT-MX003-15] Expected :', expected);
    // console.log('[UT-MX003-15] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-16: should call toNumber() and return 4 when RATING field has valueNumber present', () => {
    const toNumber = jest.fn().mockReturnValue(4);
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: { toNumber },
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.RATING,
    };
    const expected = 4;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-16] Input :', input);
    // console.log('[UT-MX003-16] Expected :', expected);
    // console.log('[UT-MX003-16] Actual :', result);
    expect(result).toBe(expected);
    expect(toNumber).toHaveBeenCalled();
  });

  it('UT-MX003-17: should return null when RATING field has null valueNumber', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.RATING,
    };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-17] Input :', input);
    // console.log('[UT-MX003-17] Expected :', expected);
    // console.log('[UT-MX003-17] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-18: should return the Date object when DATE field has valid valueDate', () => {
    const mockDate = new Date('2026-12-01T00:00:00.000Z');
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: mockDate,
        valueArray: [],
      },
      fieldType: FieldType.DATE,
    };
    const expected = mockDate;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-18] Input :', input);
    // console.log('[UT-MX003-18] Expected :', expected);
    // console.log('[UT-MX003-18] Actual :', result);
    expect(result).toBe(expected);
  });

  it('UT-MX003-19: should return null when DATE field has null valueDate', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.DATE,
    };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-19] Input :', input);
    // console.log('[UT-MX003-19] Expected :', expected);
    // console.log('[UT-MX003-19] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-20: should return valueArray when CHOICE field has selected values', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: ['Vegetarian'],
      },
      fieldType: FieldType.CHOICE,
    };
    const expected = ['Vegetarian'];
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-20] Input :', input);
    // console.log('[UT-MX003-20] Expected :', expected);
    // console.log('[UT-MX003-20] Actual :', result);
    expect(result).toEqual(expected);
  });

  it('UT-MX003-21: should return [] when CHOICE field has empty valueArray', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: FieldType.CHOICE,
    };
    const expected: string[] = [];
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-21] Input :', input);
    // console.log('[UT-MX003-21] Expected :', expected);
    // console.log('[UT-MX003-21] Actual :', result);
    expect(result).toEqual(expected);
  });

  it('UT-MX003-22: should return valueArray when CHECKBOX field has multiple values', () => {
    const input = {
      fieldResponse: {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueArray: ['Sports', 'Music'],
      },
      fieldType: FieldType.CHECKBOX,
    };
    const expected = ['Sports', 'Music'];
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-22] Input :', input);
    // console.log('[UT-MX003-22] Expected :', expected);
    // console.log('[UT-MX003-22] Actual :', result);
    expect(result).toEqual(expected);
  });

  it('UT-MX003-23: should return null when fieldResponse is null and fieldType is unknown', () => {
    const input = { fieldResponse: null, fieldType: 'UNKNOWN' as FieldType };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-23] Input :', input);
    // console.log('[UT-MX003-23] Expected :', expected);
    // console.log('[UT-MX003-23] Actual :', result);
    expect(result).toBeNull();
  });

  it('UT-MX003-24: should return null when fieldResponse is present and fieldType is unknown', () => {
    const input = {
      fieldResponse: {
        valueText: 'some',
        valueNumber: null,
        valueDate: null,
        valueArray: [],
      },
      fieldType: 'UNKNOWN' as FieldType,
    };
    const expected = null;
    const result = (service as any).resolveFieldValue(
      input.fieldResponse,
      input.fieldType,
    );
    // console.log('[UT-MX003-24] Input :', input);
    // console.log('[UT-MX003-24] Expected :', expected);
    // console.log('[UT-MX003-24] Actual :', result);
    expect(result).toBeNull();
  });
});
