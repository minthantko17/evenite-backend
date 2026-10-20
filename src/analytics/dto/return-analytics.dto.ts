import { CheckInMethod } from '@prisma/client';
import { AnalyticsRange } from '../constants/analytics.constants';

export type AnalyticsBucket = '1h' | '1d';

export class AnalyticsOverviewDto {
  seatLimit!: number | null;
  registered!: number; // CONFIRMED registrations
  cancelled!: number; // CANCELLED registrations that still exist
  checkedIn!: number;
  notCheckedIn!: number; // registered - checkedIn (final no-shows once the event is concluded)
  attendanceRate!: number | null; // checkedIn / registered (0..1), null when nobody registered
  fillRate!: number | null; // registered / seatLimit (0..1), null when there is no seat limit
}

export class AnalyticsTimelinePointDto {
  bucketStart!: Date;
  count!: number;
  // running total of the whole event up to and including this bucket
  // (includes activity from before windowStart)
  cumulative!: number;
}

export class AnalyticsTimelineDto {
  bucket!: AnalyticsBucket;
  windowStart!: Date; // start of the first bucket
  windowEnd!: Date; // min(now, event end), exclusive; the last bucket may be partial
  points!: AnalyticsTimelinePointDto[];
}

export class ReturnAnalyticsDto {
  generatedAt!: Date;
  range!: AnalyticsRange;
  timeZone!: string;
  overview!: AnalyticsOverviewDto;
  checkInTimeline!: AnalyticsTimelineDto;
  registrationTimeline!: AnalyticsTimelineDto;
  checkInMethods!: Record<CheckInMethod, number>;
}
