import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  getPostgresErrorCode,
  PG_INSUFFICIENT_PRIVILEGE,
  PG_UNIQUE_VIOLATION,
} from '../utils/postgres-error.util';

/**
 * Single place that turns every thrown value into a safe JSON error. Internal details
 * (stack traces, SQL messages) are logged, never returned to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message, error } = this.normalise(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({ statusCode: status, error, message });
  }

  private normalise(exception: unknown): {
    status: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { status, message: body, error: HttpStatus[status] ?? 'Error' };
      }
      const { message, error } = body as {
        message?: string | string[];
        error?: string;
      };
      return {
        status,
        message: message ?? exception.message,
        error: error ?? HttpStatus[status] ?? 'Error',
      };
    }

    const code = getPostgresErrorCode(exception);
    if (code === PG_UNIQUE_VIOLATION) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: 'Conflict',
      };
    }
    if (code === PG_INSUFFICIENT_PRIVILEGE) {
      return {
        status: HttpStatus.FORBIDDEN,
        message: 'Forbidden',
        error: 'Forbidden',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }
}
