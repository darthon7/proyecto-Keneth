import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { getStartOfToday, validateActivationDateRange } from './date-validation.util.js';

describe('validateActivationDateRange', () => {
  const reference = new Date(2026, 10, 14, 15, 30, 0);

  it('calcula correctamente el inicio del día actual', () => {
    const startOfToday = getStartOfToday(reference);
    expect(startOfToday.getFullYear()).toBe(2026);
    expect(startOfToday.getMonth()).toBe(10);
    expect(startOfToday.getDate()).toBe(14);
    expect(startOfToday.getHours()).toBe(0);
    expect(startOfToday.getMinutes()).toBe(0);
  });

  it('rechaza fechas de inicio anteriores al día de hoy cuando se exige', () => {
    expect(() =>
      validateActivationDateRange({
        startDate: new Date(2026, 10, 13, 23, 59, 0),
        endDate: new Date(2026, 10, 15, 10, 0, 0),
        requireNotBeforeTodayOnStart: true,
        requireNotBeforeTodayOnEnd: true,
        referenceDate: reference,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza fechas de fin anteriores al día de hoy al activar o exigir fin vigente', () => {
    expect(() =>
      validateActivationDateRange({
        startDate: new Date(2026, 10, 10, 10, 0, 0),
        endDate: new Date(2026, 10, 13, 23, 59, 0),
        isActivating: true,
        referenceDate: reference,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza cuando la fecha de fin es igual o anterior a la fecha de inicio', () => {
    expect(() =>
      validateActivationDateRange({
        startDate: new Date(2026, 10, 14, 18, 0, 0),
        endDate: new Date(2026, 10, 14, 12, 0, 0),
        requireNotBeforeTodayOnStart: true,
        requireNotBeforeTodayOnEnd: true,
        referenceDate: reference,
      }),
    ).toThrow(BadRequestException);
  });

  it('acepta fechas del mismo día de hoy cuando endDate es posterior a startDate', () => {
    expect(() =>
      validateActivationDateRange({
        startDate: new Date(2026, 10, 14, 0, 0, 0),
        endDate: new Date(2026, 10, 14, 23, 59, 0),
        requireNotBeforeTodayOnStart: true,
        requireNotBeforeTodayOnEnd: true,
        isActivating: true,
        referenceDate: reference,
      }),
    ).not.toThrow();
  });
});
