import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from '../corsOrigin.js';

describe('isAllowedOrigin', () => {
  it('allows requests with no Origin header (server-to-server, curl, native apps)', () => {
    expect(isAllowedOrigin(undefined, [])).toBe(true);
  });

  it('allows an explicitly configured origin', () => {
    expect(isAllowedOrigin('https://example.com', ['https://example.com'])).toBe(true);
  });

  it('rejects an origin that is neither configured nor a private LAN address', () => {
    expect(isAllowedOrigin('https://example.com', [])).toBe(false);
    expect(isAllowedOrigin('http://8.8.8.8:4200', [])).toBe(false);
  });

  it('allows any localhost origin regardless of port', () => {
    expect(isAllowedOrigin('http://localhost:4200', [])).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', [])).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:8081', [])).toBe(true);
  });

  it('allows any 192.168.x.x LAN origin regardless of port, even when unconfigured', () => {
    expect(isAllowedOrigin('http://192.168.1.42:4200', [])).toBe(true);
    expect(isAllowedOrigin('http://192.168.55.7:5173', [])).toBe(true);
  });

  it('allows 10.x.x.x and 172.16-31.x.x private ranges', () => {
    expect(isAllowedOrigin('http://10.0.0.5:3000', [])).toBe(true);
    expect(isAllowedOrigin('http://172.16.4.10:3000', [])).toBe(true);
    expect(isAllowedOrigin('http://172.31.255.1:3000', [])).toBe(true);
    expect(isAllowedOrigin('http://172.32.0.1:3000', [])).toBe(false);
    expect(isAllowedOrigin('http://172.15.0.1:3000', [])).toBe(false);
  });
});
