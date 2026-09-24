import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';

  // Security & Optimization Middleware
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-api-key, x-correlation-id, x-request-id',
  });

  // Global Prefix (exclude health routes)
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Platform Service API')
    .setDescription(
      'Enterprise-grade multi-tenant AI Platform Service powering multiple domain applications with Gemini LLM, LangChain, LangGraph, RAG, Memory, and Queues.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Service-to-service API key',
      },
      'x-api-key',
    )
    .addTag('Chat', 'Conversational AI endpoints with RAG and Memory')
    .addTag('Streaming', 'Real-time Server-Sent Events (SSE) AI streaming')
    .addTag('RAG', 'Knowledge ingestion, vector indexing, and multi-tenant retrieval')
    .addTag('Agents', 'LangGraph multi-step agent reasoning and tool execution')
    .addTag('Evaluation', 'Automated RAG and LLM benchmark evaluations')
    .addTag('Health', 'Kubernetes readiness and liveness health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`AI Platform Service running on port ${port} with prefix /${apiPrefix}`);
  logger.log(`Swagger OpenAPI Documentation available at http://localhost:${port}/docs`);
  logger.log(`Health check available at http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Application failed to start: ${err.message}`, err.stack);
  process.exit(1);
});
