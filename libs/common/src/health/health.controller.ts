import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Health check del microservicio' })
  check() {
    return {
      status: 'ok',
      service: this.config.get<string>('SERVICE_NAME', 'unknown'),
      timestamp: new Date().toISOString(),
    };
  }
}
