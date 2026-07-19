import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OpportunityStage } from '@prisma/client';

export class TransitionStageDto {
  @ApiProperty({ enum: OpportunityStage, example: 'CLOSED_WON' })
  @IsEnum(OpportunityStage)
  @IsNotEmpty()
  stage!: OpportunityStage;

  @ApiPropertyOptional({ example: 'https://secure-storage.decentglobal.com/contracts/sow_acme_102.pdf' })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  @ApiPropertyOptional({ example: 'Budget constraints, lost to competitor.' })
  @IsOptional()
  @IsString()
  lossReason?: string;

  @ApiPropertyOptional({ example: 'Accenture' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  competitorLostTo?: string;
}
