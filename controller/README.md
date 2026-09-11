# Controller

The crowd-facing and operator-facing UI for [Crowd Director](../README.md) — see the root README for the full architecture and pitch.

## Routes

| Route | Audience | Purpose |
|---|---|---|
| `/join/:roomId` | Crowd (phones) | Nickname entry, then redirects into the room |
| `/room/:roomId` | Crowd (phones) | Vote buttons, DP/tier badge and progress bar, room chat, end-of-round leaderboard |
| `/dashboard/:roomId` | Operator/judge | Live rule-baseline vs. AI-proposal vs. final decision, crowd snapshot, decision history |

## Development

```bash
npm install
npm run start:lan   # binds 0.0.0.0:4200 so phones on the same Wi-Fi can join
```

Socket/controller URLs default to the page's own hostname at runtime (`src/environments/environment.ts`) — no config needed for a LAN demo. Set `socketUrl`/`controllerPublicUrl` there only to point at a server on a different host.

## Testing & build

```bash
npm test          # ng test (Vitest runner, headless)
npm run build     # -> dist/controller
```
