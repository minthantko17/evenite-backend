import { IsOptional, IsString, IsIn, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetMessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;  // message id to paginate from

  @IsOptional()
  @IsIn(['before', 'after'])
  direction?: 'before' | 'after'; //before - scroll up, after - scroll down

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? false : value === 'true')
  @IsBoolean()
  isAnnouncement?: boolean = false;
}
