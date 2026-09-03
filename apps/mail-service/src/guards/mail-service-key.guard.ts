import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailServiceKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const key = req.headers['x-service-key'];
    const expected = this.config.get<string>('MAIL_SERVICE_KEY');

    if (!expected || key !== expected) {
      throw new UnauthorizedException('Service key inválida.');
    }

    return true;
  }
}
