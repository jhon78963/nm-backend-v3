import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@app/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

import { ListNewsletterSubscribersQueryDto } from './dto/list-newsletter-subscribers-query.dto';
import { SendNewsletterCampaignDto } from './dto/send-newsletter-campaign.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('Ecommerce Newsletter Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Super Admin')
@Controller('ecommerce/newsletter/admin')
export class NewsletterAdminController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('subscribers')
  @ApiOperation({ summary: 'Listar suscriptores del boletín (admin)' })
  listSubscribers(@Query() query: ListNewsletterSubscribersQueryDto) {
    return this.newsletterService.listSubscribers(query);
  }

  @Patch('subscribers/:id/unsubscribe')
  @ApiOperation({ summary: 'Dar de baja un suscriptor (admin)' })
  unsubscribeSubscriber(@Param('id') id: string) {
    return this.newsletterService.unsubscribeSubscriber(id);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Historial de envíos del boletín (admin)' })
  listCampaigns() {
    return this.newsletterService.listCampaigns();
  }

  @Post('campaigns/send')
  @ApiOperation({ summary: 'Enviar boletín a suscriptores activos (admin)' })
  sendCampaign(@Body() dto: SendNewsletterCampaignDto) {
    return this.newsletterService.sendCampaign(dto);
  }
}
