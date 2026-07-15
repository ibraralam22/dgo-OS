import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] = [];

    // Catch Standard NestJS HTTP Exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;
        if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          errors = resObj.message.map((err) => String(err));
          message = 'Validation failed';
        }
      }
    }
    // Catch Prisma Client Database Errors and Map to REST Statuses (Saves DB Exposure)
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(
        `Prisma Known Error [${exception.code}] caught: ${exception.message}`,
      );

      switch (exception.code) {
        case 'P2002': {
          // Unique constraint violation
          status = HttpStatus.CONFLICT;
          const targets = exception.meta?.target;
          let fields = '';
          if (Array.isArray(targets)) {
            fields = targets.join(', ');
          } else if (typeof targets === 'string') {
            fields = targets;
          }
          message = fields
            ? `Record conflict: a resource with the matching field(s) (${fields}) already exists.`
            : 'Record conflict: a resource with these details already exists.';
          break;
        }
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'The requested resource was not found.';
          break;
        case 'P2003': // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          message =
            'Database integrity violation: referenced parent resource does not exist.';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database transaction failed.';
          break;
      }
    }
    // Catch general application Errors
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }
    // Fallback for untyped exceptions
    else {
      this.logger.error(
        `Unknown exception caught: ${JSON.stringify(exception)}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
