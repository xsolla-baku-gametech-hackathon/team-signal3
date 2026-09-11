const GITHUB_URL = 'https://github.com/xsolla-baku-gametech-hackathon/team-signal3'

function Section({
  id,
  title,
  subtitle,
  children,
  last,
}: {
  id?: string
  title: string
  subtitle?: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <section id={id} className={`py-16 ${last ? '' : 'border-b border-white/10'}`}>
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        {subtitle && <p className="text-slate-400 max-w-xl mb-8">{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-slate-900/60 p-6">
      <h3 className="text-cyan-300 font-bold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-cyan-400/30 px-3 py-1 font-mono text-xs font-bold text-slate-400">
      {children}
    </span>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,_#0d1f2e_0%,_#03050c_55%)] font-sans text-white">
      <header className="border-b border-white/10 px-6 py-24 text-center">
        <p className="mb-4 font-mono text-xs font-extrabold uppercase tracking-[0.25em] text-cyan-300">
          Crowd Director · SDK Docs
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Let a live audience <span className="text-cyan-300">direct</span> your game.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
          A crowd votes on intent from their phones. A Rule Engine + AI Director turn those votes
          into safe, real-time game events. <code className="text-cyan-200">CrowdDirectorClient</code>{' '}
          is the two-call SDK that connects any game engine to that pipeline.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#quickstart"
            className="rounded-lg bg-cyan-300 px-6 py-3 font-mono text-sm font-extrabold text-slate-950"
          >
            Get started →
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
            className="rounded-lg border border-cyan-400/30 px-6 py-3 font-mono text-sm font-extrabold text-white"
          >
            View on GitHub
          </a>
        </div>
      </header>

      <Section
        title="Why this exists"
        subtitle="Letting a crowd directly control a character is chaos. Crowd Director treats the crowd as advisors to a director instead of the controller itself — so the experience stays coherent no matter how many people are voting."
      >
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm font-bold">
          {['Crowd votes (phone)', 'Rule Engine baseline', 'AI Director (optional)', 'Game event'].map(
            (step, i, arr) => (
              <div key={step} className="flex items-center gap-3">
                <span className="rounded-lg border border-cyan-400/30 bg-slate-900/60 px-4 py-2">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-slate-500">→</span>}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="What the SDK gives you" subtitle="No engine-specific code. No Socket.IO wiring to write yourself.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card title="Engine-agnostic">
            Published as <code>@crowd-director/sdk</code> — no Three.js, Unity, or Phaser types
            anywhere inside. Install it into any runtime that can hold a WebSocket.
          </Card>
          <Card title="Handles the hard parts">
            Room join, reconnection, and typed events are all internal. Your game only reacts to{' '}
            <code>onGameEvent</code> and reports its own state.
          </Card>
          <Card title="Proven twice">
            Runs unmodified inside a full Three.js game and inside a ~100-line vanilla{' '}
            <code>&lt;canvas&gt;</code> host with zero game engine at all.
          </Card>
        </div>
      </Section>

      <Section id="quickstart" title="Quick start" subtitle="Three steps — no game-engine glue code.">
        <div className="grid gap-6">
          {[
            {
              title: 'Install the SDK',
              body: (
                <>
                  <code>npm install @crowd-director/sdk</code> — a standalone, versioned package
                  built from the same client this repo's <code>game3d/</code> and{' '}
                  <code>examples/minimal-canvas-integration/</code> both run unmodified.
                </>
              ),
            },
            {
              title: 'Connect and listen for events',
              body: (
                <>
                  See the code sample below — <code>connect()</code> and{' '}
                  <code>reportGameState()</code> are the only two calls you need.
                </>
              ),
            },
            {
              title: 'Point it at a room',
              body: (
                <>
                  Run the <code>server/</code> package (or the hosted deployment), give every
                  client the same <code>roomId</code>, and votes from the controller drive your
                  game live.
                </>
              ),
            },
          ].map((step, i) => (
            <div key={step.title} className="grid grid-cols-[36px_1fr] gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300 font-mono font-extrabold text-cyan-300">
                {i + 1}
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <pre className="mt-8 overflow-x-auto rounded-xl border border-cyan-400/30 bg-slate-950 p-6 font-mono text-sm leading-relaxed text-cyan-50">
          <code>{`npm install @crowd-director/sdk
`}</code>
        </pre>

        <pre className="mt-4 overflow-x-auto rounded-xl border border-cyan-400/30 bg-slate-950 p-6 font-mono text-sm leading-relaxed text-cyan-50">
          <code>{`import { CrowdDirectorClient } from '@crowd-director/sdk';

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
client.reportGameState({ hp: player.health, shield: player.armor, score, wave });`}</code>
        </pre>
      </Section>

      <Section title="Events the SDK delivers" subtitle="Abstract intents — your game decides what each one means.">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left font-mono text-xs uppercase tracking-wider text-cyan-300">
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Typical meaning</th>
                <th className="py-2">Your game could...</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              {[
                ['HEAL', 'Crowd chose to help', 'Restore HP, drop a shield pickup'],
                ['LIGHTNING', 'Quick offensive strike', 'Damage nearby enemies'],
                ['STORM', 'Area-wide hazard/clear', 'Sweep the arena, change weather'],
                ['SPAWN_ZOMBIE', 'Escalation', 'Spawn an enemy / obstacle'],
                ['BOSS', 'Major escalation', 'Trigger a boss encounter'],
                ['VIP_SHIELD', 'Master Director privilege', 'Guaranteed rescue, reserved for top-tier voters'],
              ].map(([event, meaning, could]) => (
                <tr key={event} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-semibold text-white">{event}</td>
                  <td className="py-3 pr-4">{meaning}</td>
                  <td className="py-3">{could}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Bringing it to an existing game"
        subtitle="You don't rewrite your game to adopt Crowd Director — you wire three things it already has into three SDK calls."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card title="1. Install, don't rewrite">
            <code>npm install @crowd-director/sdk</code>. No engine plugin, no core loop changes —
            the client is a plain object your game holds a reference to.
          </Card>
          <Card title="2. Map events to what you already have">
            In <code>onGameEvent</code>, call the functions your game already exposes —{' '}
            <code>spawnEnemy()</code>, <code>healPlayer()</code>,{' '}
            <code>triggerBossFight()</code> — instead of writing new gameplay code.
          </Card>
          <Card title="3. Report the state you already track">
            <code>reportGameState()</code> just forwards fields your game loop already computes
            (hp, score, wave). No new state to invent.
          </Card>
        </div>

        <pre className="mt-8 overflow-x-auto rounded-xl border border-cyan-400/30 bg-slate-950 p-6 font-mono text-sm leading-relaxed text-cyan-50">
          <code>{`// Inside a game you didn't write for Crowd Director:
client.onGameEvent((event) => {
  switch (event.type) {
    case 'SPAWN_ZOMBIE': game.spawnEnemy(); break;
    case 'HEAL':          game.healPlayer(event.amount); break;
    case 'BOSS':          game.triggerBossFight(); break;
    // map the rest to whatever your game already does
  }
});

// Somewhere your update loop already runs:
client.reportGameState({ hp: game.player.hp, score: game.score, wave: game.wave, ... });`}</code>
        </pre>

        <p className="mt-6 text-sm text-slate-400">
          This is exactly what <code>examples/minimal-canvas-integration/</code> proves: the same
          two SDK calls, dropped into a host that shares zero code with{' '}
          <code>game3d/</code> — no fork, no engine-specific build, five lines of glue.
        </p>
      </Section>

      <Section
        title="Architecture at a glance"
        subtitle="Every service talks Socket.IO only — the game and controller never talk to each other directly."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card title="server/">
            Room state, vote aggregation, Rule Engine, AI Director (Gemini, swappable), voter tier
            scoring, chat relay.
          </Card>
          <Card title="controller/">
            Angular app — the crowd's phone screen (vote buttons, DP/tier badge, chat) and an
            operator dashboard.
          </Card>
          <Card title="game3d/ & examples/">
            The reference game (Three.js) and a minimal vanilla-canvas integration proving the SDK
            is engine-agnostic.
          </Card>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {['Node.js', 'TypeScript', 'Socket.IO', 'Google Gemini', 'Angular', 'Three.js', 'Vite', 'Vitest', 'Docker', 'Render'].map(
            (tech) => (
              <Pill key={tech}>{tech}</Pill>
            ),
          )}
        </div>
      </Section>

      <footer className="px-6 py-14 text-center text-sm text-slate-500">
        Built for the Xsolla Baku GameTech Hackathon (Sept 9–11, 2026).
        <br />
        <a href={GITHUB_URL} target="_blank" rel="noopener" className="underline">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}

export default App
