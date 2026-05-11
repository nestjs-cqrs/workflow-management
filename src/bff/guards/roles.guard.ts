import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

const ROLES_KEY = 'requiredRoles';

export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const roles = this.extractRoles(request);

    const hasRole = required.some((r) => roles.includes(r));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }

  private extractRoles(request: Record<string, unknown>): string[] {
    const authHeader = (request as { headers?: { authorization?: string } })
      .headers?.authorization;
    if (!authHeader) return [];

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token) as {
      realm_access?: { roles: string[] };
    } | null;
    return decoded?.realm_access?.roles ?? [];
  }
}
