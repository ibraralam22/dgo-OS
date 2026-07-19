import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active user profile configuration preferences' })
  async getProfile(@ActiveUser() user: ActiveUserData) {
    return this.settingsService.getProfile(user.id);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update active user profile configuration preferences' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.settingsService.updateProfile(user.id, user.organizationId!, dto);
  }

  @Put('profile/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user profile password credentials' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.settingsService.changePassword(user.id, user.organizationId!, dto);
  }

  @Get('organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get tenant organization metadata and settings' })
  async getOrganization(@ActiveUser() user: ActiveUserData) {
    return this.settingsService.getOrganization(user.organizationId!);
  }

  @Put('organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant organization metadata and settings (Admins only)' })
  async updateOrganization(
    @Body() dto: UpdateOrganizationDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    // Assert user carries tenant administrator role to update organization details
    if (user.role !== 'SuperAdmin' && user.role !== 'TenantAdmin') {
      throw new ForbiddenException('Only Tenant Administrators are authorized to edit organization settings');
    }

    return this.settingsService.updateOrganization(user.organizationId!, user.id, dto);
  }
}
