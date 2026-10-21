import { CheckInMethod, FieldType } from '@prisma/client';
import { AnalyticsRange } from '../constants/analytics.constants';

export type AnalyticsBucket = '1h' | '1d';

export class AnalyticsOverviewDto {
  seatLimit!: number | null;
  registered!: number; // CONFIRMED registrations
  cancelled!: number; // CANCELLED registrations that still exist
  checkedIn!: number;
  notCheckedIn!: number; // registered - checkedIn (final no-shows once the event is concluded)
  attendanceRate!: number | null; // checkedIn / registered (0..1), null when nobody registered
  registerRate!: number | null; // registered / seatLimit (0..1), null when there is no seat limit
}

export class AnalyticsTimelinePointDto {
  bucketStart!: Date;
  count!: number;
  // running total of the whole event up to and including this bucket
  // (includes activity from before timelineStart)
  cumulative!: number;
}

export class AnalyticsTimelineDto {
  bucket!: AnalyticsBucket;
  timelineStart!: Date; // start of the first bucket
  timelineEnd!: Date; // min(now, event end), exclusive; the last bucket may be partial
  points!: AnalyticsTimelinePointDto[];
}

export class AnalyticsOptionCountDto {
  value!: string;
  count!: number;
}

export class AnalyticsDistributionPointDto {
  value!: number;
  count!: number;
}

// Aggregated answers of one form field. Which extra properties are present depends on the type:
//  CHOICE, CHECKBOX -> options (every defined option, 0 included)
//  NUMBER, RATING   -> average, min, max (null when nobody answered)
//  RATING           -> also distribution (only the values that actually occurred, ascending)
//  TEXT, TEXTAREA, DATE -> only `answered` (no content)
export class AnalyticsFieldStatsDto {
  fieldId!: string;
  label!: string;
  type!: FieldType;
  answered!: number; // responses that actually answered this field
  options?: AnalyticsOptionCountDto[];
  average?: number | null;
  min?: number | null;
  max?: number | null;
  distribution?: AnalyticsDistributionPointDto[];
}

export class AnalyticsFeedbackDto {
  responses!: number;
  responseRate!: number | null; // responses / checkedIn (0..1), null when nobody checked in
  fields!: AnalyticsFieldStatsDto[];
}

export class ReturnAnalyticsDto {
  generatedAt!: Date;
  range!: AnalyticsRange;
  timeZone!: string;
  overview!: AnalyticsOverviewDto;
  checkInTimeline!: AnalyticsTimelineDto;
  registrationTimeline!: AnalyticsTimelineDto;
  checkInMethods!: Record<CheckInMethod, number>;
  registrationAnswers!: AnalyticsFieldStatsDto[]; // [] when the event has no registration form
  feedback!: AnalyticsFeedbackDto | null; // null when the event has no feedback form
}
