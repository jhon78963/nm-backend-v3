import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@app/common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  const config = app.get(ConfigService);

  await app.register(helmet, { contentSecurityPolicy: false });

  app.enableCors({
    origin: config.get('FRONTEND_URL', 'http://localhost:4200'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger unificado — agrega la documentación de todos los servicios
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('nm-services — API Gateway')
      .setDescription(
        'Punto de entrada único para el frontend Angular (nm-frontend-v2). ' +
        'Proxifica hacia auth, catalog, inventory, pos, finance, hr y report services.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${config.get('GATEWAY_PORT', 3000)}`, 'Local')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('GATEWAY_PORT', 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`
  ┌──────────────────────────────────────────────────────┐
  │  Gateway nm-services corriendo en puerto ${port}        │
  │  Swagger: http://localhost:${port}/api/docs             │
  │  Health:  http://localhost:${port}/health               │
  └──────────────────────────────────────────────────────┘`);
}

bootstrap();
