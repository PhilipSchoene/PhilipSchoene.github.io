// Der gemeinsame Stand für alle Handys.
// Ein Durable Object ist eine einzige Instanz, die alles der Reihe nach
// abarbeitet. Zwei gleichzeitige Taps können sich also nicht überschreiben.
//
// Kostet auf dem Workers-Free-Plan nichts. Deploy steht in der README.

import { DurableObject } from "cloudflare:workers";

const EMPTY = { phase: "p0", tasks: {}, log: [], bier: 0 };

// Wortgleich in index.html. Änderungen immer in beiden Dateien.
function applyEvent(s, e) {
  const T = s.tasks;
  const L = (m) => {
    s.log.unshift({ t: Date.now(), m });
    s.log = s.log.slice(0, 80);
  };

  if (e.type === "trigger") {
    T[e.id] = { s: "active", by: e.by, prog: 0 };
    L(e.by + " löst aus: " + e.title);
  } else if (e.type === "bump") {
    const c = T[e.id] || {};
    const n = (c.prog || 0) + 1;
    if (e.target && n >= e.target) {
      T[e.id] = { s: "done", by: c.by, prog: n };
      L("Erledigt: " + e.title + " (+" + e.pts + ")");
    } else {
      T[e.id] = { s: "active", by: c.by, prog: n };
      L(e.title + ": " + n + " von " + e.target);
    }
  } else if (e.type === "finish") {
    const d = T[e.id] || {};
    T[e.id] = { s: e.ok ? "done" : "fail", by: d.by, prog: d.prog || 0 };
    if (e.ok) {
      L("Erledigt: " + e.title + " (+" + e.pts + ")");
    } else {
      s.bier = (s.bier || 0) + 1;
      L("Gescheitert: " + e.title + ". Strafbier für Vince.");
    }
  } else if (e.type === "reopen") {
    T[e.id] = { s: "open", prog: 0 };
    L("Zurückgesetzt: " + e.title);
  } else if (e.type === "phase") {
    s.phase = e.id;
    L("Neue Phase: " + e.title);
  } else if (e.type === "bier") {
    s.bier = (s.bier || 0) + 1;
    L(e.by + " bucht ein Bier für Vince");
  } else if (e.type === "reset") {
    s = {
      phase: "p0",
      tasks: {},
      log: [{ t: Date.now(), m: "Neustart durch " + e.by }],
      bier: 0,
    };
  }
  return s;
}

export class Room extends DurableObject {
  async load() {
    return (await this.ctx.storage.get("state")) || structuredClone(EMPTY);
  }

  async fetch(request) {
    // Kein WebSocket? Dann einfach den Stand als JSON, praktisch zum Testen.
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response(JSON.stringify(await this.load()), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Hibernation: das Objekt darf schlafen, die Sockets bleiben offen.
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(await this.load()));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(sock, raw) {
    let e;
    try {
      e = JSON.parse(raw);
    } catch {
      return;
    }
    if (!e || typeof e.type !== "string") return;

    let s = await this.load();
    s = applyEvent(s, e);
    await this.ctx.storage.put("state", s);

    const out = JSON.stringify(s);
    for (const other of this.ctx.getWebSockets()) {
      try {
        other.send(out);
      } catch {
        /* ist gegangen, egal */
      }
    }
  }

  async webSocketClose(sock, code, reason, clean) {
    try {
      sock.close(code === 1006 ? 1000 : code, reason);
    } catch {
      /* schon zu */
    }
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    // Ein Raum für alle. Für mehrere JGAs hier den Namen aus der URL nehmen.
    const id = env.ROOM.idFromName("jga");
    return env.ROOM.get(id).fetch(request);
  },
};
