import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { HEADERS } from '../constants';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly validApiKeys: Set<string>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const keys: string[] = this.configService.get<string[]>('auth.serviceApiKeys') || [];
    this.validApiKeys = new Set(keys);
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKeyHeader =
      request.headers[HEADERS.API_KEY] ||
      request.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (!apiKeyHeader || !this.validApiKeys.has(apiKeyHeader)) {
      throw new UnauthorizedException(
        'Invalid or missing service-to-service API key in x-api-key or Authorization header.',
      );
    }

    request.authContext = {
      authenticated: true,
      apiKey: apiKeyHeader,
    };

    return true;
  }
}
