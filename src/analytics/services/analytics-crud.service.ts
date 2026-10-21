import { Injectable } from '@nestjs/common';
import { CheckInMethod, FormType, RegistrationStatus } from '@prisma/client';
import {
  FieldStatsField,
  FieldStatsRow,
} from '../utils/analytics-field-stats.utils';
import { PrismaService } from '../../prisma/prisma.service';

// Timeline ranges are half-open [timelineStart, timelineEnd), see startOfLastBucket in analytics.utils.
// The two activity streams shown on timelines. Only plain timestamps are read;
// bucketing happens in analytics.utils so the time zone logic lives in one place.
@Injectable()
export class AnalyticsCrudService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewCounts(
    eventId: string,
  ): Promise<{ registered: number; cancelled: number; checkedIn: number }> {
    const [registered, cancelled, checkedIn] = await Promise.all([
      this.prisma.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.CONFIRMED },
      }),
      this.prisma.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.CANCELLED },
      }),
      this.prisma.attendance.count({ where: { eventId } }),
    ]);
    return { registered, cancelled, checkedIn };
  }

  async getCheckInMethodCounts(
    eventId: string,
  ): Promise<Record<CheckInMethod, number>> {
    const groups = await this.prisma.attendance.groupBy({
      by: ['method'],
      where: { eventId },
      _count: { _all: true },
    });
    const counts: Record<CheckInMethod, number> = {
      [CheckInMethod.QR_SCAN]: 0,
      [CheckInMethod.MANUAL]: 0,
    };
    for (const group of groups) {
      counts[group.method] = group._count._all;
    }
    return counts;
  }

  // Registration activity = CONFIRMED registrations by createdAt.
  // (cancelled ones have no cancellation timestamp, so they simply drop out)

  async getRegistrationTimestamps(
    eventId: string,
    from: Date,
    to: Date,
  ): Promise<Date[]> {
    const rows = await this.prisma.eventRegistration.findMany({
      where: {
        eventId,
        status: RegistrationStatus.CONFIRMED,
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt);
  }

  countRegistrationsBefore(eventId: string, before: Date): Promise<number> {
    return this.prisma.eventRegistration.count({
      where: {
        eventId,
        status: RegistrationStatus.CONFIRMED,
        createdAt: { lt: before },
      },
    });
  }

  async findEarliestRegistration(
    eventId: string,
    to: Date,
  ): Promise<Date | null> {
    const result = await this.prisma.eventRegistration.aggregate({
      where: {
        eventId,
        status: RegistrationStatus.CONFIRMED,
        createdAt: { lt: to },
      },
      _min: { createdAt: true },
    });
    return result._min.createdAt;
  }

  // Check-in activity = Attendance rows by checkedInAt.

  async getCheckInTimestamps(
    eventId: string,
    from: Date,
    to: Date,
  ): Promise<Date[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { eventId, checkedInAt: { gte: from, lt: to } },
      select: { checkedInAt: true },
    });
    return rows.map((row) => row.checkedInAt);
  }

  countCheckInsBefore(eventId: string, before: Date): Promise<number> {
    return this.prisma.attendance.count({
      where: { eventId, checkedInAt: { lt: before } },
    });
  }

  async findEarliestCheckIn(eventId: string, to: Date): Promise<Date | null> {
    const result = await this.prisma.attendance.aggregate({
      where: { eventId, checkedInAt: { lt: to } },
      _min: { checkedInAt: true },
    });
    return result._min.checkedInAt;
  }

  // All answers of one form type for an event, ready for aggregation.
  // Only CONFIRMED registrations count: a cancelled registration keeps its form
  // response until the person re-registers, and must not inflate the numbers.
  // Returns null when the event has no form of that type.
  async getFormAnswerData(
    eventId: string,
    type: FormType,
  ): Promise<{
    fields: FieldStatsField[];
    rows: (FieldStatsRow & { formFieldId: string })[]; // stored answers for each form field
    responseCount: number;
  } | null> {
    const form = await this.prisma.form.findUnique({
      where: { eventId_type: { eventId, type } },
      select: {
        id: true,
        fields: {
          orderBy: { order: 'asc' },
          select: { id: true, label: true, type: true, options: true },
        },
      },
    });
    if (!form) return null;

    const confirmed = {
      eventRegistration: { status: RegistrationStatus.CONFIRMED },
    };
    const [rows, responseCount] = await Promise.all([
      this.prisma.formFieldResponse.findMany({
        where: { formId: form.id, formResponse: confirmed },
        select: {
          formFieldId: true,
          valueText: true,
          valueNumber: true,
          valueDate: true,
          valueArray: true,
        },
      }),
      this.prisma.formResponse.count({
        where: { formId: form.id, ...confirmed },
      }),
    ]);

    return { fields: form.fields, rows, responseCount };
  }
}
