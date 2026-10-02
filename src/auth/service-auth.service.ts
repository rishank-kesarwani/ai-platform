import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ServiceKeyConfig {
  travel?: string;
  movie?: string;
  sports?: string;
  study?: string;
}

export interface AuthValidationResult {
  isValid: boolean;
  service?: string;
}

interface KeyEntry {
  key: string;
  service: string;
}

@Injectable()
export class ServiceAuthService {
  private readonly keyEntries: KeyEntry[] = [];
  private readonly validKeysSet: Set<string> = new Set();

  constructor(private readonly configService: ConfigService) {
    this.initializeKeys();
  }

  private initializeKeys(): void {
    const serviceApiKeys = this.configService.get<Record<string, string> | string[]>('auth.serviceApiKeys');
    const fallbackApiKeys = this.configService.get<string[]>('auth.fallbackApiKeys') || [];

    // Support dynamic dictionary: { travel: '...', resume: '...', finance: '...', ... }
    if (serviceApiKeys && typeof serviceApiKeys === 'object' && !Array.isArray(serviceApiKeys)) {
      for (const [serviceName, key] of Object.entries(serviceApiKeys)) {
        const trimmed = key?.trim();
        if (trimmed && !this.validKeysSet.has(trimmed)) {
          this.keyEntries.push({ key: trimmed, service: serviceName });
          this.validKeysSet.add(trimmed);
        }
      }
    } else if (Array.isArray(serviceApiKeys)) {
      // Legacy array format support
      for (const key of serviceApiKeys) {
        const trimmed = key?.trim();
        if (trimmed && !this.validKeysSet.has(trimmed)) {
          this.keyEntries.push({ key: trimmed, service: 'legacy-fallback' });
          this.validKeysSet.add(trimmed);
        }
      }
    }

    // Register fallback keys
    for (const fbKey of fallbackApiKeys) {
      const trimmed = fbKey?.trim();
      if (trimmed && !this.validKeysSet.has(trimmed)) {
        this.keyEntries.push({ key: trimmed, service: 'legacy-fallback' });
        this.validKeysSet.add(trimmed);
      }
    }
  }

  /**
   * Validates an API key using constant-time comparison across configured service credentials.
   */
  validateKey(apiKey: string): AuthValidationResult {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return { isValid: false };
    }

    const trimmedInput = apiKey.trim();

    // Constant-time comparison across registered keys to prevent timing attacks
    for (const entry of this.keyEntries) {
      if (this.secureCompare(trimmedInput, entry.key)) {
        return { isValid: true, service: entry.service };
      }
    }

    return { isValid: false };
  }

  /**
   * Helper method for boolean validation
   */
  isValid(apiKey: string): boolean {
    return this.validateKey(apiKey).isValid;
  }

  /**
   * Cryptographically safe constant-time comparison using fixed-length SHA-256 digests.
   */
  private secureCompare(a: string, b: string): boolean {
    if (!a || !b) return false;
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }
}
