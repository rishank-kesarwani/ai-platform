import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ServiceAuthGuard } from './service-auth.guard';

describe('ServiceAuthGuard', () => {
  let guard: ServiceAuthGuard;
  let reflector: Reflector;
  let configService: ConfigService;

  beforeEach(() => {
    reflector = new Reflector();
    configService = {
      get: jest.fn().mockReturnValue(['test-valid-key-1', 'test-valid-key-2']),
    } as any;
    guard = new ServiceAuthGuard(reflector, configService);
  });

  it('should allow public endpoints without key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should reject requests with missing or invalid API key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'invalid-key' } }),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should accept requests with valid API key in header', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { 'x-api-key': 'test-valid-key-1' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => mockReq,
      }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext.authenticated).toBe(true);
  });
});
