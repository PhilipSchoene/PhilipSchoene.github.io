(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.JGACore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = 7;
  var UNLOCK_LEAD_MINUTES = 120;
  var BINGO_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  var SLOT_DEFINITIONS = [
    { kind: "beer", label: "Strafbier", combo: ["🍺", "🍺", "🍺"] },
    { kind: "delegate", label: "Strafbier delegieren", combo: ["🍺", "👉", "🍺"] },
    { kind: "cheers", label: "Alle stoßen an", combo: ["🍻", "🍻", "🍻"] },
    { kind: "task", label: "Zusatzaufgabe", combo: ["🎲", "🎲", "🎲"] }
  ];

  function uid(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + "_" + crypto.randomUUID();
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function cards(prefix, titles) {
    return titles.map(function (title, index) {
      return { id: prefix + "_" + (index + 1), title: title };
    });
  }

  function slotCards(items) {
    return items.map(function (item, index) {
      return { id: "wild_" + (index + 1), title: item.title, kind: item.kind };
    });
  }

  function defaultConfig() {
    return {
      version: VERSION,
      title: "Vincents Aufgaben",
      eventDate: "2026-09-12",
      requiredTasks: cards("required", [
        "Überall, wo es Bier gibt: ein Bier kaufen und trinken",
        "Drei Doppelgänger finden und gemeinsame Fotos machen",
        "In jedem Restaurant nach etwas fragen, das nicht auf der Karte steht",
        "Ein Flunkyball-Duell organisieren und gewinnen",
        "Drei Nummern oder Instagram-Kontakte klären",
        "Einen völlig nutzlosen Gegenstand zum offiziellen JGA-Maskottchen ernennen und auf jedem Gruppenfoto unterbringen",
        "Drei Passanten nach ihrer professionellen Einschätzung zu einem völlig bedeutungslosen Gegenstand fragen",
        "10 Minuten nur in Fragen sprechen und dabei „Ja“, „Nein“ und „Ich“ vermeiden – nach 3 Fehlern ist Schluss",
        "Jedes Hinsetzen mit einem selbst gewählten Soundeffekt begleiten"
      ]),
      stations: [
        { id: "kart", title: "Kartfahren in Chemnitz", dayOffset: 0, time: "10:00", tasks: [] },
        { id: "lunch", title: "Mittagessen (optional)", dayOffset: 0, time: "", tasks: [] },
        { id: "leipzig", title: "Fahrt nach Leipzig", dayOffset: 0, time: "", tasks: [] },
        { id: "checkin", title: "Check-in im Hotel", dayOffset: 0, time: "", tasks: [] },
        { id: "duel", title: "Team-Duell", dayOffset: 0, time: "15:40", tasks: cards("duel", ["Nach dem Team-Duell eine übertriebene Sieger- oder Verlierer-Pressekonferenz geben"]) },
        { id: "dinner", title: "Abendessen", dayOffset: 0, time: "", tasks: [] },
        { id: "karaoke", title: "Karaokebar", dayOffset: 0, time: "21:00", tasks: cards("karaoke", ["Dreimal ein Udo-Lindenberg-Lied im Kostüm singen", "Mit der gesamten Karaokebar einen Song singen"]) },
        { id: "breakfast", title: "Frühstück", dayOffset: 1, time: "", tasks: [] },
        { id: "checkout", title: "Checkout Hotel", dayOffset: 1, time: "", tasks: [] },
        { id: "paintball", title: "Paintball", dayOffset: 1, time: "", tasks: [] },
        { id: "football", title: "RB Leipzig gegen HSV", dayOffset: 1, time: "15:30", tasks: cards("football", ["Eine Unterschrift von einem HSV-Spieler oder -Funktionär bekommen"]) },
        { id: "return", title: "Heimfahrt", dayOffset: 1, time: "", tasks: [] },
        { id: "vinni_home", title: "Wie kommt Vinni heim?", dayOffset: 1, time: "", tasks: [] }
      ],
      slotItems: slotCards([
        { title: "Strafbier", kind: "beer" },
        { title: "Strafbier delegieren", kind: "delegate" },
        { title: "Alle stoßen an", kind: "cheers" },
        { title: "Random Zusatzaufgabe", kind: "task" }
      ])
    };
  }

  function cleanText(value, fallback) {
    var text = String(value == null ? "" : value).trim();
    return text || fallback || "";
  }

  function uniqueId(candidate, prefix, used) {
    var id = cleanText(candidate).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id || used[id]) id = uid(prefix);
    used[id] = true;
    return id;
  }

  function normalizeTime(value) {
    var text = cleanText(value);
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : "";
  }

  function normalizeDate(value) {
    var text = cleanText(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function normalizeCardList(input, prefix) {
    var source = Array.isArray(input) ? input : [];
    var used = {};
    return source.map(function (item) {
      return {
        id: uniqueId(item && item.id, prefix, used),
        title: cleanText(item && item.title, "Unbenannter Eintrag")
      };
    });
  }

  function inferSlotKind(value, title) {
    var candidate = cleanText(value);
    if (SLOT_DEFINITIONS.some(function (definition) { return definition.kind === candidate; })) return candidate;
    var normalizedTitle = cleanText(title).toLocaleLowerCase("de-DE");
    if (/delegier|weitergeb|abgeben/.test(normalizedTitle)) return "delegate";
    if (/stoß|stoss|ansto|gemeinsam/.test(normalizedTitle)) return "cheers";
    if (/strafbier|\bbier\b/.test(normalizedTitle)) return "beer";
    return "task";
  }

  function normalizeSlotList(input) {
    var source = Array.isArray(input) ? input : [];
    var used = {};
    return source.map(function (item) {
      var title = cleanText(item && item.title, "Random Zusatzaufgabe");
      return {
        id: uniqueId(item && item.id, "slot", used),
        title: title,
        kind: inferSlotKind(item && item.kind, title)
      };
    });
  }

  function migrateLegacy(source) {
    var oldTasks = Array.isArray(source.tasks) ? source.tasks : [];
    var oldPhases = Array.isArray(source.phases) ? source.phases : [];
    var required = oldTasks.slice(0, 10).map(function (task) {
      return { id: task.id, title: task.title };
    });
    var remainder = oldTasks.slice(10);
    var stations = oldPhases.filter(function (phase) { return phase.id !== "any"; }).map(function (phase) {
      return {
        id: phase.id,
        title: phase.title,
        dayOffset: 0,
        time: "",
        tasks: remainder.filter(function (task) { return task.phaseId === phase.id; })
      };
    });
    var anytime = remainder.filter(function (task) { return task.phaseId === "any"; });
    if (anytime.length) stations.unshift({ id: "legacy_extra", title: "Weitere Aufgaben", dayOffset: 0, time: "", tasks: anytime });
    return {
      title: source.title,
      eventDate: "",
      requiredTasks: required,
      stations: stations,
      slotItems: (Array.isArray(source.rewards) ? source.rewards : []).concat(Array.isArray(source.punishments) ? source.punishments : [])
    };
  }

  function normalizeConfig(input) {
    var source = input && typeof input === "object" ? input : {};
    if (!Array.isArray(source.requiredTasks) && Array.isArray(source.tasks)) source = migrateLegacy(source);

    var requiredTasks = normalizeCardList(source.requiredTasks, "required");
    var stationIds = {};
    var stations = (Array.isArray(source.stations) ? source.stations : []).map(function (station, index) {
      return {
        id: uniqueId(station && station.id, "station", stationIds),
        title: cleanText(station && station.title, "Station " + (index + 1)),
        dayOffset: Number(station && station.dayOffset) === 1 ? 1 : 0,
        time: normalizeTime(station && station.time),
        tasks: normalizeCardList(station && station.tasks, "extra")
      };
    });

    return {
      version: VERSION,
      title: cleanText(source.title, "Vincents Aufgaben"),
      eventDate: normalizeDate(source.eventDate),
      requiredTasks: requiredTasks,
      stations: stations,
      slotItems: normalizeSlotList(source.slotItems)
    };
  }

  function fullPayload(config) {
    var c = normalizeConfig(config);
    return {
      v: VERSION,
      n: c.title,
      d: c.eventDate,
      q: c.requiredTasks.map(function (task) { return [task.id, task.title]; }),
      p: c.stations.map(function (station) {
        return [station.id, station.title, station.dayOffset, station.time, station.tasks.map(function (task) { return [task.id, task.title]; })];
      }),
      s: c.slotItems.map(function (item) { return [item.id, item.title, item.kind]; })
    };
  }

  function gamePayload(config) {
    var c = normalizeConfig(config);
    return {
      v: VERSION,
      n: c.title,
      d: c.eventDate,
      q: c.requiredTasks.map(function (task) { return [task.id, task.title]; }),
      x: c.stations.map(function (station, stationIndex) {
        return ["station_" + (stationIndex + 1), station.dayOffset, station.time, station.tasks.map(function (task, taskIndex) {
          return ["extra_" + (stationIndex + 1) + "_" + (taskIndex + 1), task.title];
        })];
      }),
      s: c.slotItems.map(function (item) { return [item.id, item.title, item.kind]; })
    };
  }

  function expandCards(items) {
    return (items || []).map(function (item) { return { id: item[0], title: item[1] }; });
  }

  function expandSlotItems(items) {
    return (items || []).map(function (item) { return { id: item[0], title: item[1], kind: item[2] }; });
  }

  function expand(payload) {
    if (!payload || typeof payload !== "object") throw new Error("Ungültige Spielkonfiguration");
    if (payload.requiredTasks || payload.stations || payload.slotItems) return normalizeConfig(payload);

    if (Array.isArray(payload.t)) {
      return normalizeConfig({
        title: payload.n,
        phases: (payload.p || []).map(function (phase) { return { id: phase[0], title: phase[1] }; }),
        tasks: payload.t.map(function (task) { return { id: task[0], title: task[1], phaseId: task[2] }; }),
        rewards: expandCards(payload.r),
        punishments: expandCards(payload.s)
      });
    }

    var stations;
    if (Array.isArray(payload.x)) {
      stations = payload.x.map(function (station, index) {
        return { id: station[0], title: "Station " + (index + 1), dayOffset: station[1], time: station[2], tasks: expandCards(station[3]) };
      });
    } else {
      stations = (payload.p || []).map(function (station) {
        return { id: station[0], title: station[1], dayOffset: station[2], time: station[3], tasks: expandCards(station[4]) };
      });
    }

    return normalizeConfig({
      title: payload.n,
      eventDate: payload.d,
      requiredTasks: expandCards(payload.q),
      stations: stations,
      slotItems: expandSlotItems(payload.s)
    });
  }

  function toBase64Url(text) {
    var bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text) : Buffer.from(text, "utf8");
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    var encoded = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    var encoded = String(value).replace(/-/g, "+").replace(/_/g, "/");
    while (encoded.length % 4) encoded += "=";
    var binary = typeof atob === "function" ? atob(encoded) : Buffer.from(encoded, "base64").toString("binary");
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return typeof TextDecoder !== "undefined" ? new TextDecoder().decode(bytes) : Buffer.from(bytes).toString("utf8");
  }

  function encodePayload(payload) {
    return toBase64Url(JSON.stringify(payload));
  }

  function encodeConfig(config) {
    return encodePayload(fullPayload(config));
  }

  function encodeGameConfig(config) {
    return encodePayload(gamePayload(config));
  }

  function decodeConfig(value) {
    return expand(JSON.parse(fromBase64Url(value)));
  }

  function stationUnlockTime(config, station) {
    var c = normalizeConfig(config);
    var match = c.eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var time = normalizeTime(station && station.time);
    if (!match || !time) return null;
    var clock = time.split(":");
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + (Number(station.dayOffset) === 1 ? 1 : 0), Number(clock[0]), Number(clock[1]), 0, 0).getTime() - UNLOCK_LEAD_MINUTES * 60 * 1000;
  }

  function isStationUnlocked(config, station, now) {
    var unlockAt = stationUnlockTime(config, station);
    var current = now instanceof Date ? now.getTime() : Number(now == null ? Date.now() : now);
    return unlockAt !== null && current >= unlockAt;
  }

  function unlockedTasks(config, now) {
    var c = normalizeConfig(config);
    var result = [];
    c.stations.forEach(function (station) {
      if (isStationUnlocked(c, station, now)) result = result.concat(station.tasks);
    });
    return result;
  }

  function freshPlayState(config) {
    var c = normalizeConfig(config);
    return { fingerprint: encodeGameConfig(c), completedTaskIds: [], usedSlotIds: [], lastSlotId: null };
  }

  function normalizePlayState(input, config) {
    var c = normalizeConfig(config);
    var state = input && typeof input === "object" ? input : {};
    var valid = {};
    c.slotItems.forEach(function (item) { valid[item.id] = true; });
    var validTasks = {};
    c.requiredTasks.forEach(function (task) { validTasks[task.id] = true; });
    var completed = (Array.isArray(state.completedTaskIds) ? state.completedTaskIds : []).filter(function (id, index, all) {
      return validTasks[id] && all.indexOf(id) === index;
    });
    var legacyUsed = (state.usedRewardIds || []).concat(state.usedPunishmentIds || []);
    var sourceUsed = Array.isArray(state.usedSlotIds) ? state.usedSlotIds : legacyUsed;
    var used = sourceUsed.filter(function (id, index, all) { return valid[id] && all.indexOf(id) === index; });
    var legacyLast = state.lastRewardId || state.lastPunishmentId;
    var last = state.lastSlotId || legacyLast;
    return {
      fingerprint: encodeGameConfig(c),
      completedTaskIds: completed,
      usedSlotIds: used,
      lastSlotId: valid[last] ? last : null
    };
  }

  function bingoLineCount(completedIds, taskIds) {
    if (!Array.isArray(taskIds) || taskIds.length !== 9) return 0;
    var completed = {};
    (completedIds || []).forEach(function (id) { completed[id] = true; });
    return BINGO_LINES.filter(function (line) {
      return line.every(function (index) { return completed[taskIds[index]]; });
    }).length;
  }

  function hasBingo(completedIds, taskIds) {
    return bingoLineCount(completedIds, taskIds) > 0;
  }

  function slotCombo(item) {
    var kind = inferSlotKind(item && item.kind, item && item.title);
    var definition = SLOT_DEFINITIONS.find(function (entry) { return entry.kind === kind; });
    return definition.combo.slice();
  }

  function slotDefinitions() {
    return SLOT_DEFINITIONS.map(function (definition) {
      return { kind: definition.kind, label: definition.label, combo: definition.combo.slice() };
    });
  }

  function slotSymbols() {
    var result = [];
    SLOT_DEFINITIONS.forEach(function (definition) {
      definition.combo.forEach(function (symbol) {
        if (result.indexOf(symbol) === -1) result.push(symbol);
      });
    });
    return result;
  }

  function idleSlotCombo() {
    return ["🍺", "🍻", "🎲"];
  }

  function pickRandom(items, usedIds, random) {
    var used = {};
    (usedIds || []).forEach(function (id) { used[id] = true; });
    var available = (items || []).filter(function (item) { return !used[item.id]; });
    if (!available.length) return null;
    var rng = typeof random === "function" ? random : Math.random;
    return available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  }

  return {
    VERSION: VERSION,
    UNLOCK_LEAD_MINUTES: UNLOCK_LEAD_MINUTES,
    uid: uid,
    defaultConfig: defaultConfig,
    normalizeConfig: normalizeConfig,
    encodeConfig: encodeConfig,
    encodeGameConfig: encodeGameConfig,
    decodeConfig: decodeConfig,
    stationUnlockTime: stationUnlockTime,
    isStationUnlocked: isStationUnlocked,
    unlockedTasks: unlockedTasks,
    freshPlayState: freshPlayState,
    normalizePlayState: normalizePlayState,
    bingoLineCount: bingoLineCount,
    hasBingo: hasBingo,
    slotCombo: slotCombo,
    slotDefinitions: slotDefinitions,
    slotSymbols: slotSymbols,
    idleSlotCombo: idleSlotCombo,
    pickRandom: pickRandom
  };
});
