import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HEADERS } from '../constants';
import { IS_PUBLIC_KEY } from '../decorators';
import { ServiceAuthService } from '../../auth/service-auth.service';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly serviceAuthService: ServiceAuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const xApiKey = request.headers[HEADERS.API_KEY] || request.headers['x-api-key'];
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    let apiKey = '';

    if (typeof xApiKey === 'string' && xApiKey.trim()) {
      apiKey = xApiKey.trim();
    } else if (typeof authHeader === 'string' && authHeader.trim()) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match && match[1]?.trim()) {
        apiKey = match[1].trim();
      } else {
        // Malformed authorization header (e.g. empty Bearer or non-Bearer scheme)
        throw new UnauthorizedException(
          'Invalid or missing service-to-service API key in x-api-key or Authorization header.',
        );
      }
    }

    if (!apiKey) {
      throw new UnauthorizedException(
        'Invalid or missing service-to-service API key in x-api-key or Authorization header.',
      );
    }

    const validation = this.serviceAuthService.validateKey(apiKey);
    if (!validation.isValid) {
      throw new UnauthorizedException(
        'Invalid or missing service-to-service API key in x-api-key or Authorization header.',
      );
    }

    // Attach authenticated context without exposing the secret key
    request.authContext = {
      authenticated: true,
      service: validation.service,
    };

    return true;
  }
}
