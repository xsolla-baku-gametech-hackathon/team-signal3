# @crowd-director/sdk

Engine-agnostic client SDK for **Crowd Director** — connect any game to a
live, crowd-voted Rule Engine + AI Director pipeline over Socket.IO.

No Three.js, Unity, or Phaser types anywhere inside. If your runtime can hold
a WebSocket, it can host this SDK.

## Install

```bash
npm install @crowd-director/sdk
```

## Usage

```ts
import { CrowdDirectorClient } from '@crowd-director/sdk';

const client = new CrowdDirectorClient({
  serverUrl: 'https://your-server.example.com',
  roomId: 'DEMO-123'
});

// The only channel that carries gameplay commands
client.onGameEvent((event) => {
  // event.type is one of: SPAWN_ZOMBIE, HEAL, LIGHTNING, STORM, BOSS, ...
  // apply it to your own game's state/renderer however you like
});

client.connect();

// Whenever your game's state changes, tell the Director about it
client.reportGameState({
  hp: player.health,
  shield: player.armor,
  score,
  wave,
  enemyCount,
  bossActive,
  stormActive,
  gameOver
});
```

## API

| Method | Description |
| --- | --- |
| `connect()` | Opens the socket and joins `roomId`. |
| `disconnect()` | Closes the socket. |
| `isConnected()` | Whether the socket is currently connected. |
| `reportGameState(state)` | Sends the game's current state to the Director. |
| `onGameEvent(handler)` / `offGameEvent(handler)` | Subscribe/unsubscribe to crowd-driven game events. |
| `onRoomState(handler)` / `offRoomState(handler)` | Subscribe to room occupancy updates. |
| `onDirectorDecision(handler)` / `offDirectorDecision(handler)` | Subscribe to the raw Director decision (rule baseline, AI proposal, final pick — useful for an operator dashboard). |
| `onConnected(handler)` / `onDisconnected(handler)` | Connection lifecycle hooks. |

See the full event and payload types exported alongside the client
(`GameEvent`, `GameStatePayload`, `RoomStatePayload`, `DirectorDecisionBroadcast`).

## Proven integrations

This exact SDK ships unmodified inside two very different hosts in this
monorepo:

- `game3d/` — a full Three.js survival game.
- `examples/minimal-canvas-integration/` — a ~100-line vanilla `<canvas>`
  page with zero game engine.

## License

MIT
