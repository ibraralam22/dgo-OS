import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService, AuthSessionResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
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
    description: 'Login successful',
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
    const requestedOrgId = req.headers['x-tenant-id'] as string | undefined;

    const result = await this.authService.login(user, ip, ua, requestedOrgId);

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
    const requestedOrgId = req.headers['x-tenant-id'] as string | undefined;

    const result = await this.authService.rotateSession(token, ip, ua, requestedOrgId);

    this.setRefreshCookie(res, result.refreshToken);
    const responsePayload = { ...result } as Partial<AuthSessionResponse>;
    delete responsePayload.refreshToken;
    return responsePayload;
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh tokens and sign out user' })
  @ApiResponse({ status: 200, description: 'Logout completed' })
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
    @ActiveUser('id') _userId: string,
  ) {
    const token = req.cookies?.['refreshToken'] as string | undefined;
    if (token) {
      await this.authService.revokeSession(token);
    }
    this.clearRefreshCookie(res);
    return { success: true, message: 'Logged out successfully' };
  }
}
