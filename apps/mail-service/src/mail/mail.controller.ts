import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { MailServiceKeyGuard } from '../guards/mail-service-key.guard';
import { SendEcommerceMailDto } from './dto/send-ecommerce-mail.dto';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller({ path: 'mail', version: '1' })
@UseGuards(MailServiceKeyGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('ecommerce/templates')
  @ApiOperation({ summary: 'Lista plantillas ecommerce disponibles' })
  listTemplates() {
    return { templates: this.mailService.listTemplates() };
  }

  @Post('ecommerce/send')
  @ApiOperation({ summary: 'Encola un correo ecommerce para envío en segundo plano (interno)' })
  sendEcommerce(@Body() dto: SendEcommerceMailDto) {
    return this.mailService.sendEcommerceMail(dto);
  }
}
