# Handoff prompt — JGA task app for Vincent

Paste everything below into a fresh chat. If you still have `index.html`,
`worker.js` and `wrangler.toml`, attach them too — then the new model can edit
rather than rebuild. Without them it can rebuild from this spec alone.

---

## What I'm building

A web app for my friend Vincent's stag do (Junggesellenabschied) in
Chemnitz/Leipzig. Six of us, all German — UI text must be German, you can talk
to me in English.

The premise: Vincent is the target, we are the gang. We assign him tasks
during the weekend. Anyone in the gang can **trigger** a task from their phone
at the moment it fits; whoever is standing next to Vincent marks it done or
failed. Everyone sees the same live state. Failed tasks earn him a penalty
beer.

Crucially this is inverted from a normal scavenger hunt app: it is not one
player working through a pre-authored list. It is many controllers firing tasks
live at one target. That spontaneity is the game.

## Architecture (already decided, please don't relitigate)

- **Frontend:** one self-contained `index.html`, no build step, no framework,
  vanilla JS, hosted on GitHub Pages. Everyone adds it to their phone's home
  screen so it runs fullscreen.
- **Backend:** a Cloudflare Worker with a **Durable Object** (`worker.js` +
  `wrangler.toml`). Free on the Workers free plan. Deployed with
  `wrangler deploy`, not the dashboard, because DOs need a migration. Use
  `new_sqlite_classes` in the migration — the free plan can only create
  SQLite-backed Durable Objects.
- **Sync:** WebSockets, so state changes appear on every phone in under a
  second. No polling.
- **Event-sourced, and this matters.** Clients never send state. They send
  events like `{type:'trigger', id:'r4', title:'…', pts:30, by:'Danny'}`. The
  Durable Object is single-threaded, applies events in order, persists, then
  broadcasts the full new state to all sockets. Three people tapping "+1" on
  the same task in the same second produce 3, not 1. An earlier version PUT the
  whole state blob and silently lost concurrent edits — don't go back to that.
- **One reducer, `applyEvent(state, event)`, duplicated byte-identically in
  `index.html` and `worker.js`.** Solo mode (no sync URL) applies it locally in
  the browser; shared mode applies it on the server. If you change it, change
  it in both files and say so.
- **Offline:** when a sync URL is configured but the socket is down, events go
  into a queue and are flushed on reconnect. They are *not* applied locally,
  so nothing gets double-booked.
- Sync URL is entered per phone in a Setup tab, stored in `localStorage`. Empty
  URL = solo mode, each phone keeps its own book. No auth on the Worker — fine
  for six friends who all have the link.

## Data model

```js
state = {
  phase: 'p3',                                    // current programme phase
  tasks: { r4: { s:'active', by:'Danny', prog:2 } }, // s: open|active|done|fail
  log:   [ { t: 1757000000000, m: 'Danny löst aus: …' } ],  // newest first, cap 80
  bier:  3                                        // beers Vincent owes
}
```

Event types: `trigger`, `bump` (increment a counter task), `finish` (with
`ok:true|false`), `reopen`, `phase`, `bier`, `reset`. Events carry `title` and
`pts` so the server can compose German log lines without knowing the task list.

## Programme phases

Anyone can switch the phase and it switches for everyone. Tasks bound to a
phase only appear during it.

| id | phase | when |
|---|---|---|
| p0 | Vince einsammeln | Samstag früh |
| p1 | Kartfahren Chemnitz | Samstag 10:00 |
| p2 | Mittag & Fahrt nach Leipzig | Samstag Mittag |
| p3 | Team-Duell | Samstag 15:40–18:30 |
| p4 | Abendessen | Samstag Abend |
| p5 | Karaokebar | Samstag Nacht |
| p6 | Frühstück & Checkout | Sonntag Morgen |
| p7 | Paintball | Sonntag Vormittag |
| p8 | RB Leipzig gegen HSV | Sonntag Nachmittag |
| p9 | Heimfahrt | Sonntag Abend |

## The tasks

`ph:'any'` = available in every phase. `ph:'p7'` = only during that phase.
`booze:true` = automatically locked during Kartfahren (p1) and Paintball (p7),
because neither venue will let him. `target:n` = counter task with a `+1`
button that auto-completes at `n`.

```js
var TASKS=[
 {id:'r1',t:'Fußballduell gegen einen Fremden gewinnen',c:'random',p:20,ph:'any'},
 {id:'r2',t:'Mit einem Zaubertrick jemanden zum Staunen bringen',c:'random',p:15,ph:'any'},
 {id:'r3',t:'Trade-Up: aus dem Feuerzeug etwas Wertvolles machen',c:'random',p:40,ph:'any',n:'Ziel-Coolness legt die Gang fest'},
 {id:'r4',t:'3 Nummern klären',c:'random',p:30,ph:'any',target:3},
 {id:'r5',t:'5 Doppelgänger finden und Foto machen',c:'random',p:30,ph:'any',target:5},
 {id:'r6',t:'Witz erzählen, der wirklich Lachen auslöst',c:'random',p:10,ph:'any'},
 {id:'r7',t:'Armdrücken gewinnen',c:'random',p:15,ph:'any'},
 {id:'r8',t:'Liegestütz-Duell gewinnen',c:'random',p:15,ph:'any'},
 {id:'r9',t:'Kurz den Job eines Straßenkünstlers übernehmen',c:'random',p:30,ph:'any'},
 {id:'r10',t:'3 mal Fremden helfen',c:'random',p:20,ph:'any',target:3},
 {id:'r11',t:'Geheimwort sagen lassen, ohne es selbst zu benutzen',c:'random',p:25,ph:'any',n:'Wort kommt von der Gang'},
 {id:'r12',t:'5 mal jemanden verarschen (reingeguckt, du hast da was)',c:'random',p:15,ph:'any',target:5},
 {id:'r13',t:'Komplette Konversation auf Englisch, obwohl der andere Deutsch kann',c:'random',p:20,ph:'any'},
 {id:'r14',t:'Nach etwas fragen, was zu Recht nicht auf der Karte steht',c:'random',p:15,ph:'any'},
 {id:'r15',t:'3 mal Schere, Stein, Papier um Schnaps gewinnen',c:'random',p:20,ph:'any',target:3,booze:true},
 {id:'r16',t:'Zu keiner Frage von Fremden nein sagen',c:'random',p:25,ph:'any'},
 {id:'r17',t:'Flunkyball-Duell organisieren und gewinnen',c:'random',p:35,ph:'any',booze:true},

 {id:'s1',t:'Überall wo es Bier gibt eins kaufen und trinken',c:'solo',p:20,ph:'any',booze:true},
 {id:'s2',t:'Etwas sehr Scharfes essen',c:'solo',p:15,ph:'any'},
 {id:'s3',t:'Schellenwette gewinnen',c:'solo',p:15,ph:'any'},
 {id:'s4',t:'Etwas tun, was den Thug-Life-Stock verdient hätte',c:'solo',p:20,ph:'any'},
 {id:'s5',t:'Eine Trophäe organisieren (Bierdeckel, Kuli, Schild vom Tisch)',c:'solo',p:10,ph:'any'},
 {id:'s6',t:'2 Colabier nacheinander exen',c:'solo',p:20,ph:'any',booze:true},
 {id:'s7',t:'Von jedem von uns eine Wenn-ich-du-wäre-Aufgabe erledigen',c:'solo',p:30,ph:'any',target:5},
 {id:'s8',t:'Edward Bierhands: Dosen an beide Hände getapet und leer trinken',c:'solo',p:25,ph:'any',booze:true},
 {id:'s9',t:'Einen coolen Stunt machen',c:'solo',p:20,ph:'any'},
 {id:'s10',t:'Sprint durch die Menschenmenge',c:'solo',p:10,ph:'any'},
 {id:'s11',t:'Mindestens 100 Euro Glücksspiel-Gewinn',c:'solo',p:40,ph:'any'},
 {id:'s12',t:'Einen Baum hochklettern',c:'solo',p:15,ph:'any'},

 {id:'a1',t:'Instruktor eine Frage stellen, die er gerade erklärt hat',c:'act',p:15,ph:'p1'},
 {id:'a2',t:'Schnellste Runde einer Kart-Session',c:'act',p:30,ph:'p1'},
 {id:'a3',t:'Cooles Überholmanöver',c:'act',p:20,ph:'p1'},
 {id:'a4',t:'Team-Duell gewinnen',c:'act',p:40,ph:'p3'},
 {id:'a5',t:'2 einzelne Runden fürs Team holen',c:'act',p:25,ph:'p3',target:2},
 {id:'a6',t:'3 mal Udo Lindenberg singen, im Kostüm',c:'act',p:35,ph:'p5',target:3},
 {id:'a7',t:'Mit der ganzen Karaokebar einen Song singen',c:'act',p:30,ph:'p5'},
 {id:'a8',t:'Instruktor eine Frage stellen, die er gerade erklärt hat',c:'act',p:15,ph:'p7'},
 {id:'a9',t:'4er Abschussserie im Paintball',c:'act',p:35,ph:'p7'},
 {id:'a10',t:'Abschuss aus über 50 Metern',c:'act',p:30,ph:'p7'},
 {id:'a11',t:'Unterschrift von einem HSV-Spieler oder Funktionär',c:'act',p:40,ph:'p8'},
 {id:'a12',t:'Endergebnis RB gegen HSV richtig tippen',c:'act',p:30,ph:'p8'}
];
```

Categories displayed as: `random` → "Randoms", `solo` → "Solo", `act` →
"Aktion". Point tiers: 150 = "Bronze am Bierbauch", 300 = "Ehrenmann",
450 = "Legende von Leipzig". Total available is 985.

## Screens

Bottom tab bar, five tabs. Horizontal phase strip under the header, always
visible.

1. **Aufgaben** — the live task fills a big red hero card at the top with
   Geschafft / Verkackt / +1 buttons and a "In die Gruppe schicken" button that
   fires `navigator.share`. Below: three-up score row (Punkte, geschafft, Bier
   offen), filter chips (Jetzt möglich / Alle / Randoms / Solo / Aktion /
   Abgehakt), then the task list. Empty state when nothing is live: "Nichts
   läuft. Löse eine Aufgabe aus."
2. **Programm** — numbered phase list, tap to jump, shows per-phase completion.
3. **Feed** — chronological log of who triggered and marked what.
4. **Stand** — progress bars for the point tiers, completion, beer count.
5. **Setup** — name, sync URL, connection status, reset.

Header shows connection state: "live für alle" / "verbinde …" / "nur dieses
Handy".

## Visual style (keep it)

Deep racing blue `#0F2138` background, cards `#16304F`, borders
`rgba(125,151,186,.28)`, text `#EEF3FA`, muted `#7D97BA`. Signal yellow
`#FFD400` for actions and points, `#F2402E` for the live task, `#2FD17A` for
done. Helvetica/Arial, weight 900 and tight negative letter-spacing on
headings, tabular numbers for the scoreboard. One bold flourish: a
hazard-tape diagonal stripe across the top of the live card. No all-caps
labels, no emoji in body copy.

## Decisions already taken — reasons, so you don't redo the reasoning

- **No web push.** Static hosting can't send push; it needs a push service
  signing messages server-side, and on iOS every person would have to add the
  site to their home screen first. Instead the live task has a share button
  that drops the text into our existing WhatsApp/Telegram group, which pushes
  properly. Don't build fake notifications.
- **No Telegram bot round-trip.** Sending from the browser is easy, but
  receiving Vincent's replies needs `getUpdates` polling or a webhook, and
  concurrent pollers steal each other's updates. Also Vincent is the worst
  possible referee — drunk, in a kart, and financially interested in the
  outcome. The gang judges, not the candidate.
- **No off-the-shelf platform.** Checked Goosechase (priced for corporates,
  upward of $49/participant for a single event) and Actionbound (German, free
  for private use, JGA is an advertised use case). Both are built for players
  working through a pre-authored mission list, not for live triggering by
  others. Structural mismatch.
- **One content change from my original list:** "etwas klauen" became "eine
  Trophäe organisieren (Bierdeckel, Kuli, Schild vom Tisch)". Keep it that way.

## What's still open — this is what I want help with

1. **Scheduled phase transitions.** Durable Objects have alarms. I want the
   phase to advance itself at the programme times (10:00 karting, 15:40
   Team-Duell, and so on) so nobody has to remember, while still allowing a
   manual override. Roughly 30 lines, apparently.
2. **Untested WebSocket plumbing.** The reducer has been tested against
   concurrent event streams and client and server agree. The live socket path
   has never run against a deployed Worker. First job is to deploy and open it
   on two phones.
3. Optionally: a bingo card view as a fallback (original idea was bingo, one
   beer per line), and a Vincent-only mode showing just the currently active
   task.

## How I want you to work

Short, precise answers. Tell me plainly when you don't know something or
haven't tested something rather than sounding confident. Don't invent library
behaviour or Cloudflare limits — check them. A bit of humour is welcome.
