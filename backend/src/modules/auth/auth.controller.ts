import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService, AuthSessionResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaLoginDto } from './dto/mfa-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: express.Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth', // Restrict path to mitigate XSS cookie disclosures
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshCookie(res: express.Response) {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      expires: new Date(0),
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user with email and password credentials' })
  @ApiResponse({
    status: 200,
    description: 'Login successful or MFA required state triggered',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const user = await this.authService.validateCredentials(
      loginDto.email,
      loginDto.password,
    );
    const ip = req.ip;
    const ua = req.headers['user-agent'];

    const result = await this.authService.login(user, ip, ua);

    if (!result.mfaRequired) {
      this.setRefreshCookie(res, result.refreshToken);
      const responsePayload = { ...result } as Partial<AuthSessionResponse>;
      delete responsePayload.refreshToken;
      return responsePayload;
    }

    return result;
  }

  @Public()
  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete MFA verification using login ticket and TOTP code',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication token set successfully',
  })
  async loginMfa(
    @Body() mfaLoginDto: MfaLoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const ip = req.ip;
    const ua = req.headers['user-agent'];

    const result = await this.authService.verifyMfa(
      mfaLoginDto.mfaTicket,
      mfaLoginDto.totpCode,
      ip,
      ua,
    );

    this.setRefreshCookie(res, result.refreshToken);
    const responsePayload = { ...result } as Partial<AuthSessionResponse>;
    delete responsePayload.refreshToken;
    return responsePayload;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request token refresh to rotate session credentials',
  })
  @ApiResponse({ status: 200, description: 'Token rotated and cookie updated' })
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = req.cookies?.['refreshToken'] as string | undefined;
    if (!token) {
      throw new BadRequestException('Session refresh token cookie is missing');
    }

    const ip = req.ip;
    const ua = req.headers['user-agent'];

    const result = await this.authService.rotateSession(token, ip, ua);

    this.setRefreshCookie(res, result.refreshToken);
    const responsePayload = { ...result } as Partial<AuthSessionResponse>;
    delete responsePayload.refreshToken;
    return responsePayload;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh tokens and sign out user' })
  @ApiResponse({ status: 200, description: 'Logout completed' })
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = req.cookies?.['refreshToken'] as string | undefined;
    if (token) {
      await this.authService.revokeSession(token);
    }
    this.clearRefreshCookie(res);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate TOTP MFA seed keys for logged-in user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'TOTP secret registration configuration created',
  })
  async enableMfa(@ActiveUser('id') userId: string) {
    return this.authService.generateMfaSecret(userId);
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify dynamic TOTP code and enable permanent MFA protection',
  })
  @ApiResponse({ status: 200, description: 'MFA setup confirmed' })
  async confirmMfa(
    @ActiveUser('id') userId: string,
    @Body('totpCode') totpCode: string,
  ) {
    if (!totpCode) {
      throw new BadRequestException('totpCode parameter is required');
    }
    await this.authService.confirmMfa(userId, totpCode);
    return {
      success: true,
      message: 'Multi-Factor Authentication enabled successfully',
    };
  }
}
