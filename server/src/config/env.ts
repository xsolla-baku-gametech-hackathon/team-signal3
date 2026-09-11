import dotenv from 'dotenv';
import { CROWD_AGGREGATION_WINDOW_MS } from '../crowd/crowd.config.js';

dotenv.config();

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return [
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://192.168.0.103:4200',
      'http://192.168.0.103:5173',
      'http://192.168.0.103:5174',
      'http://192.168.0.103:5175'
    ];
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

export const env = {
  port: parsePort(process.env.PORT),
  host: process.env.HOST ?? '0.0.0.0',
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGINS),
  defaultRoomId: process.env.DEFAULT_ROOM_ID ?? 'DEMO-123',
  crowdActionsPerSecond: parsePositiveInteger(process.env.CROWD_ACTIONS_PER_SECOND, 4),
  crowdAggregationWindowMs: parsePositiveInteger(process.env.CROWD_AGGREGATION_WINDOW_MS, CROWD_AGGREGATION_WINDOW_MS),
  twitchChannel: process.env.TWITCH_CHANNEL?.trim() || undefined,
  twitchRoomId: process.env.TWITCH_ROOM_ID?.trim() || process.env.DEFAULT_ROOM_ID?.trim() || 'DEMO-123'
};
