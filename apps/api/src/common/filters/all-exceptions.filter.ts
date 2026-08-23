import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';

interface FastifyReplyLike {
  status(code: number): this;
  send(body: unknown): this;
}

interface FastifyRequestLike {
  url: string;
  method: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReplyLike>();
    const request = ctx.getRequest<FastifyRequestLike>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: Record<string, unknown> | undefined;
    let responseData: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) ?? exception.message;
        errorCode = (res.errorCode as string) ?? exception.constructor.name;
        details = res.details as Record<string, unknown> | undefined;
        responseData = {
          ...(typeof res.code === 'string' && { code: res.code }),
          ...(Array.isArray(res.sessions) && { sessions: res.sessions }),
        };
      } else {
        message = exception.message;
        errorCode = exception.constructor.name;
      }
    } else if (exception instanceof PostgrestError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database query failed';
      errorCode = 'QUERY_FAILED';
      details = {
        code: exception.code,
        details: exception.details,
        hint: exception.hint,
      };
      this.logger.error(
        { error: exception.message, code: exception.code },
        'Database query failed',
      );
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.name;
      this.logger.error({ error: exception.stack }, 'Unhandled exception');
    }

    const errorResponse = {
      statusCode: status,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details }),
      ...responseData,
    };

    this.logger.warn(
      {
        statusCode: status,
        path: request.url,
        method: request.method,
        errorCode,
        message,
      },
      'Request failed',
    );

    response.status(status).send(errorResponse);
  }
}
