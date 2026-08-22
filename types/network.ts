export interface TrustedProxyConfig {
  trustedProxies: string[];

  trustPrivateRanges?: boolean;
}

export interface GetClientIpOptions {
  proxyConfig?: TrustedProxyConfig;

  headersPriority?: string[];

  directIp?: string;
}
