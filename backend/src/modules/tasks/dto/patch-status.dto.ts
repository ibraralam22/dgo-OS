import { IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TASK_STATUSES } from './create-task.dto';

export class PatchStatusDto {
  @ApiProperty({ enum: TASK_STATUSES, description: 'New status to transition this task to' })
  @IsNotEmpty()
  @IsIn(TASK_STATUSES)
  status!: string;
}
