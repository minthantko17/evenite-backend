import { Test, TestingModule } from '@nestjs/testing';
import { FieldType, FormType, EventStatus } from '@prisma/client';
import { FormValidationService } from './form-validation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FormAlreadyExistsException } from '../exceptions/form-already-exists.exception';
import { FormAlreadyHasResponsesException } from '../exceptions/form-already-has-responses.exception';
import { FormFieldInvalidException } from '../exceptions/form-field-invalid.exception';
import { FormLockedException } from '../exceptions/form-locked.exception';
import { FormNotFoundException } from '../exceptions/form-not-found.exception';

const mockPrisma = {
  form: { findUnique: jest.fn() },
  formResponse: { count: jest.fn() },
};

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

  it('UT-3-001-01: should resolve without throwing when REGISTRATION form does not yet exist', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
    };
    mockPrisma.form.findUnique.mockResolvedValue(null);

    const result = service.validateFormTypeNotDuplicated(
      input.eventId,
      input.type,
    );

    // console.log('[UT-3-001-01] Input :', input);
    // console.log('[UT-3-001-01] Expected : resolves undefined');
    // console.log('[UT-3-001-01] Actual :', result);

    await expect(result).resolves.toBeUndefined();
    expect(mockPrisma.form.findUnique).toHaveBeenCalledWith({
      where: { eventId_type: { eventId: input.eventId, type: input.type } },
    });
    expect(mockPrisma.form.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-3-001-02: should throw FormAlreadyExistsException when REGISTRATION form already exists', async () => {
    const input = {
      eventId: 'e1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
    };
    const mockFoundForm = {
      id: 'f1000000-0000-0000-0000-000000000001',
      type: FormType.REGISTRATION,
    };
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);

    await expect(
      service.validateFormTypeNotDuplicated(input.eventId, input.type),
    ).rejects.toThrow(FormAlreadyExistsException);
    await expect(
      service.validateFormTypeNotDuplicated(input.eventId, input.type),
    ).rejects.toThrow('A form of this type already exists for this event.');
  });

  it('UT-3-001-03: should throw FormAlreadyExistsException when FEEDBACK form already exists', async () => {
    const input = {
      eventId: 'e2000000-0000-0000-0000-000000000002',
      type: FormType.FEEDBACK,
    };
    const mockFoundForm = {
      id: 'f2000000-0000-0000-0000-000000000002',
      type: FormType.FEEDBACK,
    };
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);

    await expect(
      service.validateFormTypeNotDuplicated(input.eventId, input.type),
    ).rejects.toThrow(FormAlreadyExistsException);
    await expect(
      service.validateFormTypeNotDuplicated(input.eventId, input.type),
    ).rejects.toThrow('A form of this type already exists for this event.');
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

  it('UT-3-002-01: should resolve without throwing when event status is DRAFT', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000001' };
    const mockFoundForm = { event: { status: EventStatus.DRAFT } };
    mockPrisma.form.findUnique.mockResolvedValue(mockFoundForm);

    const result = service.validateFormNotLocked(input.formId);
    // console.log('[UT-3-002-01] Input :', input);
    // console.log('[UT-3-002-01] Expected : resolves undefined');
    // console.log('[UT-3-002-01] Actual :', result);

    await expect(result).resolves.toBeUndefined();
    expect(mockPrisma.form.findUnique).toHaveBeenCalledWith({
      where: { id: input.formId },
      select: { event: { select: { status: true } } },
    });
    expect(mockPrisma.form.findUnique).toHaveBeenCalledTimes(1);
  });

  it('UT-3-002-02: should throw FormNotFoundException when form not found', async () => {
    const input = { formId: 'f9999999-9999-9999-9999-999999999999' };
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);
    mockPrisma.form.findUnique.mockResolvedValueOnce(null);

    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      FormNotFoundException,
    );
    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      'Form not found.',
    );
  });

  it('UT-3-002-03: should throw FormLockedException when event status is PUBLISHED', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000001' };
    const mockFoundForm = { event: { status: EventStatus.PUBLISHED } };
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);

    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      FormLockedException,
    );
    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      'Form can only be edited while the event is in draft state.',
    );
  });

  it('UT-3-002-04: should throw FormLockedException when event status is ONGOING', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000001' };
    const mockFoundForm = { event: { status: EventStatus.ONGOING } };
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);

    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      FormLockedException,
    );
  });

  it('UT-3-002-05: should throw FormLockedException when event status is CONCLUDED', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000001' };
    const mockFoundForm = { event: { status: EventStatus.CONCLUDED } };
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);

    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      FormLockedException,
    );
  });

  it('UT-3-002-06: should throw FormLockedException when event status is CANCELLED', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000001' };
    const mockFoundForm = { event: { status: EventStatus.CANCELLED } };
    mockPrisma.form.findUnique.mockResolvedValueOnce(mockFoundForm);

    await expect(service.validateFormNotLocked(input.formId)).rejects.toThrow(
      FormLockedException,
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

  it('UT-3-003-01: should resolve without throwing when no responses exist', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000001' };
    mockPrisma.formResponse.count.mockResolvedValue(0);

    const result = service.validateNoResponsesExist(input.formId);

    // console.log('[UT-3-003-01] Input :', input);
    // console.log('[UT-3-003-01] Expected : resolves undefined');
    // console.log('[UT-3-003-01] Actual :', result);

    await expect(result).resolves.toBeUndefined();
    expect(mockPrisma.formResponse.count).toHaveBeenCalledWith({
      where: { formId: input.formId },
    });
    expect(mockPrisma.formResponse.count).toHaveBeenCalledTimes(1);
  });

  it('UT-3-003-02: should throw FormAlreadyHasResponsesException when exactly 1 response exists', async () => {
    const input = { formId: 'f1000000-0000-0000-0000-000000000002' };
    mockPrisma.formResponse.count.mockResolvedValueOnce(1);
    mockPrisma.formResponse.count.mockResolvedValueOnce(1);

    await expect(
      service.validateNoResponsesExist(input.formId),
    ).rejects.toThrow(FormAlreadyHasResponsesException);
    await expect(
      service.validateNoResponsesExist(input.formId),
    ).rejects.toThrow(
      'Form cannot be updated because it has existing responses.',
    );
  });

  it('UT-3-003-03: should throw FormAlreadyHasResponsesException when multiple responses exist', async () => {
    const input = { formId: 'f2000000-0000-0000-0000-000000000002' };
    mockPrisma.formResponse.count.mockResolvedValueOnce(5);

    await expect(
      service.validateNoResponsesExist(input.formId),
    ).rejects.toThrow(FormAlreadyHasResponsesException);
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

  it('UT-3-004-01: should not throw when fields array is empty', () => {
    const input = { fields: [] };
    // console.log('[UT-3-004-01] Input :', input);
    // console.log('[UT-3-004-01] Expected : no throw');
    expect(() => service.validateFormFields(input.fields)).not.toThrow();
  });

  it('UT-3-004-02: should not throw when TEXT field is valid', () => {
    const input = {
      fields: [
        {
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: true,
          options: [],
        },
      ],
    };
    // console.log('[UT-3-004-02] Input :', input);
    // console.log('[UT-3-004-02] Expected : no throw');
    expect(() => service.validateFormFields(input.fields)).not.toThrow();
  });

  it('UT-3-004-03: should not throw when CHOICE field has exactly 2 options', () => {
    const input = {
      fields: [
        {
          type: FieldType.CHOICE,
          label: 'T-Shirt Size',
          isRequired: false,
          options: ['S', 'M'],
        },
      ],
    };
    // console.log('[UT-3-004-03] Input :', input);
    // console.log('[UT-3-004-03] Expected : no throw');
    expect(() => service.validateFormFields(input.fields)).not.toThrow();
  });

  it('UT-3-004-04: should not throw when CHECKBOX field has exactly 2 options', () => {
    const input = {
      fields: [
        {
          type: FieldType.CHECKBOX,
          label: 'Interests',
          isRequired: false,
          options: ['Sports', 'Music'],
        },
      ],
    };
    // console.log('[UT-3-004-04] Input :', input);
    // console.log('[UT-3-004-04] Expected : no throw');
    expect(() => service.validateFormFields(input.fields)).not.toThrow();
  });

  it('UT-3-004-05: should not throw when NUMBER, RATING, TEXTAREA, DATE fields have no options', () => {
    const input = {
      fields: [
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
      ],
    };
    // console.log('[UT-3-004-05] Input :', input);
    // console.log('[UT-3-004-05] Expected : no throw');
    expect(() => service.validateFormFields(input.fields)).not.toThrow();
  });

  it('UT-3-004-06: should throw FormFieldInvalidException when field has empty string label', () => {
    const input = {
      fields: [
        { type: FieldType.TEXT, label: '', isRequired: false, options: [] },
      ],
    };
    const expectedMessage = 'Field at index 0: label is required.';
    // console.log('[UT-3-004-06] Input :', input);
    // console.log('[UT-3-004-06] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-07: should throw FormFieldInvalidException when field has whitespace-only label', () => {
    const input = {
      fields: [
        { type: FieldType.TEXT, label: '   ', isRequired: false, options: [] },
      ],
    };
    const expectedMessage = 'Field at index 0: label is required.';
    // console.log('[UT-3-004-07] Input :', input);
    // console.log('[UT-3-004-07] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-08: should throw FormFieldInvalidException when field has null label', () => {
    const input = {
      fields: [
        {
          type: FieldType.TEXT,
          label: null as any,
          isRequired: false,
          options: [],
        },
      ],
    };
    const expectedMessage = 'Field at index 0: label is required.';
    // console.log('[UT-3-004-08] Input :', input);
    // console.log('[UT-3-004-08] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-09: should throw FormFieldInvalidException when CHOICE field has 0 options', () => {
    const input = {
      fields: [
        {
          type: FieldType.CHOICE,
          label: 'Preference',
          isRequired: false,
          options: [],
        },
      ],
    };
    const expectedMessage =
      'Field at index 0: at least two options are required for CHOICE type.';
    // console.log('[UT-3-004-09] Input :', input);
    // console.log('[UT-3-004-09] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-10: should throw FormFieldInvalidException when CHOICE field has exactly 1 option', () => {
    const input = {
      fields: [
        {
          type: FieldType.CHOICE,
          label: 'Preference',
          isRequired: false,
          options: ['Option A'],
        },
      ],
    };
    const expectedMessage =
      'Field at index 0: at least two options are required for CHOICE type.';
    // console.log('[UT-3-004-10] Input :', input);
    // console.log('[UT-3-004-10] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-11: should throw FormFieldInvalidException when CHECKBOX field has 0 options', () => {
    const input = {
      fields: [
        {
          type: FieldType.CHECKBOX,
          label: 'Topics',
          isRequired: false,
          options: [],
        },
      ],
    };
    const expectedMessage =
      'Field at index 0: at least two options are required for CHECKBOX type.';
    // console.log('[UT-3-004-11] Input :', input);
    // console.log('[UT-3-004-11] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-12: should throw FormFieldInvalidException when CHECKBOX field has exactly 1 option', () => {
    const input = {
      fields: [
        {
          type: FieldType.CHECKBOX,
          label: 'Topics',
          isRequired: false,
          options: ['Topic A'],
        },
      ],
    };
    const expectedMessage =
      'Field at index 0: at least two options are required for CHECKBOX type.';
    // console.log('[UT-3-004-12] Input :', input);
    // console.log('[UT-3-004-12] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-13: should throw FormFieldInvalidException at index 0 when first of multiple fields has empty label', () => {
    const input = {
      fields: [
        { type: FieldType.TEXT, label: '', isRequired: false, options: [] },
        {
          type: FieldType.TEXT,
          label: 'Email',
          isRequired: false,
          options: [],
        },
      ],
    };
    const expectedMessage = 'Field at index 0: label is required.';
    // console.log('[UT-3-004-13] Input :', input);
    // console.log('[UT-3-004-13] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-14: should throw FormFieldInvalidException at index 1 when second field has invalid options', () => {
    const input = {
      fields: [
        {
          type: FieldType.TEXT,
          label: 'Full Name',
          isRequired: false,
          options: [],
        },
        {
          type: FieldType.CHOICE,
          label: 'Diet',
          isRequired: false,
          options: ['Vegan'],
        },
      ],
    };
    const expectedMessage =
      'Field at index 1: at least two options are required for CHOICE type.';
    // console.log('[UT-3-004-14] Input :', input);
    // console.log('[UT-3-004-14] Expected :', expectedMessage);
    expect(() => service.validateFormFields(input.fields)).toThrow(
      FormFieldInvalidException,
    );
    expect(() => service.validateFormFields(input.fields)).toThrow(
      expectedMessage,
    );
  });

  it('UT-3-004-15: should not throw when field type is an unrecognized value', () => {
    const input = {
      fields: [
        {
          type: 'NONVALIDTYPE' as any,
          label: 'Nonvalid Field',
          isRequired: false,
          options: [],
        },
      ],
    };
    // console.log('[UT-3-004-15] Input :', input);
    // console.log('[UT-3-004-15] Expected : no throw');
    expect(() => service.validateFormFields(input.fields)).not.toThrow();
  });
});
