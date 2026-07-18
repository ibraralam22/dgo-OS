import { Controller, Get, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve operational summary metrics scoped to the active user role' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(@ActiveUser('role') role: string) {
    const data = await this.dashboardService.getMetrics(role);
    return { success: true, data };
  }

  @Get('activity')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('iam:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve recent admin activity logs scoped to the active tenant' })
  @ApiResponse({ status: 200, description: 'Activity feed retrieved successfully' })
  async getActivity() {
    const data = await this.dashboardService.getActivity();
    return { success: true, data };
  }
}
