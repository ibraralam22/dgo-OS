import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty({ description: 'Amount being paid (must be greater than 0)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
