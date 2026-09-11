const PRIVATE_NETWORK_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isAllowedOrigin(origin: string | undefined, explicitOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }

  return explicitOrigins.includes(origin) || PRIVATE_NETWORK_ORIGIN_PATTERN.test(origin);
}
