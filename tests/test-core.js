"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs");
var vm = require("node:vm");
var Core = require("../game-core.js");

function testDefaultUsesPollWinners() {
  var config = Core.defaultConfig();
  assert.equal(config.requiredTasks.length, 9);
  assert.equal(config.stations.length, 13);
  assert.equal(config.eventDate, "2026-09-12");
  assert.deepEqual(config.requiredTasks.map(function (task) { return task.title; }), [
    "Überall, wo es Bier gibt: ein Bier kaufen und trinken",
    "Drei Doppelgänger finden und gemeinsame Fotos machen",
    "In jedem Restaurant nach etwas fragen, das nicht auf der Karte steht",
    "Ein Flunkyball-Duell organisieren und gewinnen",
    "Drei Nummern oder Instagram-Kontakte klären",
    "Einen völlig nutzlosen Gegenstand zum offiziellen JGA-Maskottchen ernennen und auf jedem Gruppenfoto unterbringen",
    "Drei Passanten nach ihrer professionellen Einschätzung zu einem völlig bedeutungslosen Gegenstand fragen",
    "10 Minuten nur in Fragen sprechen und dabei „Ja“, „Nein“ und „Ich“ vermeiden – nach 3 Fehlern ist Schluss",
    "Jedes Hinsetzen mit einem selbst gewählten Soundeffekt begleiten"
  ]);
  assert.deepEqual(config.stations.filter(function (station) { return station.tasks.length; }).map(function (station) {
    return [station.id, station.time, station.tasks.map(function (task) { return task.title; })];
  }), [
    ["duel", "15:40", ["Nach dem Team-Duell eine übertriebene Sieger- oder Verlierer-Pressekonferenz geben"]],
    ["karaoke", "21:00", ["Dreimal ein Udo-Lindenberg-Lied im Kostüm singen", "Mit der gesamten Karaokebar einen Song singen"]],
    ["football", "15:30", ["Eine Unterschrift von einem HSV-Spieler oder -Funktionär bekommen"]]
  ]);
  assert.deepEqual(config.slotItems.map(function (item) { return item.title; }), [
    "Strafbier",
    "Strafbier delegieren",
    "Bier-Buddy",
    "Nochmal drehen",
    "Alle außer dir trinken",
    "Random",
    "Aufgabenboss"
  ]);
  assert.deepEqual(config.slotItems.map(function (item) { return item.kind; }), ["beer", "delegate", "buddy", "respin", "others", "task", "boss"]);
}

function testUnicodeRoundTrip() {
  var original = Core.defaultConfig();
  original.title = "Abfahrt Hypezig – Größe, Spaß & ✓";
  original.eventDate = "2030-05-04";
  original.requiredTasks[0].title = "In Köln fünf Grüße verteilen: ÄÖÜ äöü ß 🎉";
  original.stations[0].title = "Überraschung in Chemnitz";
  original.slotItems[0].title = "Ein Getränk nach freier Wahl 🍺";
  assert.deepEqual(Core.decodeConfig(Core.encodeConfig(original)), Core.normalizeConfig(original));
}

function testGameLinkHidesStationNames() {
  var original = Core.defaultConfig();
  original.eventDate = "2030-05-04";
  var decoded = Core.decodeConfig(Core.encodeGameConfig(original));
  var sourceIndex = original.stations.findIndex(function (station) { return station.tasks.length; });
  assert.equal(decoded.stations[sourceIndex].title, "Station " + (sourceIndex + 1));
  assert.notEqual(decoded.stations[sourceIndex].title, original.stations[sourceIndex].title);
  assert.equal(decoded.stations[sourceIndex].id, "station_" + (sourceIndex + 1));
  assert.equal(decoded.stations[sourceIndex].tasks[0].id, "extra_" + (sourceIndex + 1) + "_1");
  assert.equal(decoded.stations[sourceIndex].time, original.stations[sourceIndex].time);
  assert.deepEqual(decoded.stations[sourceIndex].tasks.map(function (task) { return task.title; }), original.stations[sourceIndex].tasks.map(function (task) { return task.title; }));
}

function testTimedUnlocks() {
  var config = Core.defaultConfig();
  config.eventDate = "2030-05-04";
  config.stations[0].time = "10:00";
  config.stations[9].time = "11:30";

  assert.equal(Core.UNLOCK_LEAD_MINUTES, 120);
  assert.equal(Core.isStationUnlocked(config, config.stations[0], new Date(2030, 4, 4, 7, 59)), false);
  assert.equal(Core.isStationUnlocked(config, config.stations[0], new Date(2030, 4, 4, 8, 0)), true);
  assert.equal(Core.isStationUnlocked(config, config.stations[9], new Date(2030, 4, 5, 9, 29)), false);
  assert.equal(Core.isStationUnlocked(config, config.stations[9], new Date(2030, 4, 5, 9, 30)), true);
  assert.equal(Core.isStationUnlocked(config, config.stations[1], new Date(2030, 4, 9, 12, 0)), false);
}

function testWeightedSlotOdds() {
  var pool = Core.defaultConfig().slotItems;
  var counts = {};
  // Sweep the random input uniformly, deterministically, including every outcome.
  for (var i = 0; i < 4200; i += 1) {
    var item = Core.pickSlot(pool, function () { return (i + 0.5) / 4200; });
    counts[item.kind] = (counts[item.kind] || 0) + 1;
  }
  assert.deepEqual(counts, { beer: 1200, delegate: 500, buddy: 500, respin: 500, others: 500, task: 500, boss: 500 });
  assert.equal(Core.pickSlot(pool, function () { return 0; }).kind, "beer");
  assert.equal(Core.pickSlot(pool, function () { return 2 / 7 - Number.EPSILON; }).kind, "beer");
  assert.equal(Core.pickSlot(pool, function () { return 2 / 7; }).kind, "delegate");
  assert.equal(Core.pickSlot(pool, function () { return 1 - Number.EPSILON; }).kind, "boss");
  assert.equal(Core.pickSlot([], function () { return 0; }), null);
  assert.equal(Core.pickSlot([pool[0]], function () { return 0.99; }), pool[0]);
}

function testSlotResultMatchesReels() {
  assert.deepEqual(Core.slotCombo({ kind: "beer", title: "Text ist frei" }), ["🍺", "🍺", "🍺"]);
  assert.deepEqual(Core.slotCombo({ kind: "delegate", title: "Text ist frei" }), ["🍺", "👉", "🍺"]);
  assert.deepEqual(Core.slotCombo({ kind: "cheers", title: "Text ist frei" }), ["🍻", "🍻", "🍻"]);
  assert.deepEqual(Core.slotCombo({ kind: "buddy" }), ["🍻", "🍻", "🍻"]);
  assert.deepEqual(Core.slotCombo({ kind: "respin" }), ["🔄", "🔄", "🔄"]);
  assert.deepEqual(Core.slotCombo({ kind: "others" }), ["👥", "👥", "👥"]);
  assert.deepEqual(Core.slotCombo({ kind: "boss" }), ["👑", "👑", "👑"]);
  assert.deepEqual(Core.slotCombo({ kind: "task", title: "Text ist frei" }), ["🎲", "🎲", "🎲"]);
  assert.deepEqual(Core.slotSymbols(), ["🍺", "👉", "🍻", "🔄", "👥", "🎲", "👑"]);
  assert.deepEqual(Core.idleSlotCombo(), ["🍺", "🍻", "🎲"]);
  assert.deepEqual(Core.slotCombo({ title: "Freie Überraschung" }), ["🎲", "🎲", "🎲"]);
  var combos = Core.defaultConfig().slotItems.map(function (item) { return Core.slotCombo(item).join(""); });
  assert.equal(new Set(combos).size, 7, "Every outcome must have a distinct reel combination");
}

function testNewSlotDeckPreservesBingo() {
  var config = Core.defaultConfig();
  var completed = config.requiredTasks.slice(0, 3).map(function (task) { return task.id; });
  var state = Core.normalizePlayState({ completedTaskIds: completed, usedSlotIds: ["wild_1", "wild_3"], lastSlotId: "wild_3" }, config);
  assert.deepEqual(state.completedTaskIds, completed);
  assert.equal(Core.hasBingo(state.completedTaskIds, config.requiredTasks.map(function (task) { return task.id; })), true);
  assert.equal(state.usedSlotIds, undefined);
  assert.equal(state.lastSlotId, null, "An old outcome must not be silently reassigned to a new one");
}

function testBingoLinesAndState() {
  var config = Core.defaultConfig();
  var ids = config.requiredTasks.map(function (task) { return task.id; });
  assert.equal(Core.hasBingo([ids[0], ids[1]], ids), false);
  assert.equal(Core.bingoLineCount([ids[0], ids[1]], ids), 0);
  assert.equal(Core.hasBingo([ids[0], ids[1], ids[2]], ids), true);
  assert.equal(Core.bingoLineCount(ids.slice(0, 6), ids), 2);
  assert.equal(Core.hasBingo([ids[0], ids[3], ids[6]], ids), true);
  assert.equal(Core.hasBingo([ids[0], ids[4], ids[8]], ids), true);
  assert.equal(Core.hasBingo([ids[2], ids[4], ids[6]], ids), true);
  assert.equal(Core.hasBingo(ids.slice(0, 3), ids.slice(0, 8)), false);

  var state = Core.normalizePlayState({ completedTaskIds: [ids[0], "unknown", ids[0], ids[4]] }, config);
  assert.deepEqual(state.completedTaskIds, [ids[0], ids[4]]);
}

function testOldLinkMigration() {
  var oldPayload = {
    v: 2,
    n: "Alter Link",
    p: [["any", "Jederzeit"], ["p1", "Geheime Station"]],
    t: [["t1", "Pflicht 1", "any"], ["t2", "Extra", "p1"]],
    r: [["r1", "Belohnung"]],
    s: [["s1", "Strafe"]]
  };
  var encoded = Buffer.from(JSON.stringify(oldPayload), "utf8").toString("base64url");
  var decoded = Core.decodeConfig(encoded);
  assert.equal(decoded.requiredTasks[0].title, "Pflicht 1");
  assert.equal(decoded.slotItems.length, 2);
}

function appHarness(search, targetView, existingStorage) {
  var elements = {};
  var listeners = {};
  var storage = existingStorage || {};
  elements.app = { innerHTML: "" };
  var context = {
    window: {
      JGACore: Core,
      location: { search: search, hash: "", pathname: "/index.html", href: "file:///index.html", protocol: "file:" },
      scrollTo: function () {},
      addEventListener: function () {}
    },
    document: {
      title: "",
      getElementById: function (id) { return elements[id]; },
      addEventListener: function (type, handler) { listeners[type] = handler; }
    },
    localStorage: {
      getItem: function (key) { return storage[key] || null; },
      setItem: function (key, value) { storage[key] = value; }
    },
    navigator: {},
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    Date: Date,
    setTimeout: function () { return 1; },
    clearTimeout: function () {},
    setInterval: function () { return 1; },
  };
  vm.runInNewContext(fs.readFileSync("app.js", "utf8"), context);
  function click(data) {
    listeners.click({ target: { closest: function () { return { dataset: data }; } } });
  }
  if (targetView) {
    click({ view: targetView });
  }
  return {
    click: click,
    html: function () { return elements.app.innerHTML; },
    state: function () { return JSON.parse(storage.jga_state_v6 || "null"); },
    storage: storage
  };
}

function renderApp(search, targetView) {
  return appHarness(search, targetView).html();
}

function testPrimaryViewsStaySimple() {
  var player = renderApp("");
  assert.match(player, /Pflicht/);
  assert.match(player, /data-view="bingo"/);
  assert.match(player, /data-view="slot"/);
  assert.doesNotMatch(player, /Kartfahren|Team-Duell|Karaokebar|Einrichten|Gamemaster/);

  var bingo = renderApp("", "bingo");
  assert.equal((bingo.match(/data-bingo-task=/g) || []).length, 9);
  assert.match(bingo, /Bier überall/);
  assert.match(bingo, /Restaurant: Nicht auf Karte/);
  assert.match(bingo, /Frag Passanten-Experten/);
  assert.match(bingo, /Soundeffekt bei Setzen/);
  assert.doesNotMatch(bingo, /bingo-overlay/);

  var slot = renderApp("", "slot");
  assert.equal((slot.match(/data-spin/g) || []).length, 1);
  assert.equal((slot.match(/data-reel-track/g) || []).length, 3);
  assert.match(slot, /JACKPOT/);
  assert.match(slot, /🍺/);
  assert.match(slot, /🍻/);
  assert.match(slot, /🎲/);
  assert.doesNotMatch(slot, /BAR|⚡|>7</);
  assert.doesNotMatch(slot, /Belohnung|Bestrafung/);

  var oldSetupUrl = renderApp("?setup", "setup");
  assert.match(oldSetupUrl, /Pflicht/);
  assert.doesNotMatch(oldSetupUrl, /Einrichten|Spiel-Link|data-config/);
}

function testBingoInteractionPersistsAndCelebrates() {
  var game = appHarness("", "bingo");
  var ids = Core.defaultConfig().requiredTasks.map(function (task) { return task.id; });
  game.click({ bingoTask: ids[0] });
  game.click({ bingoTask: ids[1] });
  assert.doesNotMatch(game.html(), /bingo-overlay/);
  game.click({ bingoTask: ids[2] });
  assert.match(game.html(), /Überraschung freigeschaltet!/);
  assert.deepEqual(game.state().completedTaskIds, ids.slice(0, 3));
  game.click({ closeBingo: "" });
  assert.doesNotMatch(game.html(), /bingo-overlay/);
  assert.match(game.html(), /<strong>Bingo!<\/strong>/);

  game.click({ bingoTask: ids[3] });
  game.click({ bingoTask: ids[4] });
  assert.doesNotMatch(game.html(), /bingo-overlay/);
  game.click({ bingoTask: ids[5] });
  assert.match(game.html(), /Überraschung freigeschaltet!/);
  assert.equal(Core.bingoLineCount(game.state().completedTaskIds, ids), 2);

  var restored = appHarness("", "bingo", game.storage);
  assert.deepEqual(restored.state().completedTaskIds, ids.slice(0, 6));
  assert.match(restored.html(), /Überraschung freigeschaltet\./);
}

function run() {
  testDefaultUsesPollWinners();
  testUnicodeRoundTrip();
  testGameLinkHidesStationNames();
  testTimedUnlocks();
  testWeightedSlotOdds();
  testSlotResultMatchesReels();
  testNewSlotDeckPreservesBingo();
  testBingoLinesAndState();
  testOldLinkMigration();
  testPrimaryViewsStaySimple();
  testBingoInteractionPersistsAndCelebrates();
  console.log("Alle Kernprüfungen bestanden.");
}

run();
