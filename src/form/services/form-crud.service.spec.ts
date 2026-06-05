import { Test, TestingModule } from '@nestjs/testing';
import { FieldType, FormType } from '@prisma/client';
import { FormCrudService } from './form-crud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';
import { SaveFormException } from '../exceptions/save-form.exception';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

const mockPrisma = {
  form: { create: jest.fn(), findUnique: jest.fn() },
  formResponse: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

// Transcation mock
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

  it('UT-M040-01: should return ReturnFormWithFields when dto is valid with fields', async () => {
    const formId = uuidv4();
    const formFieldId = uuidv4();
    const expectedForm = {
      id: formId,
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'Workshop Registration',
      description: 'Fill this form',
      fields: [
        {
          id: formFieldId,
          formId: formId,
          type: FieldType.TEXT,
          label: 'Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockPrisma.form.create.mockResolvedValue(expectedForm);

    const result = await service.createForm(
      'e1000000-0000-0000-0000-000000000001',
      FormType.REGISTRATION,
      {
        title: 'Workshop Registration',
        description: 'Fill this form',
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Name',
            isRequired: true,
            options: [],
          },
        ],
      },
    );

    expect(result).toEqual(expectedForm);
  });

  it('UT-M040-02: should create form with title "" and description "" when dto has no title or description', async () => {
    const formId = uuidv4();
    const formFieldId = uuidv4();
    const expectedForm = {
      id: formId,
      eventId: 'e1000000-0000-0000-0000-000000000001',
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
    mockPrisma.form.create.mockResolvedValue(expectedForm);

    const result = await service.createForm(
      'e1000000-0000-0000-0000-000000000001',
      FormType.FEEDBACK,
      {
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Comment',
            isRequired: false,
            options: [],
          },
        ],
      },
    );

    expect(result.title).toBe('');
    expect(result.description).toBe('');
  });

  it('UT-M040-03: should create form with no fields when dto has empty fields array', async () => {
    const formId = uuidv4();
    const expectedForm = {
      id: formId,
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'Empty Form',
      description: 'form with empty field',
      fields: [],
    };
    mockPrisma.form.create.mockResolvedValue(expectedForm);

    const result = await service.createForm(
      'e1000000-0000-0000-0000-000000000001',
      FormType.REGISTRATION,
      {
        title: 'Empty Form',
        description: 'form with empty field',
        fields: [],
      },
    );

    expect(result.fields).toEqual([]);
  });

  it('UT-M040-04: should throw SaveFormException with message when database is disconnected', async () => {
    mockPrisma.form.create.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );
    const result = service.createForm(
      'e1000000-0000-0000-0000-000000000001', 
      FormType.REGISTRATION,
      {
        fields: [
          { type: FieldType.TEXT, label: 'Name', isRequired: true, options: [] },
        ],
      });
    await expect(result).rejects.toThrow(SaveFormException);
    await expect(result).rejects.toThrow(
      'Failed to save form. Please try again.',
    );
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

  it('UT-M041-01: should return ReturnFormWithFields when form is found', async () => {
    const expectedForm = {
      id: 'f1000000-0000-0000-0000-000000000001',
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
      title: 'Workshop Registration',
      description: 'Fill this form',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          formId: 'f1000000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockPrisma.form.findUnique.mockResolvedValue(expectedForm);

    const result = await service.getFormByEventAndType(
      'e1000000-0000-0000-0000-000000000001',
      FormType.REGISTRATION,
    );

    expect(result).toEqual(expectedForm);
  });

  it('UT-M041-02: should throw FormNotFoundException with message when form is not found', async () => {
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    const result = service.getFormByEventAndType(
      'e1000000-0000-0000-0000-000000000003',
      FormType.FEEDBACK,
    );
    await expect(result).rejects.toThrow(FormNotFoundException);
    await expect(result).rejects.toThrow('Form not found.');
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

  it('UT-M046-01: should delete old fields, create new fields, and return updated form when dto has title, description, and fields', async () => {
    const updatedForm = {
      id: 'f2000000-0000-0000-0000-000000000002',
      eventId: 'e1000000-0000-0000-0000-000000000002',
      type: FormType.FEEDBACK,
      title: 'Updated Title',
      description: 'Updated Description',
      fields: [
        {
          id: 'dc200000-0000-0000-0000-000000000099',
          formId: 'f2000000-0000-0000-0000-000000000002',
          type: FieldType.TEXT,
          label: 'Student ID',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    };
    mockTx.form.update.mockResolvedValue(undefined);
    mockTx.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.formField.createMany.mockResolvedValue({ count: 1 });
    mockTx.form.findUnique.mockResolvedValue(updatedForm);

    const result = await service.updateFormByFormId(
      'f2000000-0000-0000-0000-000000000002',
      {
        title: 'Updated Title',
        description: 'Updated Description',
        fields: [
          {
            type: FieldType.TEXT,
            label: 'Student ID',
            isRequired: true,
            options: [],
          },
        ],
      },
    );

    expect(result).toEqual(updatedForm);
    expect(mockTx.formField.deleteMany).toHaveBeenCalled();
    expect(mockTx.formField.createMany).toHaveBeenCalled();
  });

  it('UT-M046-02: should update only title and leave fields unchanged when dto.fields is undefined', async () => {
    const updatedForm = { ...mockForm1(), title: 'New Title Only' };
    mockTx.form.update.mockResolvedValue(undefined);
    mockTx.form.findUnique.mockResolvedValue(updatedForm);

    const result = await service.updateFormByFormId(
      'f2000000-0000-0000-0000-000000000002',
      {
        title: 'New Title Only',
      },
    );

    expect(result.title).toBe('New Title Only');
    expect(result.fields).toEqual(mockForm1().fields);
    expect(mockTx.formField.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.formField.createMany).not.toHaveBeenCalled();
  });

  it('UT-M046-03: should call deleteMany and return form with no fields when dto.fields is empty array', async () => {
    const updatedForm = { ...mockForm1(), fields: [] };
    mockTx.form.update.mockResolvedValue(undefined);
    mockTx.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.formField.createMany.mockResolvedValue({ count: 0 });
    mockTx.form.findUnique.mockResolvedValue(updatedForm);

    const result = await service.updateFormByFormId(
      'f2000000-0000-0000-0000-000000000002',
      {
        fields: [],
      },
    );
    console.log('result:', result);

    expect(result.fields).toEqual([]);
    expect(mockTx.formField.deleteMany).toHaveBeenCalled();
    expect(mockTx.formField.createMany).toHaveBeenCalledWith({ data: [] });
  });

  it('UT-M046-04: should throw SaveFormException with message when database is disconnected', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(
      new Error('Transaction failed'),
    );
    const result = service.updateFormByFormId(
      'f1000000-0000-0000-0000-000000000001',
      { title: 'Title' },
    );
    await expect(result).rejects.toThrow(SaveFormException);
    await expect(result).rejects.toThrow(
      'Failed to save form. Please try again.',
    );
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

  it('UT-M050-01: should throw FormNotFoundException with message when form is not found', async () => {
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    const result = service.getFormResponses(
      'e1000000-0000-0000-0000-000000000009',
      FormType.REGISTRATION,
    );
    await expect(result).rejects.toThrow(FormNotFoundException);
    await expect(result).rejects.toThrow('Form not found.');
  });

  it('UT-M050-02: should return totalResponses 0 and empty responses array when form has no responses', async () => {
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f1000000-0000-0000-0000-000000000001',
      fields: [
        {
          id: 'dc100000-0000-0000-0000-000000000001',
          type: FieldType.TEXT,
          label: 'Name',
          isRequired: true,
          order: 0,
          options: [],
          autoFillKey: null,
        },
      ],
    });
    mockPrisma.formResponse.findMany.mockResolvedValue([]);

    const result = await service.getFormResponses(
      'e1000000-0000-0000-0000-000000000001',
      FormType.REGISTRATION,
    );

    expect(result.totalResponses).toBe(0);
    expect(result.responses).toEqual([]);
  });

  it('UT-M050-03: should return MockFormResponse1 when form has responses with all fields answered', async () => {
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

    const result = await service.getFormResponses(
      'e1000000-0000-0000-0000-000000000007',
      FormType.REGISTRATION,
    );

    expect(result).toEqual(mockFormResponse1());
  });

  it('UT-M050-04: should return type-appropriate default values for fields missing fieldResponse', async () => {
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

    const result = await service.getFormResponses(
      'e1000000-0000-0000-0000-000000000005',
      FormType.REGISTRATION,
    );

    expect(result).toEqual(mockFormResponse2());
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

  it('UT-M047-01: should throw FormNotFoundException with message when form is not found', async () => {
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    const result = service.getFormResponsesSummary(
      'e1000000-0000-0000-0000-000000000005',
      FormType.FEEDBACK,
    );
    await expect(result).rejects.toThrow(FormNotFoundException);
    await expect(result).rejects.toThrow('Form not found.');
  });

  it('UT-M047-02: should return totalResponses 0 and empty answers for each field when form has no responses', async () => {
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
      'e1000000-0000-0000-0000-000000000003',
      FormType.FEEDBACK,
    );

    expect(result.totalResponses).toBe(0);
    expect(result.summary[0].answers).toEqual([]);
  });

  it('UT-M047-03: should return MockFormResponseSummary1 when form has 2 responses', async () => {
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
      'e1000000-0000-0000-0000-000000000001',
      FormType.FEEDBACK,
    );

    expect(result).toEqual(mockFormResponseSummary1());
    // console.dir(result, { depth: null })
  });

  it('UT-M047-04: should return null as answer value for RATING field with no matching fieldResponse', async () => {
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

    const expectedSummary = {
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
    const result = await service.getFormResponsesSummary(
      'e1000000-0000-0000-0000-000000000001',
      FormType.FEEDBACK,
    );

    expect(result).toEqual(expectedSummary);
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

  it('UT-M039-01: should return "" when fieldResponse is null and fieldType is TEXT', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.TEXT);
    expect(result).toBe('');
  });

  it('UT-M039-02: should return "" when fieldResponse is null and fieldType is TEXTAREA', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.TEXTAREA);
    expect(result).toBe('');
  });

  it('UT-M039-03: should return null when fieldResponse is null and fieldType is NUMBER', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.NUMBER);
    expect(result).toBeNull();
  });

  it('UT-M039-04: should return null when fieldResponse is null and fieldType is RATING', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.RATING);
    expect(result).toBeNull();
  });

  it('UT-M039-05: should return null when fieldResponse is null and fieldType is DATE', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.DATE);
    expect(result).toBeNull();
  });

  it('UT-M039-06: should return [] when fieldResponse is null and fieldType is CHOICE', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.CHOICE);
    expect(result).toEqual([]);
  });

  it('UT-M039-07: should return [] when fieldResponse is null and fieldType is CHECKBOX', () => {
    const result = (service as any).resolveFieldValue(null, FieldType.CHECKBOX);
    expect(result).toEqual([]);
  });

  it('UT-M039-08: should return "" when fieldResponse is undefined and fieldType is TEXT', () => {
    const result = (service as any).resolveFieldValue(
      undefined,
      FieldType.TEXT,
    );
    expect(result).toBe('');
  });

  it('UT-M039-09: should return null when fieldResponse is undefined and fieldType is NUMBER', () => {
    const result = (service as any).resolveFieldValue(
      undefined,
      FieldType.NUMBER,
    );
    expect(result).toBeNull();
  });

  it('UT-M039-10: should return [] when fieldResponse is undefined and fieldType is CHOICE', () => {
    const result = (service as any).resolveFieldValue(
      undefined,
      FieldType.CHOICE,
    );
    expect(result).toEqual([]);
  });

  it('UT-M039-11: should return valueText when TEXT field has string value', () => {
    const fr = {
      valueText: 'Min Thant Ko',
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.TEXT);
    expect(result).toBe('Min Thant Ko');
  });

  it('UT-M039-12: should return "" when TEXT field has null valueText', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.TEXT);
    expect(result).toBe('');
  });

  it('UT-M039-13: should return "" when TEXTAREA field has null valueText', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.TEXTAREA);
    expect(result).toBe('');
  });

  it('UT-M039-14: should call toNumber() and return 25 when NUMBER field has valueNumber present', () => {
    const toNumber = jest.fn().mockReturnValue(25);
    const fr = {
      valueText: null,
      valueNumber: { toNumber },
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.NUMBER);
    expect(result).toBe(25);
    expect(toNumber).toHaveBeenCalled();
  });

  it('UT-M039-15: should return null when NUMBER field has null valueNumber', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.NUMBER);
    expect(result).toBeNull();
  });

  it('UT-M039-16: should call toNumber() and return 4 when RATING field has valueNumber present', () => {
    const toNumber = jest.fn().mockReturnValue(4);
    const fr = {
      valueText: null,
      valueNumber: { toNumber },
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.RATING);
    expect(result).toBe(4);
    expect(toNumber).toHaveBeenCalled();
  });

  it('UT-M039-17: should return null when RATING field has null valueNumber', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.RATING);
    expect(result).toBeNull();
  });

  it('UT-M039-18: should return the Date object when DATE field has valid valueDate', () => {
    const mockDate = new Date('2026-05-20T00:00:00.000Z');
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: mockDate,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.DATE);
    expect(result).toBe(mockDate);
  });

  it('UT-M039-19: should return null when DATE field has null valueDate', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.DATE);
    expect(result).toBeNull();
  });

  it('UT-M039-20: should return valueArray when CHOICE field has selected values', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: ['Vegetarian'],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.CHOICE);
    expect(result).toEqual(['Vegetarian']);
  });

  it('UT-M039-21: should return [] when CHOICE field has empty valueArray', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.CHOICE);
    expect(result).toEqual([]);
  });

  it('UT-M039-22: should return valueArray when CHECKBOX field has multiple values', () => {
    const fr = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueArray: ['Sports', 'Music'],
    };
    const result = (service as any).resolveFieldValue(fr, FieldType.CHECKBOX);
    expect(result).toEqual(['Sports', 'Music']);
  });

  it('UT-M039-23: should return null when fieldResponse is null and fieldType is unknown', () => {
    const result = (service as any).resolveFieldValue(
      null,
      'UNKNOWN' as FieldType,
    );
    expect(result).toBeNull();
  });

  it('UT-M039-24: should return null when fieldResponse is present and fieldType is unknown', () => {
    const fr = {
      valueText: 'some',
      valueNumber: null,
      valueDate: null,
      valueArray: [],
    };
    const result = (service as any).resolveFieldValue(
      fr,
      'UNKNOWN' as FieldType,
    );
    expect(result).toBeNull();
  });
});
