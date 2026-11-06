import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function ctx(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(roles: Role[] | undefined) {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    expect(guardRequiring(undefined).canActivate(ctx({ role: Role.VIEWER }))).toBe(true);
  });

  it('allows a matching role', () => {
    expect(guardRequiring([Role.ESG_TEAM]).canActivate(ctx({ role: Role.ESG_TEAM }))).toBe(true);
  });

  it('rejects a non-matching role', () => {
    expect(guardRequiring([Role.ESG_TEAM]).canActivate(ctx({ role: Role.INVESTEE }))).toBe(false);
  });

  it('lets ADMIN through', () => {
    expect(guardRequiring([Role.ESG_TEAM]).canActivate(ctx({ role: Role.ADMIN }))).toBe(true);
  });

  it('rejects when there is no user', () => {
    expect(guardRequiring([Role.ESG_TEAM]).canActivate(ctx(undefined))).toBe(false);
  });
});
