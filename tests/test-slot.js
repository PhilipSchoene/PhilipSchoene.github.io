"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs");
var vm = require("node:vm");
var Core = require("../game-core.js");
var source = fs.readFileSync("app.js", "utf8");

function element() {
  var classes = new Set();
  var properties = {};
  return {
    dataset: {}, disabled: false, textContent: "",
    style: { setProperty: function (key, value) { properties[key] = value; }, properties: properties },
    classList: {
      add: function (value) { classes.add(value); },
      remove: function (value) { classes.delete(value); },
      contains: function (value) { return classes.has(value); },
      toggle: function (value, enabled) { if (enabled) classes.add(value); else classes.delete(value); }
    }
  };
}

// Small DOM/timer harness to exercise the real click and animation event handlers.
function app(options) {
  options = options || {};
  var storage = options.storage || {};
  var listeners = {};
  var timers = new Map();
  var nextTimer = 0;
  var renders = 0;
  var draws = 0;
  var rolls = options.rolls || [0.1, 0.35, 0.47, 0.59, 0.71, 0.83, 0.95];
  var html = "";
  var tracks = [];
  var nodes = {};
  [".slot-machine", "[data-slot-count]", ".result-panel small", ".result-panel strong", "[data-slot-description]", "[data-spin] span", "[data-spin]"].forEach(function (selector) {
    nodes[selector] = element();
  });
  nodes["[data-spin]"].dataset.spin = "";
  var nav = [element(), element()];
  nav[0].dataset.view = "tasks";
  nav[1].dataset.view = "slot";
  var root = {};
  Object.defineProperty(root, "innerHTML", {
    get: function () { return html; },
    set: function (value) {
      html = value;
      renders += 1;
      tracks = Array.from(value.matchAll(/data-reel-angle="(-?\d+)"[^>]*>((?:<div class="reel-symbol"[^>]*>.*?<\/div>)+)/g), function (match) {
        var track = element();
        track.dataset.reelAngle = match[1];
        track.faces = Array.from(match[2].matchAll(/--face-angle:(\d+)deg">(.*?)<\/div>/g), function (face) {
          return { angle: Number(face[1]), symbol: face[2] };
        });
        return track;
      });
    }
  });
  var context = {
    window: {
      JGACore: Object.assign({}, Core, { pickSlot: function (items) {
        var roll = rolls[draws % rolls.length];
        draws += 1;
        return Core.pickSlot(items, function () { return roll; });
      } }),
      location: { search: "", hash: "", pathname: "/", href: "file:///", protocol: "file:" },
      matchMedia: function () { return { matches: Boolean(options.reduced) }; },
      scrollTo: function () {}, addEventListener: function () {}
    },
    document: {
      getElementById: function () { return root; },
      querySelector: function (selector) { assert.ok(nodes[selector], selector); return nodes[selector]; },
      querySelectorAll: function (selector) {
        if (selector === "[data-reel-track]") return tracks;
        assert.equal(selector, "[data-view]");
        return nav;
      },
      addEventListener: function (type, handler) { listeners[type] = handler; }
    },
    localStorage: {
      getItem: function (key) { return storage[key] || null; },
      setItem: function (key, value) { storage[key] = value; }
    },
    navigator: {}, URLSearchParams: URLSearchParams,
    setTimeout: function (callback, delay) { timers.set(++nextTimer, { callback: callback, delay: delay }); return nextTimer; },
    clearTimeout: function (id) { timers.delete(id); },
    setInterval: function () {}, Date: Date
  };
  vm.runInNewContext(source, context);
  function click(button) { listeners.click({ target: { closest: function () { return button; } } }); }
  click(nav[1]);
  return {
    start: function () { click(nodes["[data-spin]"]); },
    nav: function () { click(nav[0]); },
    stop: function (index) { tracks[index].onanimationend({ animationName: "reel-roll" }); },
    timer: function (delay) {
      var found = Array.from(timers.entries()).find(function (entry) { return entry[1].delay === delay; });
      assert.ok(found, "Expected timer: " + delay);
      timers.delete(found[0]);
      found[1].callback();
    },
    state: function () { return JSON.parse(storage.jga_state_v6 || "null"); },
    renders: function () { return renders; },
    draws: function () { return draws; },
    html: function () { return html; },
    nodes: nodes, tracks: function () { return tracks; }, storage: storage
  };
}

function centerSymbol(track) {
  var angle = Number(track.dataset.reelAngle);
  assert.equal(Math.abs(angle % 45), 0, "Every reel must land exactly on a face");
  var front = ((-angle % 360) + 360) % 360;
  var face = track.faces.find(function (entry) { return entry.angle === front; });
  assert.ok(face, "The front symbol must exist on the actual rendered cylinder");
  return face.symbol;
}

function testAllOutcomesAndPersistentReels() {
  var game = app();
  var initialTracks = game.tracks().slice();
  var initialRenders = game.renders();
  var items = Core.defaultConfig().slotItems;
  game.tracks().forEach(function (track) {
    assert.deepEqual(track.faces.map(function (face) { return face.angle; }), [0, 45, 90, 135, 180, 225, 270, 315]);
    Core.slotSymbols().forEach(function (symbol) { assert.ok(track.faces.some(function (face) { return face.symbol === symbol; })); });
  });
  items.concat(items).forEach(function (item, spinIndex) {
    var before = game.tracks().map(function (track) { return Number(track.dataset.reelAngle); });
    game.start();
    game.start(); // Double taps must not draw or restart a second spin.
    game.nav(); // Navigation cannot replace the spinning nodes.
    assert.equal(game.renders(), initialRenders);
    assert.equal(game.nodes["[data-spin]"].disabled, true);
    assert.equal(game.nodes[".result-panel strong"].textContent, "Viel Glück!");
    assert.equal(game.nodes["[data-slot-description]"].textContent, "");
    game.tracks().forEach(function (track, index) {
      assert.equal(track, initialTracks[index]);
      assert.equal(parseFloat(track.style.properties["--reel-start"]), before[index]);
      assert.ok(parseFloat(track.style.properties["--reel-travel"]) <= -1080);
      assert.equal(track.classList.contains("is-rolling"), true);
    });
    game.tracks()[0].onanimationend({ animationName: "unrelated" });
    game.stop(0);
    game.stop(1);
    assert.equal(game.nodes["[data-spin]"].disabled, true);
    assert.equal(game.nodes[".result-panel strong"].textContent, "Viel Glück!");
    var lastCallback = game.tracks()[2].onanimationend;
    game.stop(2);
    lastCallback({ animationName: "reel-roll" }); // Late completion must be harmless.
    assert.equal(game.nodes["[data-spin]"].disabled, false);
    assert.equal(game.nodes[".result-panel strong"].textContent, item.title);
    assert.equal(game.nodes["[data-slot-description]"].textContent, Core.slotDescription(item));
    assert.deepEqual(game.tracks().map(centerSymbol), Core.slotCombo(item));
    assert.equal(game.state().lastSlotId, item.id);
    assert.equal(game.draws(), spinIndex + 1, "Double taps and late events must not cause extra draws");
    assert.equal(game.renders(), initialRenders, "Finishing must not rebuild the machine");
    assert.equal(game.nodes["[data-slot-count]"].textContent, "7 LOSE");
    var restored = app({ storage: game.storage });
    assert.deepEqual(restored.tracks().map(centerSymbol), Core.slotCombo(item));
    assert.equal(restored.state().lastSlotId, item.id);
    assert.ok(restored.html().includes(item.title));
    assert.ok(restored.html().includes(Core.slotDescription(item)));
    if (item.kind === "respin") {
      game.timer(900);
      assert.equal(game.state().lastSlotId, item.id, "Respin waits for the next explicit tap");
      assert.equal(game.nodes["[data-spin]"].disabled, false);
    }
  });
}

function testReducedMotionAndInterruptedAnimation() {
  var reduced = app({ reduced: true });
  Core.defaultConfig().slotItems.forEach(function (item) {
    reduced.start();
    assert.ok(reduced.tracks().every(function (track) { return !track.classList.contains("is-rolling"); }));
    reduced.timer(180);
    assert.equal(reduced.nodes["[data-spin]"].disabled, false);
    assert.deepEqual(reduced.tracks().map(centerSymbol), Core.slotCombo(item));
    assert.equal(reduced.nodes[".result-panel strong"].textContent, item.title);
  });

  var interrupted = app();
  interrupted.start();
  interrupted.tracks()[1].onanimationcancel();
  assert.equal(interrupted.nodes["[data-spin]"].disabled, false);
  assert.deepEqual(interrupted.tracks().map(centerSymbol), ["🍺", "🍺", "🍺"]);
  interrupted.start();
  interrupted.stop(0);
  interrupted.timer(3800); // Missing animation events / backgrounded browser.
  assert.equal(interrupted.nodes["[data-spin]"].disabled, false);
  assert.deepEqual(interrupted.tracks().map(centerSymbol), ["🍺", "👉", "🍺"]);
  assert.equal(interrupted.draws(), 2);
}

function testRepeatsIgnoreOldDeckAndPreserveProgress() {
  var config = Core.defaultConfig();
  var completed = config.requiredTasks.slice(0, 3).map(function (task) { return task.id; });
  var storage = { jga_state_v6: JSON.stringify({
    completedTaskIds: completed,
    usedSlotIds: config.slotItems.map(function (item) { return item.id; }),
    lastSlotId: "slot_beer"
  }) };
  var game = app({ storage: storage, rolls: [0.1] });
  for (var spin = 0; spin < 3; spin += 1) {
    game.start();
    game.stop(0);
    game.stop(1);
    game.stop(2);
    assert.equal(game.state().lastSlotId, "slot_beer");
    assert.deepEqual(game.tracks().map(centerSymbol), ["🍺", "🍺", "🍺"]);
    assert.deepEqual(game.state().completedTaskIds, completed);
    assert.equal(game.nodes["[data-slot-count]"].textContent, "7 LOSE");
    game = app({ storage: game.storage, rolls: [0.1] });
  }
}

testAllOutcomesAndPersistentReels();
testReducedMotionAndInterruptedAnimation();
testRepeatsIgnoreOldDeckAndPreserveProgress();
console.log("Alle Slot-Prüfungen bestanden (Walzen, Ergebnis, Wiederholung, Speicherung, reduzierte Bewegung, Abbruch).");
