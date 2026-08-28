import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Autenticación service-to-service para llamadas internas
 * (auth-service, catalog-service, finance-service → storage-service).
 */
@Injectable()
export class StorageServiceKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const key = req.headers['x-service-key'];
    const expected = this.config.get<string>('STORAGE_SERVICE_KEY');

    if (!expected || key !== expected) {
      throw new UnauthorizedException('Service key inválida.');
    }

    return true;
  }
}
