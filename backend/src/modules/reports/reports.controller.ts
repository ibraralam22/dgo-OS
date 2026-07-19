import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateSavedReportDto } from './dto/create-saved-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermissions('reports:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregate Sales Pipeline analytics' })
  async getSalesAnalytics(
    @ActiveUser() user: ActiveUserData,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getSalesAnalytics(user.organizationId!, fromDate, toDate);
  }

  @Get('financial')
  @RequirePermissions('reports:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregate Invoices and Revenue analytics' })
  async getFinancialAnalytics(
    @ActiveUser() user: ActiveUserData,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getFinancialAnalytics(user.organizationId!, fromDate, toDate);
  }

  @Get('support')
  @RequirePermissions('reports:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregate Support tickets and SLAs analytics' })
  async getSupportAnalytics(
    @ActiveUser() user: ActiveUserData,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getSupportAnalytics(user.organizationId!, fromDate, toDate);
  }

  @Get()
  @RequirePermissions('reports:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List saved report configurations' })
  async listSavedReports(@ActiveUser() user: ActiveUserData) {
    return this.reportsService.listSavedReports(user.organizationId!);
  }

  @Post()
  @RequirePermissions('reports:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a custom report configuration layout' })
  async createSavedReport(
    @Body() dto: CreateSavedReportDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.reportsService.createSavedReport(user.organizationId!, user.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('reports:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/archive a saved report configuration' })
  async deleteSavedReport(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.reportsService.deleteSavedReport(id, user.organizationId!);
  }
}
