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

const SAFE_CLIENT_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Resource not found',
  409: 'Conflict',
  429: 'Too many requests. Please try again later.',
  500: 'Something went wrong. Please try again later.',
};

function isSafeMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return !(
    lower.includes('relation ') ||
    lower.includes('column ') ||
    lower.includes('table ') ||
    lower.includes('schema ') ||
    lower.includes('constraint ') ||
    lower.includes('supabase') ||
    lower.includes('postgrest') ||
    lower.includes('pg_') ||
    lower.includes('stack trace') ||
    lower.includes('at /')
  );
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
    let responseData: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        const rawMessage = (res.message as string) ?? exception.message;
        message = isSafeMessage(rawMessage) ? rawMessage : (SAFE_CLIENT_MESSAGES[status] ?? 'Request failed');
        errorCode = (res.errorCode as string) ?? exception.constructor.name;
        responseData = {
          ...(typeof res.code === 'string' && { code: res.code }),
          ...(Array.isArray(res.sessions) && { sessions: res.sessions }),
        };
      } else {
        const rawMessage = exception.message;
        message = isSafeMessage(rawMessage) ? rawMessage : (SAFE_CLIENT_MESSAGES[status] ?? 'Request failed');
        errorCode = exception.constructor.name;
      }
    } else if (exception instanceof PostgrestError) {
      status = HttpStatus.BAD_REQUEST;
      message = SAFE_CLIENT_MESSAGES[400]!;
      errorCode = 'QUERY_FAILED';
      this.logger.error(
        { error: exception.message, code: exception.code, details: exception.details, hint: exception.hint },
        'Database query failed',
      );
    } else if (exception instanceof Error) {
      message = SAFE_CLIENT_MESSAGES[500]!;
      errorCode = 'INTERNAL_ERROR';
      this.logger.error({ error: exception.stack }, 'Unhandled exception');
    }

    const errorResponse = {
      statusCode: status,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      ...responseData,
    };

    this.logger.warn(
      {
        statusCode: status,
        path: request.url,
        method: request.method,
        errorCode,
      },
      'Request failed',
    );

    response.status(status).send(errorResponse);
  }
}
