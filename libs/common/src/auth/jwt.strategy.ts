import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

interface JwtPayload {
  sub: string;
  username: string;
  tenantId: string;
  warehouseId: string;
  roles: string[];
  mustChangePassword?: boolean;
}

/**
 * JWT strategy compartida — usada por gateway y cualquier servicio
 * que solo necesita verificar la firma del token sin consultar la DB.
 * La validación completa (usuario activo, etc.) la hace auth-service.
 */
@Injectable()
export class JwtCommonStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      username: payload.username,
      tenantId: payload.tenantId,
      warehouseId: payload.warehouseId,
      roles: payload.roles,
      mustChangePassword: payload.mustChangePassword ?? false,
    };
  }
}
