import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ActiveUserData {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  organizationId?: string;
}

export const ActiveUser = createParamDecorator(
  (data: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as ActiveUserData | undefined;
    return data ? user?.[data] : user;
  },
);
