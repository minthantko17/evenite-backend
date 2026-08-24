import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
}
