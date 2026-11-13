import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface HttpRequestLike {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface HttpResponseLike {
  setHeader?: (name: string, value: string | number) => void;
}

const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 10_000;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, RateLimitEntry>();
  readonly maxRequests = DEFAULT_MAX_REQUESTS;
  readonly windowMs = DEFAULT_WINDOW_MS;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequestLike>();
    const res = http.getResponse<HttpResponseLike>();

    const forceHeader = req?.headers?.['x-enable-rate-limit'];
    const headerEnabled =
      forceHeader === 'true' ||
      (Array.isArray(forceHeader) && forceHeader[0] === 'true');

    if (process.env.NODE_ENV === 'test' && !headerEnabled) {
      return true;
    }

    const now = Date.now();
    this.pruneExpired(now);

    const clientKey = this.extractClientIp(req);
    const existing = this.requests.get(clientKey);

    if (!existing || existing.resetAt <= now) {
      this.requests.set(clientKey, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (existing.count >= this.maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );
      res?.setHeader?.('Retry-After', retryAfterSeconds);
      throw new HttpException(
        'Demasiadas solicitudes de autenticación. Intenta nuevamente en un minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    return true;
  }

  reset(): void {
    this.requests.clear();
  }

  private extractClientIp(req?: HttpRequestLike): string {
    const forwarded = req?.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (typeof forwardedValue === 'string' && forwardedValue.trim().length > 0) {
      return forwardedValue.split(',')[0].trim();
    }
    if (typeof req?.ip === 'string' && req.ip.trim().length > 0) {
      return req.ip.trim();
    }
    if (
      typeof req?.socket?.remoteAddress === 'string' &&
      req.socket.remoteAddress.trim().length > 0
    ) {
      return req.socket.remoteAddress.trim();
    }
    return 'unknown';
  }

  private pruneExpired(now: number): void {
    if (this.requests.size < MAX_TRACKED_IPS) {
      return;
    }
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetAt <= now) {
        this.requests.delete(key);
      }
    }
  }
}
