import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ServiceAuthGuard } from './service-auth.guard';
import { ServiceAuthService } from '../../auth/service-auth.service';

describe('ServiceAuthGuard', () => {
  let guard: ServiceAuthGuard;
  let reflector: Reflector;
  let authService: ServiceAuthService;

  const mockConfig = {
    'auth.serviceApiKeys': {
      travel: 'travel-app-key-111',
      movie: 'movie-app-key-222',
      sports: 'sports-app-key-333',
      study: 'study-app-key-444',
    },
    'auth.fallbackApiKeys': ['fallback-legacy-key-999'],
  };

  beforeEach(() => {
    reflector = new Reflector();
    const configService = {
      get: jest.fn((key: string) => mockConfig[key]),
    } as any;
    authService = new ServiceAuthService(configService);
    guard = new ServiceAuthGuard(reflector, authService);
  });

  it('1. should accept travel key via x-api-key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { 'x-api-key': 'travel-app-key-111' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => mockReq }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext).toEqual({
      authenticated: true,
      service: 'travel',
    });
    // Ensure raw secret is not in context
    expect(mockReq.authContext.apiKey).toBeUndefined();
  });

  it('2. should accept movie key via x-api-key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { 'x-api-key': 'movie-app-key-222' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => mockReq }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext.service).toBe('movie');
  });

  it('3. should accept sports key via x-api-key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { 'x-api-key': 'sports-app-key-333' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => mockReq }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext.service).toBe('sports');
  });

  it('4. should accept study key via x-api-key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { 'x-api-key': 'study-app-key-444' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => mockReq }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext.service).toBe('study');
  });

  it('5. should reject invalid key with 401 UnauthorizedException', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'completely-wrong-key' } }),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('6. should reject missing key with 401 UnauthorizedException', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('7. should reject empty or whitespace key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': '   ' } }),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('8. should keep public health endpoint accessible without authentication', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const mockReq: any = { headers: {} };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => mockReq,
      }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('9. should reject malformed Authorization header with 401', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockContext1: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Basic dXNlcjpwYXNz' } }),
      }),
    };
    expect(() => guard.canActivate(mockContext1)).toThrow(UnauthorizedException);

    const mockContext2: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer   ' } }),
      }),
    };
    expect(() => guard.canActivate(mockContext2)).toThrow(UnauthorizedException);
  });

  it('10. should accept existing Bearer Authorization compatibility', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { authorization: 'Bearer travel-app-key-111' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => mockReq }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext.service).toBe('travel');
  });

  it('11. should accept existing fallback AI_SERVICE_API_KEY during migration', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockReq: any = { headers: { 'x-api-key': 'fallback-legacy-key-999' } };
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({ getRequest: () => mockReq }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(mockReq.authContext.service).toBe('legacy-fallback');
  });
});
