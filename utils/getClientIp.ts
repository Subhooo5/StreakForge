import { NextRequest } from 'next/server';
import { GetClientIpOptions } from '../types/network';
import { isTrustedProxy, loadTrustedProxyConfig } from './trustedProxy';

const recentLogsCache = new Set<string>();
const MAX_RECENT_LOGS_CACHE_SIZE = 1000;

function logSecurityEvent(event: string, details: Record<string, unknown>) {
  const cacheKey = `${event}:${details.resolvedIp || ''}`;
  if (recentLogsCache.has(cacheKey)) return;

  if (recentLogsCache.size >= MAX_RECENT_LOGS_CACHE_SIZE) {
    const entries = recentLogsCache.values();
    const evictCount = Math.floor(MAX_RECENT_LOGS_CACHE_SIZE / 2);
    for (let i = 0; i < evictCount; i++) {
      const next = entries.next();
      if (!next.done) recentLogsCache.delete(next.value);
    }
  }

  recentLogsCache.add(cacheKey);
  setTimeout(() => recentLogsCache.delete(cacheKey), 5000).unref?.();

  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event,
      ...details,
    })
  );
}

export function getClientIp(
  request: Request | NextRequest,
  options: GetClientIpOptions = {}
): string {
  const opt = options || {};
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const defaultIp = isDevOrTest ? '127.0.0.1' : 'unknown';

  if (!request) {
    return defaultIp;
  }

  const headers = request.headers;
  if (!headers || typeof headers.get !== 'function') {
    return defaultIp;
  }

  const callerProvidedConfig = !!opt.proxyConfig;
  const config = opt.proxyConfig || loadTrustedProxyConfig();

  const requestIp =
    request instanceof NextRequest ? (request as NextRequest & { ip?: string }).ip : undefined;
  if (request instanceof NextRequest && requestIp) {
    const rawXff = headers.get('x-forwarded-for');
    if (rawXff) {
      const firstIp = rawXff.split(',')[0].trim();
      if (firstIp && firstIp !== requestIp) {
        logSecurityEvent('SPOOFED_HEADER_ATTEMPT', {
          claimedIp: firstIp,
          resolvedIp: requestIp,
          header: 'x-forwarded-for',
        });
      }
    }
    return requestIp;
  }

  const directIp = opt.directIp?.trim();
  const priorityHeaders = opt.headersPriority || [
    'x-vercel-proxied-for',
    'cf-connecting-ip',
    'x-real-ip',
  ];

  if (!directIp) {
    if (config.trustedProxies.includes('*')) {
      const xff = headers.get('x-forwarded-for');
      if (xff) {
        const firstIp = xff.split(',')[0].trim();
        if (firstIp) {
          return firstIp;
        }
      }
      for (const headerName of priorityHeaders) {
        const val = headers.get(headerName)?.trim();
        if (val) return val;
      }
      return defaultIp;
    }

    if (callerProvidedConfig && config.trustedProxies.length > 0) {
      const xff = headers.get('x-forwarded-for');
      if (xff) {
        const ips = xff
          .split(',')
          .map((ip: string) => ip.trim())
          .filter(Boolean);
        if (ips.length > 0) {
          let clientIp = defaultIp;
          for (let i = ips.length - 1; i >= 0; i--) {
            const currentIp = ips[i];
            if (isTrustedProxy(currentIp, config)) {
              if (i > 0) clientIp = ips[i - 1];
            } else {
              clientIp = currentIp;
              break;
            }
          }
          if (ips[0] !== clientIp && clientIp !== defaultIp) {
            logSecurityEvent('SPOOFED_HEADER_ATTEMPT', {
              claimedIp: ips[0],
              resolvedIp: clientIp,
              header: 'x-forwarded-for',
            });
          }
          return clientIp;
        }
      }
      for (const headerName of priorityHeaders) {
        const val = headers.get(headerName)?.trim();
        if (val) return val;
      }
      return defaultIp;
    }

    if (opt.headersPriority && opt.headersPriority.length > 0) {
      for (const headerName of opt.headersPriority) {
        const val = headers.get(headerName)?.trim();
        if (val) return val;
      }
      return defaultIp;
    }

    const forwardedHeaders = ['x-forwarded-for', ...priorityHeaders];
    const spoofedHeader = forwardedHeaders.find((headerName) => headers.get(headerName));
    if (spoofedHeader) {
      logSecurityEvent('UNTRUSTED_FORWARDED_HEADER_IGNORED', {
        resolvedIp: 'unknown',
        header: spoofedHeader,
      });
    }
    return defaultIp;
  }

  if (!isTrustedProxy(directIp, config)) {
    return directIp;
  }

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff
      .split(',')
      .map((ip: string) => ip.trim())
      .filter(Boolean);
    if (ips.length > 0) {
      if (config.trustedProxies.includes('*')) {
        const clientIp = ips[0];

        logSecurityEvent('WILDCARD_TRUST_USED', {
          resolvedIp: clientIp,
          chain: ips,
          header: 'x-forwarded-for',
        });

        return clientIp;
      }

      let clientIp = defaultIp;

      for (let i = ips.length - 1; i >= 0; i--) {
        const currentIp = ips[i];
        if (isTrustedProxy(currentIp, config)) {
          if (i > 0) {
            clientIp = ips[i - 1];
          }
        } else {
          clientIp = currentIp;
          break;
        }
      }

      if (ips[0] !== clientIp) {
        logSecurityEvent('SPOOFED_HEADER_ATTEMPT', {
          claimedIp: ips[0],
          resolvedIp: clientIp,
          header: 'x-forwarded-for',
        });
      }

      return clientIp;
    }
  }

  for (const headerName of priorityHeaders) {
    const headerVal = headers.get(headerName);
    if (headerVal) {
      const trimmed = headerVal.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return directIp;
}
