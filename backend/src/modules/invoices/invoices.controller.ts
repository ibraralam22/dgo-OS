import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PatchInvoiceStatusDto } from './dto/patch-status.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('kpis')
  @RequirePermissions('billing:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invoice KPIs (Billed, Paid, Outstanding, Overdue counts)' })
  async getKpis(@ActiveUser() user: ActiveUserData) {
    return this.invoicesService.getKpis(user.organizationId!);
  }

  @Get()
  @RequirePermissions('billing:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List and filter paginated invoices' })
  async listInvoices(
    @ActiveUser() user: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '15',
    @Query('status') status?: string,
    @Query('accountId') accountId?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.invoicesService.listInvoices(user.organizationId!, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      status,
      accountId,
      search,
      fromDate,
      toDate,
    });
  }

  @Get(':id')
  @RequirePermissions('billing:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get specific invoice details' })
  async getInvoiceById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.invoicesService.getInvoiceById(id, user.organizationId!);
  }

  @Post()
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new invoice draft' })
  async createInvoice(@Body() dto: CreateInvoiceDto, @ActiveUser() user: ActiveUserData) {
    return this.invoicesService.createInvoice(dto, user.organizationId!, user.id);
  }

  @Put(':id')
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update metadata and line items (DRAFT only)' })
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.invoicesService.updateInvoice(id, dto, user.organizationId!, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually patch invoice status (e.g. SENT, VOID)' })
  async patchStatus(
    @Param('id') id: string,
    @Body() dto: PatchInvoiceStatusDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.invoicesService.patchStatus(id, dto, user.organizationId!, user.id);
  }

  @Post(':id/payments')
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record payment transaction against outstanding invoice' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.invoicesService.recordPayment(id, dto, user.organizationId!, user.id);
  }

  @Delete(':id')
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/archive invoice draft' })
  async deleteInvoice(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.invoicesService.deleteInvoice(id, user.organizationId!, user.id);
  }
}
