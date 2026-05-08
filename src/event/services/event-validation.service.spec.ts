import { EventValidationService } from './event-validation.service';
import { InvalidPromptException } from '../exceptions/invalid-prompt.exception';

describe('EventValidationService - validatePromptText', () => {
  let service: EventValidationService;

  beforeEach(() => {
    service = new EventValidationService();
  });

  it('UT-M001-01: should not throw for valid English prompt', () => {
    expect(() =>
      service.validatePromptText('Workshop on Machine Learning'),
    ).not.toThrow();
  });

  it('UT-M001-02: should not throw for valid Thai prompt', () => {
    expect(() =>
      service.validatePromptText('งานกีฬาสี มหาวิทยาลัยเชียงใหม่'),
    ).not.toThrow();
  });

  it('UT-M001-03: should not throw for valid mixed Thai and English prompt', () => {
    expect(() =>
      service.validatePromptText('CAMT วิศวกรรมซอฟต์แวร์ Workshop'),
    ).not.toThrow();
  });

  it('UT-M001-04: should not throw for valid prompt mixed with symbols', () => {
    expect(() =>
      service.validatePromptText('!!! CAMT Halloween Night 2026 @@@'),
    ).not.toThrow();
  });

  it('UT-M001-05: should not throw for numbers only', () => {
    expect(() => service.validatePromptText('12345')).not.toThrow();
  });

  it('UT-M001-06: should not throw for whitespace padded valid prompt', () => {
    expect(() =>
      service.validatePromptText('   CAMT Study Trip   '),
    ).not.toThrow();
  });

  it('UT-M001-07: should throw InvalidPromptException for empty string', () => {
    expect(() => service.validatePromptText('')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('')).toThrow(
      "Prompt field can't be empty",
    );
  });

  it('UT-M001-08: should throw InvalidPromptException for whitespace only', () => {
    expect(() => service.validatePromptText('     ')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('     ')).toThrow(
      "Prompt field can't be empty",
    );
  });

  it('UT-M001-09: should throw InvalidPromptException for symbols only', () => {
    expect(() => service.validatePromptText('@#$%^&*!')).toThrow(
      InvalidPromptException,
    );
    expect(() => service.validatePromptText('@#$%^&*!')).toThrow(
      'Invalid Input',
    );
  });
});
