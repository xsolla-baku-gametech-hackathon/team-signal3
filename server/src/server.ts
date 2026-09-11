import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { isAllowedOrigin } from './config/corsOrigin.js';
import { env } from './config/env.js';
import { createSocketServer } from './socket/socketServer.js';

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin, env.clientOrigins));
    }
  })
);
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.port, env.host, () => {
  console.info(`[SERVER] Crowd Director realtime server listening on ${env.host}:${env.port}`);
  console.info(`[SERVER] Allowed origins: ${env.clientOrigins.join(', ')}`);
});
