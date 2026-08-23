import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Sets up Swagger API documentation for the application.
 *
 * @param {NestFastifyApplication} app - The NestJS Fastify application instance.
 * @returns {Promise<void>} A promise that resolves when Swagger is set up.
 */
export const swagger = async (app: NestFastifyApplication): Promise<void> => {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Technical Pilot LMS API')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Apply bearer auth globally to all operations so Swagger UI sends the token
  const httpMethods = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'options',
    'trace',
  ];
  for (const pathItem of Object.values(document.paths)) {
    for (const method of httpMethods) {
      const op = (pathItem as Record<string, unknown>)[method];
      if (op && typeof op === 'object') {
        (op as Record<string, unknown>).security = [{ bearer: [] }];
      }
    }
  }

  SwaggerModule.setup('api-docs', app, document);
};
