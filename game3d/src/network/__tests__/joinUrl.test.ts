import { afterEach, describe, expect, it, vi } from 'vitest';
import { getControllerJoinUrl, getRoomId, getSocketUrl } from '../joinUrl';

describe('joinUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults the room id to DEMO-123 when unset', () => {
    expect(getRoomId()).toBe('DEMO-123');
  });

  it('uses a configured room id when provided', () => {
    vi.stubEnv('VITE_ROOM_ID', 'STAGE-42');

    expect(getRoomId()).toBe('STAGE-42');
  });

  it('falls back to the page hostname on port 3000 when no socket URL is configured', () => {
    vi.stubEnv('VITE_SOCKET_URL', '');

    expect(getSocketUrl()).toBe(`${window.location.protocol}//${window.location.hostname}:3000`);
  });

  it('uses a configured socket URL when provided', () => {
    vi.stubEnv('VITE_SOCKET_URL', 'https://server.example.com');

    expect(getSocketUrl()).toBe('https://server.example.com');
  });

  it('falls back to the page hostname on port 4200 for the controller join URL', () => {
    vi.stubEnv('VITE_CONTROLLER_PUBLIC_URL', '');

    expect(getControllerJoinUrl('DEMO-123')).toBe(`${window.location.protocol}//${window.location.hostname}:4200/join/DEMO-123`);
  });

  it('uses a configured controller URL, trimming a trailing slash', () => {
    vi.stubEnv('VITE_CONTROLLER_PUBLIC_URL', 'https://controller.example.com/');

    expect(getControllerJoinUrl('DEMO-123')).toBe('https://controller.example.com/join/DEMO-123');
  });
});
