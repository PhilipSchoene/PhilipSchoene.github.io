(function () {
  "use strict";

  var Core = window.JGACore;
  var STATE_KEY = "jga_state_v6";
  var BINGO_LABELS = [
    "Bier überall",
    "Doppelgänger",
    "Restaurant: Nicht auf Karte",
    "Flunkyball-Duell",
    "3 Kontakte",
    "JGA-Maskottchen",
    "Frag Passanten-Experten",
    "Fragen-Modus",
    "Soundeffekt bei Setzen"
  ];
  var REEL_SYMBOLS = Core.slotSymbols();
  // Keep the eight-face cylinder geometry, with one repeated face for seven symbols.
  var REEL_FACES = Array.from({ length: 8 }, function (_, index) { return REEL_SYMBOLS[index % REEL_SYMBOLS.length]; });
  var REEL_STEP = 360 / REEL_FACES.length;
  var config = Core.defaultConfig();
  var play = loadPlayState(config);
  var view = "tasks";
  var celebrateBingo = false;
  var spinTimer = null;
  var spinning = false;
  var pendingSpin = null;
  var resultTimer = null;
  var unlockSignature = unlockedIds().join("|");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function readStored(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  function loadPlayState(currentConfig) {
    try {
      var saved = readStored(STATE_KEY);
      if (saved) return Core.normalizePlayState(JSON.parse(saved), currentConfig);
    } catch (error) {}
    return Core.freshPlayState(currentConfig);
  }

  function savePlay() {
    writeStored(STATE_KEY, JSON.stringify(play));
  }

  function unlockedTasks() {
    return Core.unlockedTasks(config, Date.now());
  }

  function unlockedIds() {
    return unlockedTasks().map(function (task) { return task.id; });
  }

  function slotItemById(id) {
    return config.slotItems.find(function (item) { return item.id === id; });
  }

  function comboForItem(item) {
    return Core.slotCombo(item);
  }

  function reelHtml(index, restingCombo) {
    var angle = -REEL_FACES.indexOf(restingCombo[index]) * REEL_STEP;
    // Eight fixed faces form a cylinder. The same faces stay mounted between spins.
    return '<div class="reel"><div class="reel-track" data-reel-track data-reel-angle="' + angle + '" style="--reel-angle:' + angle + 'deg">' + REEL_FACES.map(function (symbol, face) {
      return '<div class="reel-symbol" style="--face-angle:' + (face * REEL_STEP) + 'deg">' + esc(symbol) + '</div>';
    }).join("") + '</div></div>';
  }

  function headerHtml(label) {
    return '<header class="topbar"><div><div class="eyebrow">' + esc(label) + '</div><h1>' + esc(config.title) + '</h1></div></header>';
  }

  function navHtml() {
    var items = [["tasks", "Aufgaben"], ["bingo", "Bingo"], ["slot", "Slot"]];
    return '<nav class="bottom-nav" aria-label="Bereiche"><div class="nav-inner" style="--nav-count:' + items.length + '">' + items.map(function (item) {
      return '<button data-view="' + item[0] + '" class="' + (view === item[0] ? "on" : "") + '" ' + (spinning ? "disabled" : "") + '>' + item[1] + '</button>';
    }).join("") + '</div></nav>';
  }

  function taskList(tasks, numbered) {
    return '<div class="task-list">' + tasks.map(function (task, index) {
      return '<article class="task-item"><span class="task-number">' + (numbered ? String(index + 1).padStart(2, "0") : '•') + '</span><h3>' + esc(task.title) + '</h3></article>';
    }).join("") + '</div>';
  }

  function tasksView() {
    var extras = unlockedTasks();
    var h = headerHtml("Aufgaben") + '<section class="list-section"><div class="section-title"><h2>Pflicht</h2><span>' + config.requiredTasks.length + '</span></div>';
    h += config.requiredTasks.length ? taskList(config.requiredTasks, true) : '<div class="empty-list">Keine Pflichtaufgaben</div>';
    h += '</section>';
    if (extras.length) {
      h += '<section class="list-section unlocked"><div class="section-title"><h2>Freigeschaltet</h2><span>' + extras.length + '</span></div>' + taskList(extras, false) + '</section>';
    }
    return h;
  }

  function bingoTaskIds() {
    return config.requiredTasks.map(function (task) { return task.id; });
  }

  function hasBingo() {
    return Core.hasBingo(play.completedTaskIds, bingoTaskIds());
  }

  function bingoView() {
    var completed = {};
    play.completedTaskIds.forEach(function (id) { completed[id] = true; });
    var won = hasBingo();
    var cells = config.requiredTasks.map(function (task, index) {
      var done = Boolean(completed[task.id]);
      var status = done ? "Erledigt: " : "Offen: ";
      return '<button class="bingo-cell ' + (done ? "is-done" : "") + '" data-bingo-task="' + esc(task.id) + '" aria-pressed="' + done + '" aria-label="' + esc(status + task.title) + '" title="' + esc(task.title) + '">' +
        '<span class="bingo-number">' + String(index + 1).padStart(2, "0") + '</span><strong>' + esc(BINGO_LABELS[index] || task.title) + '</strong><span class="bingo-check" aria-hidden="true">✓</span></button>';
    }).join("");
    var h = headerHtml("Bingo") + '<section class="bingo-section"><div class="bingo-heading"><p>Erledigte Aufgabe antippen.</p><span>' + play.completedTaskIds.length + ' / 9</span></div>' +
      '<div class="bingo-board ' + (won ? "has-bingo" : "") + '" role="group" aria-label="Aufgaben-Bingo">' + cells + '</div>';
    if (won) h += '<div class="bingo-prize"><span aria-hidden="true">🎁</span><div><strong>Bingo!</strong><p>Überraschung freigeschaltet.</p></div></div>';
    h += '</section>';
    if (celebrateBingo && won) {
      h += '<div class="bingo-overlay" role="dialog" aria-modal="true" aria-labelledby="bingo-title"><div class="confetti" aria-hidden="true">✦ ● ✦ ● ✦</div><div class="bingo-modal"><span class="bingo-gift" aria-hidden="true">🎁</span><div class="eyebrow">BINGO</div><h2 id="bingo-title">Überraschung freigeschaltet!</h2><p>Frag die Jungs – sie wissen, was jetzt kommt.</p><button data-close-bingo>Her damit!</button></div></div>';
    }
    return h;
  }

  function slotView() {
    var last = slotItemById(play.lastSlotId);
    var combo = last ? comboForItem(last) : Core.idleSlotCombo();
    return headerHtml("Slot") + '<section class="single-slot"><div class="slot-machine">' +
      '<div class="marquee" aria-hidden="true">' + Array(12).fill('<i></i>').join("") + '</div><div class="machine-title"><span>JGA</span><strong>JACKPOT</strong><small data-slot-count>' + esc(slotStatus()) + '</small></div>' +
      '<div class="reels" aria-hidden="true">' + reelHtml(0, combo) + reelHtml(1, combo) + reelHtml(2, combo) + '</div>' +
      '<div class="result-panel" role="status" aria-live="polite" aria-atomic="true"><small>' + (last ? "DEIN LOS" : "BEREIT?") + '</small><strong>' + esc(last ? last.title : config.slotItems.length ? "Drück auf Drehen" : "Keine Lose im Slot") + '</strong><p data-slot-description>' + esc(Core.slotDescription(last)) + '</p></div>' +
      '<button class="slot-button" data-spin ' + (!config.slotItems.length || spinning ? "disabled" : "") + '><span>' + (spinning ? "LÄUFT" : "DREHEN") + '</span><b aria-hidden="true">●</b></button>' +
      '</div></section>';
  }

  function slotStatus() {
    return !config.slotItems.length ? "LEER" : config.slotItems.length + " LOSE";
  }

  function updateSlot() {
    var last = slotItemById(play.lastSlotId);
    document.querySelector(".slot-machine").classList.toggle("is-spinning", spinning);
    document.querySelector("[data-slot-count]").textContent = slotStatus();
    document.querySelector(".result-panel small").textContent = spinning ? "WALZEN LAUFEN" : "DEIN LOS";
    document.querySelector(".result-panel strong").textContent = spinning ? "Viel Glück!" : last.title;
    document.querySelector("[data-slot-description]").textContent = spinning ? "" : Core.slotDescription(last);
    document.querySelector("[data-spin] span").textContent = spinning ? "LÄUFT …" : "DREHEN";
    document.querySelector("[data-spin]").disabled = spinning || !config.slotItems.length;
    document.querySelectorAll("[data-view]").forEach(function (button) { button.disabled = spinning; });
  }

  function render() {
    var content = view === "slot" ? slotView() : view === "bingo" ? bingoView() : tasksView();
    document.title = config.title;
    document.getElementById("app").innerHTML = '<div class="shell">' + content + '</div>' + navHtml();
  }

  function finishSpin() {
    if (!pendingSpin) return;
    clearTimeout(spinTimer);
    // Commit the exact final angle before removing the animation, including on interruption.
    pendingSpin.reels.forEach(function (reel) {
      reel.track.style.setProperty("--reel-angle", reel.end + "deg");
      reel.track.dataset.reelAngle = reel.end;
      reel.track.classList.remove("is-rolling");
      reel.track.onanimationend = null;
      reel.track.onanimationcancel = null;
    });
    play.lastSlotId = pendingSpin.item.id;
    savePlay();
    spinning = false;
    pendingSpin = null;
    spinTimer = null;
    updateSlot();
    var machine = document.querySelector(".slot-machine");
    machine.classList.add("result-burst");
    resultTimer = setTimeout(function () { machine.classList.remove("result-burst"); }, 900);
    if (navigator.vibrate) navigator.vibrate([45, 40, 90]);
  }

  function startSpin() {
    if (spinning || !config.slotItems.length) return;
    var picked = Core.pickSlot(config.slotItems);
    if (!picked) return;
    var targetCombo = comboForItem(picked);
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var tracks = Array.prototype.slice.call(document.querySelectorAll("[data-reel-track]"));
    if (tracks.length !== 3) return;
    var spin = { item: picked, reels: [], remaining: tracks.length };
    pendingSpin = spin;
    spinning = true;
    clearTimeout(resultTimer);
    document.querySelector(".slot-machine").classList.remove("result-burst");
    updateSlot();
    tracks.forEach(function (track, index) {
      var start = Number(track.dataset.reelAngle);
      var target = REEL_FACES.indexOf(targetCombo[index]) * REEL_STEP;
      var current = ((-start % 360) + 360) % 360;
      var distance = (3 + index) * 360 + ((target - current + 360) % 360);
      var end = start - distance;
      spin.reels.push({ track: track, end: end });
      if (reduced) return;
      track.style.setProperty("--reel-start", start + "deg");
      track.style.setProperty("--reel-travel", -distance + "deg");
      track.style.setProperty("--spin-duration", (2400 + index * 450) + "ms");
      track.onanimationend = function (event) {
        if (event.animationName !== "reel-roll" || pendingSpin !== spin) return;
        track.style.setProperty("--reel-angle", end + "deg");
        track.dataset.reelAngle = end;
        track.onanimationend = null;
        track.onanimationcancel = null;
        track.classList.remove("is-rolling");
        spin.remaining -= 1;
        if (!spin.remaining) finishSpin();
      };
      track.onanimationcancel = function () { if (pendingSpin === spin) finishSpin(); };
      track.classList.add("is-rolling");
    });
    // Also unlock if animation events are unavailable or the app was backgrounded.
    spinTimer = setTimeout(finishSpin, reduced ? 180 : 3800);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button || button.disabled || spinning) return;
    var data = button.dataset;
    if (data.view) { view = data.view; render(); window.scrollTo(0, 0); return; }
    if ("spin" in data) { startSpin(); return; }
    if (data.bingoTask) {
      var bingoLinesBefore = Core.bingoLineCount(play.completedTaskIds, bingoTaskIds());
      var index = play.completedTaskIds.indexOf(data.bingoTask);
      if (index === -1) play.completedTaskIds.push(data.bingoTask);
      else play.completedTaskIds.splice(index, 1);
      var bingoLinesAfter = Core.bingoLineCount(play.completedTaskIds, bingoTaskIds());
      celebrateBingo = index === -1 && bingoLinesAfter > bingoLinesBefore;
      savePlay();
      render();
      if (celebrateBingo && navigator.vibrate) navigator.vibrate([80, 45, 80, 45, 180]);
      return;
    }
    if ("closeBingo" in data) { celebrateBingo = false; render(); }
  });

  render();

  setInterval(function () {
    var next = unlockedIds().join("|");
    if (next !== unlockSignature) {
      unlockSignature = next;
      if (view === "tasks") render();
    }
  }, 30000);

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () {}); });
  }
})();
