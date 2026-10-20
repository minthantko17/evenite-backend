import { Injectable } from '@nestjs/common';
import { FormType } from '@prisma/client';
import { EventValidationService } from '../event/services/event-validation.service';
import { AnalyticsCrudService } from './services/analytics-crud.service';
import {
  ANALYTICS_TIME_ZONE,
  AnalyticsRange,
  FIXED_RANGE_BUCKET_COUNT,
  MAX_TIMELINE_POINTS,
} from './constants/analytics.constants';
import {
  AnalyticsBucket,
  AnalyticsFeedbackDto,
  AnalyticsFieldStatsDto,
  AnalyticsTimelineDto,
  ReturnAnalyticsDto,
} from './dto/return-analytics.dto';
import { buildFormFieldStats } from './utils/analytics-field-stats.utils';
import {
  buildBucketStarts,
  buildFixedRangeBucketStarts,
  emptyTimeline,
  fillTimeline,
  lastBucketStart,
  pickBucketForSpan,
  resolveWindowEnd,
  startOfBucket,
  toRate,
} from './utils/analytics.utils';

// how one timeline reads its activity from the database
interface TimelineSource {
  timestamps: (from: Date, to: Date) => Promise<Date[]>;
  countBefore: (before: Date) => Promise<number>;
  earliest: (to: Date) => Promise<Date | null>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analyticsCrudService: AnalyticsCrudService,
    private readonly eventValidationService: EventValidationService,
  ) {}

  async getEventAnalytics(
    eventId: string,
    organizerProfileId: string,
    range: AnalyticsRange,
  ): Promise<ReturnAnalyticsDto> {
    await this.eventValidationService.validateEventOwnership(
      eventId,
      organizerProfileId,
    );
    const event =
      await this.eventValidationService.validateEventExists(eventId);

    const now = new Date();
    const windowEnd = resolveWindowEnd(event, now);

    const registrationSource: TimelineSource = {
      timestamps: (from, to) =>
        this.analyticsCrudService.getRegistrationTimestamps(eventId, from, to),
      countBefore: (before) =>
        this.analyticsCrudService.countRegistrationsBefore(eventId, before),
      earliest: (to) =>
        this.analyticsCrudService.findEarliestRegistration(eventId, to),
    };
    const checkInSource: TimelineSource = {
      timestamps: (from, to) =>
        this.analyticsCrudService.getCheckInTimestamps(eventId, from, to),
      countBefore: (before) =>
        this.analyticsCrudService.countCheckInsBefore(eventId, before),
      earliest: (to) =>
        this.analyticsCrudService.findEarliestCheckIn(eventId, to),
    };

    const [
      counts,
      checkInMethods,
      registrationTimeline,
      checkInTimeline,
      registrationForm,
      feedbackForm,
    ] = await Promise.all([
      this.analyticsCrudService.getOverviewCounts(eventId),
      this.analyticsCrudService.getCheckInMethodCounts(eventId),
      this.buildTimeline(registrationSource, range, windowEnd),
      this.buildTimeline(checkInSource, range, windowEnd),
      this.analyticsCrudService.getFormAnswerData(
        eventId,
        FormType.REGISTRATION,
      ),
      this.analyticsCrudService.getFormAnswerData(eventId, FormType.FEEDBACK),
    ]);

    const registrationAnswers: AnalyticsFieldStatsDto[] = registrationForm
      ? buildFormFieldStats(registrationForm.fields, registrationForm.rows)
      : [];

    // only attendees can respond, so the rate is relative to check-ins
    const feedback: AnalyticsFeedbackDto | null = feedbackForm
      ? {
          responses: feedbackForm.responseCount,
          responseRate: toRate(feedbackForm.responseCount, counts.checkedIn),
          fields: buildFormFieldStats(feedbackForm.fields, feedbackForm.rows),
        }
      : null;

    return {
      generatedAt: now,
      range,
      timeZone: ANALYTICS_TIME_ZONE,
      overview: {
        seatLimit: event.seatLimit,
        registered: counts.registered,
        cancelled: counts.cancelled,
        checkedIn: counts.checkedIn,
        notCheckedIn: Math.max(counts.registered - counts.checkedIn, 0),
        attendanceRate: toRate(counts.checkedIn, counts.registered),
        fillRate: toRate(counts.registered, event.seatLimit),
      },
      checkInTimeline,
      registrationTimeline,
      checkInMethods,
      registrationAnswers,
      feedback,
    };
  }

  private async buildTimeline(
    source: TimelineSource,
    range: AnalyticsRange,
    windowEnd: Date,
  ): Promise<AnalyticsTimelineDto> {
    let bucket: AnalyticsBucket;
    let starts: Date[];

    if (range === AnalyticsRange.ALL) {
      // from this stream's first activity up to the window end (exclusive)
      const earliest = await source.earliest(windowEnd);
      if (!earliest) return emptyTimeline(windowEnd);

      bucket = pickBucketForSpan(windowEnd.getTime() - earliest.getTime());
      starts = buildBucketStarts(
        startOfBucket(earliest, bucket),
        lastBucketStart(windowEnd, bucket),
        bucket,
      );
      // very long events: keep the most recent buckets (the cumulative base keeps the total right)
      if (starts.length > MAX_TIMELINE_POINTS) {
        starts = starts.slice(-MAX_TIMELINE_POINTS);
      }
    } else {
      bucket = range === AnalyticsRange.LAST_24_HOURS ? '1h' : '1d';
      starts = buildFixedRangeBucketStarts(
        windowEnd,
        bucket,
        FIXED_RANGE_BUCKET_COUNT[range],
      );
    }

    const windowStart = starts[0];
    const [timestamps, countBeforeWindow] = await Promise.all([
      source.timestamps(windowStart, windowEnd),
      source.countBefore(windowStart),
    ]);
    return fillTimeline(
      starts,
      bucket,
      timestamps,
      countBeforeWindow,
      windowEnd,
    );
  }
}
