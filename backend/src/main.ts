import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logger.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;
  const swaggerPath = configService.get<string>('SWAGGER_PATH') || 'api/docs';
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  // Security Headers using Helmet
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: true, // Configured for dynamic tenant subdomains, restrict in production
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // API Versioning and Prefix
  app.setGlobalPrefix('api/v1');

  // Global Guards, Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger OpenAPI Setup
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DGO Enterprise CRM API')
      .setDescription(
        'Production-grade SaaS CRM API documentation for Decent Global Outsourcing (DGO).',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
    logger.log(
      `Swagger OpenAPI Documentation enabled at http://localhost:${port}/${swaggerPath}`,
    );
  }

  await app.listen(port);
  logger.log(
    `NestJS server initialized on port: ${port} inside environment: ${nodeEnv}`,
  );
}
void bootstrap();
