import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class MfaLoginDto {
  @ApiProperty({
    example: 'eyJhbGci...',
    description: 'Short-lived MFA Ticket JWT',
  })
  @IsJWT({ message: 'Invalid MFA ticket format' })
  @IsNotEmpty({ message: 'MFA ticket is required' })
  mfaTicket!: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit authenticator TOTP token',
  })
  @IsString({ message: 'TOTP code must be a string' })
  @IsNotEmpty({ message: 'TOTP code is required' })
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  @Matches(/^[0-9]+$/, {
    message: 'TOTP code must consist of numeric characters only',
  })
  totpCode!: string;
}
