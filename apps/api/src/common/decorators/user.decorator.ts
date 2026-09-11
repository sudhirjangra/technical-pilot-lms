import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom parameter decorator to extract the user object or a specific property from the request.
 *
 * @param {string | undefined} data - Optional property name on the user object (e.g. 'id', 'email', 'role').
 * @param {ExecutionContext} ctx - The execution context containing the HTTP request.
 * @returns {any} The user object or requested property attached to the request.
 */
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (data && user) {
      return user[data];
    }
    return user;
  },
);
