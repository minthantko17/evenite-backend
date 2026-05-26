import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FieldType, FormType, EventStatus } from '@prisma/client';
import { FormValidationService } from './form-validation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FormAlreadyExistsException } from '../exceptions/form-already-exists.exception';
import { FormAlreadyHasResponsesException } from '../exceptions/form-already-has-responses.exception';
import { FormFieldInvalidException } from '../exceptions/form-field-invalid.exception';
import { FormLockedException } from '../exceptions/form-locked.exception';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';

const mockPrisma = {
  event: { findUnique: jest.fn() },
  form: { findUnique: jest.fn() },
  formResponse: { count: jest.fn() },
};

describe('FormValidationService - validateEventExists', () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormValidationService>(FormValidationService);
    jest.clearAllMocks();
  });

  it('UT-M027-01: should resolve without throwing when event exists', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({
      id: 'e1000000-0000-0000-0000-000000000001',
    });
    const result = service.validateEventExists(
      'e1000000-0000-0000-0000-000000000001',
    );
    await expect(result).resolves.toBeUndefined();
    await expect(() => result).not.toThrow();
  });

  it('UT-M027-02: should throw NotFoundException with message when event not found', async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce(null);
    const result = service.validateEventExists(
      'e9999999-9999-9999-9999-999999999999',
    );
    await expect(result).rejects.toThrow(NotFoundException);
    await expect(result).rejects.toThrow('Event not found.');
  });
});

describe('FormValidationService - validateFormTypeNotDuplicated', () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormValidationService>(FormValidationService);
    jest.clearAllMocks();
  });

  it('UT-M028-01: should resolve without throwing when REGISTRATION form does not yet exist', async () => {
    mockPrisma.form.findUnique.mockResolvedValue(null);
    const result = service.validateFormTypeNotDuplicated(
      'e1000000-0000-0000-0000-000000000001',
      FormType.REGISTRATION,
    );
    await expect(result).resolves.toBeUndefined();
  });

  it('UT-M028-02: should throw FormAlreadyExistsException with message when REGISTRATION form already exists', async () => {
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f1000000-0000-0000-0000-000000000001',
      type: 'REGISTRATION',
    });
    const result = service.validateFormTypeNotDuplicated(
      'e1000000-0000-0000-0000-000000000001',
      FormType.REGISTRATION,
    );
    await expect(result).rejects.toThrow(FormAlreadyExistsException);
    await expect(result).rejects.toThrow(
      'A form of this type already exists for this event.',
    );
  });

  it('UT-M028-03: should throw FormAlreadyExistsException with message when FEEDBACK form already exists', async () => {
    mockPrisma.form.findUnique.mockResolvedValue({
      id: 'f2000000-0000-0000-0000-000000000002',
      type: 'FEEDBACK',
    });
    const result = service.validateFormTypeNotDuplicated(
      'e2000000-0000-0000-0000-000000000002',
      FormType.FEEDBACK,
    );
    await expect(result).rejects.toThrow(FormAlreadyExistsException);
    await expect(result).rejects.toThrow(
      'A form of this type already exists for this event.',
    );
  });
});

describe('FormValidationService - validateFormFields', () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormValidationService>(FormValidationService);
    jest.clearAllMocks();
  });

  it('UT-M029-01: should resolve without throwing when fields array is empty', () => {
    expect(() => service.validateFormFields([])).not.toThrow();
  });

  it('UT-M029-02: should resolve without throwing when TEXT field is valid', () => {
    expect(() =>
      service.validateFormFields([
        {
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          options: [],
        },
      ]),
    ).not.toThrow();
  });

  it('UT-M029-03: should resolve without throwing when CHOICE field has exactly 2 options', () => {
    expect(() =>
      service.validateFormFields([
        {
          type: FieldType.CHOICE,
          label: 'Gender',
          isRequired: false,
          options: ['Male', 'Female'],
        },
      ]),
    ).not.toThrow();
  });

  it('UT-M029-04: should resolve without throwing when CHECKBOX field has exactly 2 options', () => {
    expect(() =>
      service.validateFormFields([
        {
          type: FieldType.CHECKBOX,
          label: 'Interests',
          isRequired: false,
          options: ['Sports', 'Music'],
        },
      ]),
    ).not.toThrow();
  });

  it('UT-M029-05: should resolve without throwing when NUMBER, RATING, TEXTAREA, DATE fields have no options', () => {
    expect(() =>
      service.validateFormFields([
        {
          type: FieldType.NUMBER,
          label: 'Age',
          isRequired: false,
          options: [],
        },
        {
          type: FieldType.RATING,
          label: 'Score',
          isRequired: false,
          options: [],
        },
        {
          type: FieldType.TEXTAREA,
          label: 'Comment',
          isRequired: false,
          options: [],
        },
        { type: FieldType.DATE, label: 'DOB', isRequired: false, options: [] },
      ]),
    ).not.toThrow();
  });

  it('UT-M029-06: should throw FormFieldInvalidException with message when field has empty string label', () => {
    const call = () =>
      service.validateFormFields([
        { type: FieldType.TEXT, label: '', isRequired: false, options: [] },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow('Field at index 0: label is required.');
  });

  it('UT-M029-07: should throw FormFieldInvalidException with message when field has whitespace-only label', () => {
    const call = () =>
      service.validateFormFields([
        { type: FieldType.TEXT, label: '   ', isRequired: false, options: [] },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow('Field at index 0: label is required.');
  });

  it('UT-M029-08: should throw FormFieldInvalidException with message when field has null label', () => {
    const call = () =>
      service.validateFormFields([
        {
          type: FieldType.TEXT,
          label: null as any,
          isRequired: false,
          options: [],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow('Field at index 0: label is required.');
  });

  it('UT-M029-09: should throw FormFieldInvalidException with message when CHOICE field has 0 options', () => {
    const call = () =>
      service.validateFormFields([
        {
          type: FieldType.CHOICE,
          label: 'Preference',
          isRequired: false,
          options: [],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow(
      'Field at index 0: at least two options are required for CHOICE type.',
    );
  });

  it('UT-M029-10: should throw FormFieldInvalidException with message when CHOICE field has exactly 1 option', () => {
    const call = () =>
      service.validateFormFields([
        {
          type: FieldType.CHOICE,
          label: 'Preference',
          isRequired: false,
          options: ['Option A'],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow(
      'Field at index 0: at least two options are required for CHOICE type.',
    );
  });

  it('UT-M029-11: should throw FormFieldInvalidException with message when CHECKBOX field has 0 options', () => {
    const call = () =>
      service.validateFormFields([
        {
          type: FieldType.CHECKBOX,
          label: 'Topics',
          isRequired: false,
          options: [],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow(
      'Field at index 0: at least two options are required for CHECKBOX type.',
    );
  });

  it('UT-M029-12: should throw FormFieldInvalidException with message when CHECKBOX field has exactly 1 option', () => {
    const call = () =>
      service.validateFormFields([
        {
          type: FieldType.CHECKBOX,
          label: 'Topics',
          isRequired: false,
          options: ['Topic A'],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow(
      'Field at index 0: at least two options are required for CHECKBOX type.',
    );
  });

  it('UT-M029-13: should throw FormFieldInvalidException at index 0 when first of multiple fields has empty label', () => {
    const call = () =>
      service.validateFormFields([
        { type: FieldType.TEXT, label: '', isRequired: false, options: [] },
        {
          type: FieldType.TEXT,
          label: 'Email',
          isRequired: false,
          options: [],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow('Field at index 0: label is required.');
  });

  it('UT-M029-14: should throw FormFieldInvalidException at index 1 when second of multiple fields has invalid options', () => {
    const call = () =>
      service.validateFormFields([
        { type: FieldType.TEXT, label: 'Name', isRequired: false, options: [] },
        {
          type: FieldType.CHOICE,
          label: 'Diet',
          isRequired: false,
          options: ['Vegan'],
        },
      ]);
    expect(call).toThrow(FormFieldInvalidException);
    expect(call).toThrow(
      'Field at index 1: at least two options are required for CHOICE type.',
    );
  });
});

describe('FormValidationService - validateFormNotLocked', () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormValidationService>(FormValidationService);
    jest.clearAllMocks();
  });

  it('UT-M034-01: should throw FormNotFoundException with message when form not found', async () => {
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    const result = service.validateFormNotLocked(
      'f9999999-9999-9999-9999-999999999999',
    );
    await expect(result).rejects.toThrow(FormNotFoundException);
    await expect(result).rejects.toThrow('Form not found.');
  });

  it('UT-M034-02: should resolve without throwing when event status is DRAFT', async () => {
    mockPrisma.form.findUnique.mockResolvedValue({
      event: { status: EventStatus.DRAFT },
    });
    const result = service.validateFormNotLocked(
      'f1000000-0000-0000-0000-000000000001',
    );
    await expect(result).resolves.toBeUndefined();
    await expect(() => result).not.toThrow();
  });

  it('UT-M034-03: should throw FormLockedException with message when event status is PUBLISHED', async () => {
    mockPrisma.form.findUnique.mockResolvedValue({
      event: { status: EventStatus.PUBLISHED },
    });
    const result = service.validateFormNotLocked(
      'f1000000-0000-0000-0000-000000000001',
    );
    await expect(result).rejects.toThrow(FormLockedException);
    await expect(result).rejects.toThrow(
      'Form can only be edited while the event is in draft state.',
    );
  });
});

describe('FormValidationService - validateNoResponsesExist', () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FormValidationService>(FormValidationService);
    jest.clearAllMocks();
  });

  it('UT-M035-01: should resolve without throwing when no responses exist', async () => {
    mockPrisma.formResponse.count.mockResolvedValue(0);
    const result = service.validateNoResponsesExist(
      'f1000000-0000-0000-0000-000000000001',
    );
    await expect(result).resolves.toBeUndefined();
    await expect(() => result).not.toThrow();
  });

  it('UT-M035-02: should throw FormAlreadyHasResponsesException with message when exactly 1 response exists', async () => {
    mockPrisma.formResponse.count.mockResolvedValueOnce(1);
    const result = service.validateNoResponsesExist(
      'f1000000-0000-0000-0000-000000000002',
    );
    await expect(result).rejects.toThrow(FormAlreadyHasResponsesException);
    await expect(result).rejects.toThrow(
      'Form cannot be updated because it has existing responses.',
    );
  });

  it('UT-M035-03: should throw FormAlreadyHasResponsesException with message when multiple responses exist', async () => {
    mockPrisma.formResponse.count.mockResolvedValueOnce(5);
    const result = service.validateNoResponsesExist(
      'f2000000-0000-0000-0000-000000000002',
    );
    await expect(result).rejects.toThrow(FormAlreadyHasResponsesException);
    await expect(result).rejects.toThrow(
      'Form cannot be updated because it has existing responses.',
    );
  });
});
