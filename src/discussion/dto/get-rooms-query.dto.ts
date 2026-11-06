import { IsOptional, IsIn } from 'class-validator';

export class GetRoomsQueryDto {
  @IsOptional()
  @IsIn(['active', 'archived'])
  filter?: 'active' | 'archived';
}
