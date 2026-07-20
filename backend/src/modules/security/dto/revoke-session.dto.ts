import { IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class RevokeSessionDto {
  @IsString()
  id: string;
}