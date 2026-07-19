import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User Profile Settings ──────────────────────────────────────────────────

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        timezone: true,
        status: true,
      },
    });
  }

  async updateProfile(userId: string, orgId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName : undefined,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        timezone: dto.timezone !== undefined ? dto.timezone : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        timezone: true,
        status: true,
      },
    });

    await this.writeAudit(orgId, userId, 'user.update_profile', userId, existing, updated);
    return updated;
  }

  async changePassword(userId: string, orgId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user.passwordHash) {
      throw new BadRequestException('Passwordless profiles cannot change password this way');
    }

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('The current password provided is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await this.writeAudit(orgId, userId, 'user.change_password', userId, null, null);
    return { success: true };
  }

  // ─── Organization Settings ──────────────────────────────────────────────────

  async getOrganization(orgId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        phone: true,
        address: true,
        defaultCurrency: true,
        timezone: true,
      },
    });
  }

  async updateOrganization(orgId: string, actorId: string, dto: UpdateOrganizationDto) {
    const existing = await this.getOrganization(orgId);

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        address: dto.address !== undefined ? dto.address : undefined,
        defaultCurrency: dto.defaultCurrency !== undefined ? dto.defaultCurrency : undefined,
        timezone: dto.timezone !== undefined ? dto.timezone : undefined,
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        phone: true,
        address: true,
        defaultCurrency: true,
        timezone: true,
      },
    });

    await this.writeAudit(orgId, actorId, 'organization.update_settings', orgId, existing, updated);
    return updated;
  }

  // ─── Audit Log helper ────────────────────────────────────────────────────────

  private async writeAudit(
    orgId: string,
    userId: string,
    action: string,
    resourceId: string,
    before: any,
    after: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action,
        resourceName: 'settings',
        resourceId,
        payloadBefore: before ?? undefined,
        payloadAfter: after ?? undefined,
      },
    });
  }
}
