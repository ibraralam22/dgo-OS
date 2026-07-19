import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { TransitionQuotationStatusDto } from './dto/transition-quotation-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @RequirePermissions('quotations:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new quotation version for an opportunity' })
  @ApiResponse({ status: 201, description: 'Quotation created successfully' })
  async createQuotation(@ActiveUser() user: ActiveUserData, @Body() dto: CreateQuotationDto) {
    return this.quotationsService.createQuotation(dto, user.organizationId!, user.id);
  }

  @Put(':id')
  @RequirePermissions('quotations:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update draft quotation properties and line items' })
  @ApiResponse({ status: 200, description: 'Quotation updated successfully' })
  async updateQuotation(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationsService.updateQuotation(id, dto, user.organizationId!, user.id);
  }

  @Get()
  @RequirePermissions('quotations:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve quotations' })
  @ApiResponse({ status: 200, description: 'Quotations successfully retrieved' })
  async listQuotations(
    @ActiveUser() user: ActiveUserData,
    @Query('opportunityId') opportunityId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.quotationsService.listQuotations(
      user.organizationId!,
      opportunityId,
      Math.max(1, parseInt(page, 10)),
      Math.max(1, Math.min(100, parseInt(limit, 10))),
    );
  }

  @Get(':id')
  @RequirePermissions('quotations:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve quotation details and items' })
  @ApiResponse({ status: 200, description: 'Quotation details retrieved' })
  async getQuotationById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.quotationsService.getQuotationById(id, user.organizationId!);
  }

  @Post(':id/approve')
  @RequirePermissions('quotations:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a high-discount quotation' })
  @ApiResponse({ status: 200, description: 'Quotation approved successfully' })
  async approveQuotation(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.quotationsService.approveQuotation(
      id,
      user.organizationId!,
      user.id,
      user.role,
      user.permissions,
    );
  }

  @Put(':id/status')
  @RequirePermissions('quotations:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition quotation status' })
  @ApiResponse({ status: 200, description: 'Quotation status updated successfully' })
  async transitionStatus(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: TransitionQuotationStatusDto,
  ) {
    return this.quotationsService.transitionStatus(
      id,
      dto,
      user.organizationId!,
      user.id,
      user.role,
      user.permissions,
    );
  }

  @Delete(':id')
  @RequirePermissions('quotations:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a draft quotation version' })
  @ApiResponse({ status: 200, description: 'Quotation deleted successfully' })
  async deleteQuotation(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.quotationsService.deleteQuotation(id, user.organizationId!, user.id);
  }
}
