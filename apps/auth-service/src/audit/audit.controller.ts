import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'user-action-logs', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getAll(
    @Query() query: Record<string, string>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditService.getActionLogs(query, user);
  }
}
