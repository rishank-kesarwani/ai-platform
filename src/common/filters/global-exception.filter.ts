import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HEADERS } from '../constants';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers[HEADERS.CORRELATION_ID] as string) ||
      (request.headers[HEADERS.REQUEST_ID] as string) ||
      (request as any).correlationId ||
      'n/a';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, any>;
        message = resObj.message || exception.message;
        errorType = resObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error({
        message: `Unhandled exception: ${exception.message}`,
        stack: exception.stack,
        correlationId,
        url: request.url,
      });
      // In production or default mode, sanitize messages so we do not leak secrets or internal stacks
      message = exception.message || 'An unexpected error occurred';
      errorType = exception.name || 'Error';
    }

    response.status(status).json({
      statusCode: status,
      error: errorType,
      message,
      requestId: correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
