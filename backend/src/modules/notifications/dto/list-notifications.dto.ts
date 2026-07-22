import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationStatusFilter {
  ALL = 'all',
  UNREAD = 'unread',
}

export class ListNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationStatusFilter)
  status: NotificationStatusFilter = NotificationStatusFilter.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
