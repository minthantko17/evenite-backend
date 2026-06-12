import { isValidUrl } from '../../common/utils/url.utils';

describe('isValidUrl', () => {
  it('UT-M002-01: should return true for valid https URL', () => {
    expect(isValidUrl('https://www.cmu.ac.th')).toBe(true);
  });

  it('UT-M002-02: should return true for valid http URL', () => {
    expect(isValidUrl('http://www.cmu.ac.th')).toBe(true);
  });

  it('UT-M002-03: should return true for valid URL with path and query params', () => {
    expect(
      isValidUrl('https://maps.google.com/maps?q=chiang+mai+university'),
    ).toBe(true);
  });

  it('UT-M002-04: should return true for valid Google Maps short URL', () => {
    expect(isValidUrl('https://maps.app.goo.gl/6JUdAiaKkPuUUHEm9')).toBe(true);
  });

  it('UT-M002-05: should return true for valid URL with port number', () => {
    expect(isValidUrl('https://www.cmu.ac.th:8080')).toBe(true);
  });

  it('UT-M002-06: should return false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('UT-M002-07: should return false for plain text with no protocol', () => {
    expect(isValidUrl('this is not a url')).toBe(false);
  });

  it('UT-M002-08: should return false for missing protocol (without https://)', () => {
    expect(isValidUrl('www.cmu.ac.th')).toBe(false);
  });

  it('UT-M002-09: should return false for domain only with no protocol (without https://www.)', () => {
    expect(isValidUrl('google.com')).toBe(false);
  });

  it('UT-M002-10: should return false for only protocol with no domain', () => {
    expect(isValidUrl('https://')).toBe(false);
  });

  it('UT-M002-11: should return false for null input', () => {
    expect(isValidUrl(null as any)).toBe(false);
  });

  it('UT-M002-12: should return false for undefined input', () => {
    expect(isValidUrl(undefined as any)).toBe(false);
  });
});
