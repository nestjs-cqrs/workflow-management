import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  keycloakId: string;
  email: string;
  displayName: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      return { keycloakId: '', email: '', displayName: '', roles: [] };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token) as {
      sub?: string;
      email?: string;
      name?: string;
      preferred_username?: string;
      realm_access?: { roles: string[] };
    } | null;

    return {
      keycloakId: decoded?.sub ?? '',
      email: decoded?.email ?? '',
      displayName:
        decoded?.name ?? decoded?.preferred_username ?? decoded?.email ?? '',
      roles: decoded?.realm_access?.roles ?? [],
    };
  },
);
