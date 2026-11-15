import { BadRequestException } from '@nestjs/common';

export function getStartOfToday(referenceDate: Date = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );
}

export interface ValidateActivationDateRangeOptions {
  startDate?: Date | null;
  endDate?: Date | null;
  requireNotBeforeTodayOnStart?: boolean;
  requireNotBeforeTodayOnEnd?: boolean;
  isActivating?: boolean;
  referenceDate?: Date;
}

export function validateActivationDateRange({
  startDate,
  endDate,
  requireNotBeforeTodayOnStart = false,
  requireNotBeforeTodayOnEnd = false,
  isActivating = false,
  referenceDate,
}: ValidateActivationDateRangeOptions): void {
  const startOfToday = getStartOfToday(referenceDate);

  if (startDate !== undefined && startDate !== null) {
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida.');
    }
    if (requireNotBeforeTodayOnStart && startDate.getTime() < startOfToday.getTime()) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser anterior al día de hoy.',
      );
    }
  }

  if (endDate !== undefined && endDate !== null) {
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('La fecha de fin no es válida.');
    }
    if (
      (requireNotBeforeTodayOnEnd || isActivating) &&
      endDate.getTime() < startOfToday.getTime()
    ) {
      throw new BadRequestException(
        'La fecha de fin no puede ser anterior al día de hoy.',
      );
    }
  }

  if (
    startDate !== undefined &&
    startDate !== null &&
    endDate !== undefined &&
    endDate !== null &&
    endDate.getTime() <= startDate.getTime()
  ) {
    throw new BadRequestException(
      'La fecha de fin debe ser posterior a la fecha de inicio.',
    );
  }
}
