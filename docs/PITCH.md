# Crowd Director — Pitch Outline

A talking-points script for the live pitch, not a document to read from. Aim for ~3 min talk + 2 min live demo + 1 min Q&A buffer.

## 1. Hook (15s)

> "Everyone, pull out your phone." *(hold for QR code on screen)* "You're all about to direct this game together — right now."

Get the room voting live during the hook, before explaining anything. The panel reacting to real votes in real time is the strongest thing you have — lead with it, don't save it for the end.

## 2. The problem (30s)

- "Twitch Plays" proved audiences *want* to control games together — but raw crowd input is chaos: a hundred conflicting keypresses a second, no coherent experience.
- Studios and event organizers who want audience-interactive experiences (esports intermissions, live shows, arcades, classroom demos) have no safe middleware for this today — they'd have to build the aggregation, the decision logic, and the safety net themselves.

## 3. The solution (45s)

- Crowd votes on **intent**, not raw input — aggregated over a short window.
- A **Rule Engine** always produces a safe, deterministic decision from that vote snapshot — zero external dependencies, zero latency risk.
- An **AI Director** (Gemini, swappable) gets the same snapshot and can propose something more nuanced. If it agrees, disagrees usefully, times out, or errors — **the Rule Engine baseline is what actually ships.** The game never stalls on an LLM call and never executes a hallucinated action.
- Every decision is broadcast with full attribution: which system decided, why, and what the crowd actually voted — visible live on the dashboard *and* inside the game itself.

**This is the technical differentiator to say out loud:** the interesting engineering problem here isn't "can an LLM pick a game event" — it's "can a live audience direct a game without ever breaking it." That's what the Rule Engine/AI Director fallback architecture is for.

## 4. Live demo (2 min)

Script:
1. Show the game running, QR code visible (`game3d`).
2. Get 3-5 people to scan and vote on their phones.
3. Cut to the dashboard (`/dashboard/:roomId`) — point at "Rule baseline" vs "AI proposal" vs "Final" updating live.
4. Cut back to the game — point at the `CROWD VOTE` panel and the `CROWD DECIDED` banner firing.
5. One line: "That's the same event, three different views — the crowd's own screen, an operator's screen, and the game."

**Have it warmed up before you go on stage** (`keep-alive` workflow prevents cold starts, but a manual visit to all 3 URLs 5 minutes before is still good insurance).

## 5. Why it matters beyond this demo (45s)

- The controller, server, and game talk **only over a small typed Socket.IO protocol** (`CrowdDirectorClient` SDK) — any game engine that can hold a WebSocket connection could plug in. This isn't "a game with a voting feature bolted on," it's a reusable **crowd-direction layer** any game or live event could adopt. `examples/minimal-canvas-integration` proves it: the same SDK, zero game engine, ~100 lines, reacting to the same crowd vote as `game3d` — say this if anyone doubts the "engine-agnostic" claim, and show both running side by side.
- **The audience doesn't need to be in the room.** The same pipeline also accepts votes from a live Twitch channel's chat (`!lightning`, `!heal`, …) — no login, no API key, connects read-only. This is the same mechanic that made "Twitch Plays Pokémon" a phenomenon, except here it's *safe by construction* instead of raw chaos. Flip it on and one streamer's entire audience — not just the people physically in the room — can direct the game.
- Concretely: esports halftime shows, escape-room/arcade installations, classroom-scale interactive lessons, and any Twitch/live-stream channel, today, with zero extra setup on their end.

**Important framing — don't get this backwards in the room:** the QR/phone controller is what the judges and audience actually use during the pitch (fastest, zero setup, no account needed). The Twitch bridge is not a replacement for that — it's a *second, independent proof point* that you demonstrate yourself: switch to your own Twitch channel's chat tab, type `!lightning`, point at the dashboard reacting. The line to say is "if this were live on Twitch right now, everyone watching could do exactly what I just did" — not "everyone here, please go to Twitch." Keep the room on the phone controller; use Twitch only as a 10-second aside to show reach.

## 6. Close (15s)

> "The crowd just decided what happened in that game — safely, with a system that explains itself. Thank you."

---

## Category cheat-sheet (say these explicitly if asked / if time allows)

| Category | What to point at |
|---|---|
| **Best Project** | The full live loop (phone → decision → game → dashboard) actually working end-to-end, in real time, in front of them |
| **Best Idea** | The Rule Engine + AI Director fallback framing ("safe crowd direction," not "chaotic crowd control") *plus* the Twitch chat bridge — reach beyond the physical room, to any streamer's audience |
| **Best Code** | `README.md` architecture diagram, CI badge (all 3 services tested on every push), 52 tests across the stack |
| **GitHub Star** | Point them at the repo, the README screenshots, ask for a star before they walk away |

## What's still missing, if there's time before judging

- [ ] A recorded 30-60s demo GIF/video embedded in the README, as a fallback if live Wi-Fi fails during judging
- [ ] Warm up all 3 Render URLs ~5-10 min before your slot regardless of the keep-alive job
- [ ] Confirm the specific Day-1 workshop trend/problem to name in the "why it matters" section — this doc leaves that generic on purpose since only you know what was raised
- [ ] To demo the Twitch bridge live: have your own Twitch channel's chat open in a browser tab so *you* (not the judges) type `!lightning` etc. during the pitch — 10 seconds, framed as "proof it also works from Twitch," never as something you ask the room to do instead of the phone controller
