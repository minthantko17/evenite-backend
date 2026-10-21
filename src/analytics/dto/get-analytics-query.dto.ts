import { IsEnum, IsOptional } from 'class-validator';
import { AnalyticsRange } from '../constants/analytics.constants';

export class GetAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range: AnalyticsRange = AnalyticsRange.LAST_24_HOURS;
}
