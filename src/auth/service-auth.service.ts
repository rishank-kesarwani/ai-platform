import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceAuthService {
  private readonly validApiKeys: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const keys = this.configService.get<string[]>('auth.serviceApiKeys') || [];
    this.validApiKeys = new Set(keys);
  }

  validateKey(apiKey: string): boolean {
    if (!apiKey) return false;
    return this.validApiKeys.has(apiKey);
  }
}
