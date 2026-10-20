import { Injectable } from '@nestjs/common';
import { CheckInMethod, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Timeline windows are half-open [from, to), see lastBucketStart in analytics.utils.
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
}
