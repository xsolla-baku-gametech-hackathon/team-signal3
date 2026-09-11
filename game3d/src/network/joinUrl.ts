export function getRoomId(): string {
  return (import.meta.env.VITE_ROOM_ID?.trim() || 'DEMO-123').toUpperCase();
}

export function getSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_SOCKET_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  return `${window.location.protocol}//${window.location.hostname}:3000`;
}

export function getControllerJoinUrl(roomId: string): string {
  const configuredUrl = import.meta.env.VITE_CONTROLLER_PUBLIC_URL;

  if (configuredUrl) {
    return `${configuredUrl.replace(/\/$/, '')}/join/${encodeURIComponent(roomId)}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:4200/join/${encodeURIComponent(roomId)}`;
}
