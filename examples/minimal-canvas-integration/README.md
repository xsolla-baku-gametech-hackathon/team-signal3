# Minimal integration example

Shows that `CrowdDirectorClient` isn't tied to `game3d`. No game engine here — just a `<canvas>`, ~100 lines of vanilla TypeScript, and the same SDK files (`src/sdk/CrowdDirectorClient.ts`, `src/network/network.types.ts`) copied from `game3d`.

It connects to the same server, joins the same room, and reacts to the exact same crowd votes — a colored flash + pulse per event type, red dots for spawned zombies, and a scrolling log of every `GAME_EVENT` / `DIRECTOR_DECISION` it receives.

## Run it

```bash
npm install
npm run dev   # :5200
```

With the `server` running locally (`cd ../../server && npm run dev`), open `http://localhost:5200/?room=DEMO-123` alongside `game3d` and the controller — voting from the controller drives both renderers identically.

## Integrating your own game

The only two calls a host needs:

```ts
import { CrowdDirectorClient } from './sdk/CrowdDirectorClient';

const client = new CrowdDirectorClient({ serverUrl: 'http://localhost:3000', roomId: 'DEMO-123' });
client.onGameEvent((event) => {
  // apply event.type to your game's own state/renderer
});
client.connect();
```

Everything else (reconnection, room join, typed events) is handled internally — see `src/main.ts` in this example for a complete, working host.
