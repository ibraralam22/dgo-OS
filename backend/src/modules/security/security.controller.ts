import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@ApiTags('Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  private checkAdmin(user: ActiveUserData) {
    if (user.role !== 'SuperAdmin' && user.role !== 'TenantAdmin') {
      throw new ForbiddenException(
        'Only system and tenant administrators are authorized to access security audit trails',
      );
    }
  }

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List chronological tenant audit log trails of tenant administrator actions',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAuditLogs(
    @ActiveUser() user: ActiveUserData,
    @Query() query: GetAuditLogsDto,
  ) {
    this.checkAdmin(user);
    return this.securityService.getAuditLogs(user.organizationId!, {
      page: query.page,
      limit: query.limit,
      userId: query.userId,
      action: query.action,
      resourceName: query.resourceName,
      search: query.search,
    });
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active user token sessions' })
  async getSessions(@ActiveUser() user: ActiveUserData) {
    this.checkAdmin(user);
    return this.securityService.getSessions(user.organizationId!);
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke and invalidate a user token session family',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async revokeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    this.checkAdmin(user);
    return this.securityService.revokeSession(
      user.organizationId!,
      id,
      user.id,
    );
  }
}