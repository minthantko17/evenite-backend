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

  it('UT-M031-01: should return ReturnFormWithFields when dto is valid with fields', async () => {
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
      {
        type: FormType.REGISTRATION,
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

  it('UT-M031-02: should create form with title "" and description "" when dto has no title or description', async () => {
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
      {
        type: FormType.FEEDBACK,
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

  it('UT-M031-03: should create form with no fields when dto has empty fields array', async () => {
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
      {
        type: FormType.REGISTRATION,
        title: 'Empty Form',
        description: 'form with empty field',
        fields: [],
      },
    );

    expect(result.fields).toEqual([]);
  });

  it('UT-M031-04: should throw SaveFormException with message when database is disconnected', async () => {
    mockPrisma.form.create.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );
    const result = service.createForm('e1000000-0000-0000-0000-000000000001', {
      type: FormType.REGISTRATION,
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

  it('UT-M032-01: should return ReturnFormWithFields when form is found', async () => {
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

  it('UT-M032-02: should throw FormNotFoundException with message when form is not found', async () => {
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    const result = service.getFormByEventAndType(
      'e1000000-0000-0000-0000-000000000003',
      FormType.FEEDBACK,
    );
    await expect(result).rejects.toThrow(FormNotFoundException);
    await expect(result).rejects.toThrow('Form not found.');
  });
});
