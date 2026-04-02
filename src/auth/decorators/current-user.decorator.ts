import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If data is provided (e.g., @CurrentUser('id')), return specific property
    if (data && user) {
      return user[data];
    }

    // Otherwise return the entire user object
    return user;
  },
);
