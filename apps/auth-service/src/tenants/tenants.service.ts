import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  paginatedResponse,
  parsePagination,
} from '@app/common/utils/pagination.util';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const SUPER_ADMIN_ROLE = 'Super Admin';

@Injectable()
export class TenantsService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(
    query: Record<string, string | undefined>,
    actor: AuthenticatedUser,
  ) {
    if (!actor.roles.includes(SUPER_ADMIN_ROLE)) {
      throw new ForbiddenException('Solo Super Admin puede listar tenants.');
    }

    const { page, limit, search } = parsePagination(query);
    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [rows, total] = await this.db.$transaction([
      this.db.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { setting: true },
      }),
      this.db.tenant.count({ where }),
    ]);

    return paginatedResponse(rows.map((t) => this.mapTenant(t)), total, limit);
  }

  async getOne(id: string, actor: AuthenticatedUser) {
    if (!actor.roles.includes(SUPER_ADMIN_ROLE) && id !== actor.tenantId) {
      throw new ForbiddenException('No tiene permiso para ver este cliente.');
    }

    const tenant = await this.db.tenant.findUnique({
      where: { id },
      include: { setting: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');
    return this.mapTenant(tenant);
  }

  async create(data: Record<string, unknown>, actor: AuthenticatedUser) {
    this.assertSuperAdmin(actor);
    const name = String(data.name ?? '').trim();
    if (!name) {
      throw new ForbiddenException('El nombre del tenant es requerido.');
    }

    const tenant = await this.db.tenant.create({
      data: {
        name,
        isActive: data.isActive != null ? Boolean(data.isActive) : true,
      },
      include: { setting: true },
    });
    return this.mapTenant(tenant);
  }

  async update(id: string, data: Record<string, unknown>, actor: AuthenticatedUser) {
    this.assertSuperAdmin(actor);
    const tenant = await this.db.tenant.update({
      where: { id },
      data: {
        ...(data.name != null && { name: String(data.name) }),
        ...(data.isActive != null && { isActive: Boolean(data.isActive) }),
      },
      include: { setting: true },
    });
    return this.mapTenant(tenant);
  }

  async delete(id: string, actor: AuthenticatedUser) {
    this.assertSuperAdmin(actor);
    await this.db.tenant.delete({ where: { id } });
    return { message: 'Tenant deleted successfully.' };
  }

  async getSettings(tenantId: string, actor: AuthenticatedUser) {
    this.assertSuperAdmin(actor);
    const setting = await this.db.tenantSetting.findUnique({
      where: { tenantId },
    });
    if (!setting) {
      return this.emptySetting();
    }
    return this.mapSetting(setting);
  }

  async saveSettings(
    tenantId: string,
    data: Record<string, unknown>,
    actor: AuthenticatedUser,
  ) {
    this.assertSuperAdmin(actor);
    await this.getOne(tenantId, actor);

    const payload = {
      ruc: data.ruc as string | null | undefined,
      legalName: data.legalName as string | null | undefined,
      tradeName: data.tradeName as string | null | undefined,
      address: data.address as string | null | undefined,
      district: data.district as string | null | undefined,
      province: data.province as string | null | undefined,
      department: data.department as string | null | undefined,
      phone: data.phone as string | null | undefined,
      email: data.email as string | null | undefined,
      website: data.website as string | null | undefined,
      socialLinks: data.socialLinks ?? undefined,
      logoUrl: data.logoUrl as string | null | undefined,
      ticketFooterNote: data.ticketFooterNote as string | null | undefined,
    };

    const setting = await this.db.tenantSetting.upsert({
      where: { tenantId },
      create: { tenantId, ...payload },
      update: payload,
    });
    return this.mapSetting(setting);
  }

  private assertSuperAdmin(actor: AuthenticatedUser) {
    if (!actor.roles.includes(SUPER_ADMIN_ROLE)) {
      throw new ForbiddenException('Solo Super Admin puede gestionar tenants.');
    }
  }

  private mapTenant(
    tenant: {
      id: string;
      name: string;
      isActive: boolean;
      setting?: {
        ruc: string | null;
        legalName: string | null;
        tradeName: string | null;
        address: string | null;
        district: string | null;
        province: string | null;
        department: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        socialLinks: unknown;
        logoUrl: string | null;
        ticketFooterNote: string | null;
      } | null;
    },
  ) {
    return {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive,
      setting: tenant.setting ? this.mapSetting(tenant.setting) : null,
    };
  }

  private mapSetting(setting: {
    ruc: string | null;
    legalName: string | null;
    tradeName: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
    department: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    socialLinks: unknown;
    logoUrl: string | null;
    ticketFooterNote: string | null;
  }) {
    const social = (setting.socialLinks ?? {}) as Record<string, string | null>;
    return {
      ruc: setting.ruc,
      legalName: setting.legalName,
      tradeName: setting.tradeName,
      address: setting.address,
      district: setting.district,
      province: setting.province,
      department: setting.department,
      phone: setting.phone,
      email: setting.email,
      website: setting.website,
      socialLinks: {
        facebook: social.facebook ?? null,
        instagram: social.instagram ?? null,
        tiktok: social.tiktok ?? null,
      },
      logoUrl: setting.logoUrl,
      ticketFooterNote: setting.ticketFooterNote,
    };
  }

  private emptySetting() {
    return {
      ruc: null,
      legalName: null,
      tradeName: null,
      address: null,
      district: null,
      province: null,
      department: null,
      phone: null,
      email: null,
      website: null,
      socialLinks: { facebook: null, instagram: null, tiktok: null },
      logoUrl: null,
      ticketFooterNote: null,
    };
  }
}
