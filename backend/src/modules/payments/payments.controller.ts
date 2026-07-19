import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveUser } from '../../common/decorators/user.decorator';
import type { ActiveUserData } from '../../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions('billing:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List and filter paginated payments ledger' })
  async listPayments(
    @ActiveUser() user: ActiveUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '15',
    @Query('status') status?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.listPayments(user.organizationId!, {
      page: Math.max(1, parseInt(page, 10)),
      limit: Math.max(1, Math.min(100, parseInt(limit, 10))),
      status,
      invoiceId,
      paymentMethod,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('billing:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get specific payment transaction detail' })
  async getPaymentById(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.paymentsService.getPaymentById(id, user.organizationId!);
  }

  @Post()
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new payment transaction entry' })
  async createPayment(@Body() dto: CreatePaymentDto, @ActiveUser() user: ActiveUserData) {
    return this.paymentsService.createPayment(dto, user.organizationId!, user.id);
  }

  @Patch(':id/void')
  @RequirePermissions('billing:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a payment transaction (Admin only)' })
  async voidPayment(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    const isAdmin = user.roles?.some((r) => ['SuperAdmin', 'TenantAdmin'].includes(r)) ?? false;
    return this.paymentsService.voidPayment(id, user.organizationId!, user.id, isAdmin);
  }
}
