import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtCommonStrategy } from './jwt.strategy';

/**
 * AuthModule compartido — provee validación JWT sin consultar la BD.
 * Importar en el gateway y servicios que necesiten JwtAuthGuard
 * pero que no sean auth-service (que tiene su propia estrategia con DB).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtCommonStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
