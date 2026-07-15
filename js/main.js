/* terra incognita — core: state, log, menus, sound, saves, title, boot */
window.TI = window.TI || {};

TI.SAVE_KEY = "terra-incognita-save-v2";
TI.MAX_HP = 24;
TI.INV_SLOTS = 6;

/* ============================ state ============================ */
TI.newState = function () {
    return {
        hp: TI.MAX_HP, maxHp: TI.MAX_HP,
        weapon: "stick", armor: "boots",
        inv: ["meat", "meat"],
        pieces: {},            // areaId -> true once boss piece recovered
        installed: [],         // areaIds in the order installed on the shelf
        chestOpened: false,
        machineOn: false,
        finished: false,
        frags: [],             // memory fragment ids seen
        journals: [],          // journal indexes read
        deaths: 0,
        ow: { x: 8, y: 5, disc: [] },
        areas: {},             // areaId -> {e1,e2,boss,item,mem}
        cabinVisited: false,
        stagSeen: 0,
    };
};

TI.areaState = function (id) {
    if (!TI.state.areas[id]) TI.state.areas[id] = { e1: false, e2: false, boss: false, item: false, mem: false };
    return TI.state.areas[id];
};

/* ============================ save / load ============================ */
TI.save = function () {
    if (!TI.state || TI.state.finished) return;
    try { localStorage.setItem(TI.SAVE_KEY, JSON.stringify(TI.state)); } catch (e) {}
};
TI.hasSave = function () {
    try { return !!localStorage.getItem(TI.SAVE_KEY); } catch (e) { return false; }
};
TI.loadSaved = function () {
    try {
        const raw = localStorage.getItem(TI.SAVE_KEY);
        if (!raw) return false;
        TI.state = Object.assign(TI.newState(), JSON.parse(raw));
        return true;
    } catch (e) { return false; }
};
TI.clearSave = function () {
    try { localStorage.removeItem(TI.SAVE_KEY); } catch (e) {}
};

/* ============================ dice ============================ */
TI.roll = function (n, sides, mod) {
    let t = mod || 0;
    for (let i = 0; i < n; i++) t += 1 + Math.floor(Math.random() * sides);
    return t;
};
TI.rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
TI.chance = p => Math.random() < p;

/* ============================ log ============================ */
const logEl = () => document.getElementById("log");
TI._typeQueue = [];
TI._typing = false;

TI.log = function (text, cls) {
    if (TI.settings && TI.settings.textMs === 0) { TI.logInstant(text, cls); return; }
    TI._typeQueue.push({ text, cls });
    if (!TI._typing) TI._typeNext();
};
TI.logInstant = function (text, cls) {
    const p = document.createElement("p");
    if (cls) p.className = "l-" + cls;
    p.textContent = text;
    logEl().appendChild(p);
    TI._trimLog();
    logEl().scrollTop = logEl().scrollHeight;
    return p;
};
TI._trimLog = function () {
    const el = logEl();
    while (el.children.length > 60) el.removeChild(el.firstChild);
};
TI._curType = null;
TI._typeNext = function () {
    const item = TI._typeQueue.shift();
    if (!item) { TI._typing = false; TI._curType = null; return; }
    TI._typing = true;
    const p = document.createElement("p");
    if (item.cls) p.className = "l-" + item.cls;
    logEl().appendChild(p);
    TI._trimLog();
    TI._curType = { p, item };
    let i = 0;
    const step = () => {
        if (!p.isConnected) { TI._typeNext(); return; }
        p.textContent = item.text.slice(0, ++i);
        logEl().scrollTop = logEl().scrollHeight;
        if (i < item.text.length) TI._typeTimer = setTimeout(step, TI.settings.textMs || 24);
        else { TI._curType = null; TI._typeTimer = setTimeout(() => TI._typeNext(), 500); }
    };
    step();
};
TI.skipTyping = function () {
    // finish the current line and flush everything queued, instantly
    clearTimeout(TI._typeTimer);
    if (TI._curType) {
        TI._curType.p.textContent = TI._curType.item.text;
        TI._curType = null;
    }
    TI._typeQueue.splice(0).forEach(it => TI.logInstant(it.text, it.cls));
    TI._typing = false;
    logEl().scrollTop = logEl().scrollHeight;
};
TI.clearLog = function () {
    clearTimeout(TI._typeTimer);
    TI._typeQueue = [];
    TI._typing = false;
    TI._curType = null;
    logEl().innerHTML = "";
};

/* play lines one at a time with a delay; any key skips ahead. cb when done */
TI.playLines = function (lines, cb, interval) {
    interval = interval || 1400;
    let idx = 0, timer = null, done = false;
    TI._seqSkip = () => {
        clearTimeout(timer);
        while (idx < lines.length) { const l = lines[idx++]; TI.logInstant(l.text !== undefined ? l.text : l, l.cls); }
        finish();
    };
    const finish = () => {
        if (done) return;
        done = true;
        TI._seqSkip = null;
        if (cb) cb();
    };
    const next = () => {
        if (idx >= lines.length) { finish(); return; }
        const l = lines[idx++];
        TI.log(l.text !== undefined ? l.text : l, l.cls);
        timer = setTimeout(next, interval);
    };
    next();
};

/* ============================ menu ============================ */
TI._menu = null;

TI.menuOpen = function (items, opts) {
    opts = opts || {};
    const el = document.getElementById("menu");
    el.innerHTML = "";
    if (opts.title) {
        const t = document.createElement("div");
        t.className = "menu-title";
        t.textContent = opts.title;
        el.appendChild(t);
    }
    const btns = [];
    items.forEach((it, i) => {
        const b = document.createElement("button");
        b.className = "menu-btn";
        b.textContent = "[ " + it.label + " ]";
        b.disabled = !!it.disabled;
        b.addEventListener("click", () => TI._menuPick(i));
        el.appendChild(b);
        btns.push(b);
    });
    TI._menu = { items, btns, sel: -1, onCancel: opts.onCancel, keepMode: opts.keepMode };
    if (!opts.keepMode) TI.mode = "menu";
    // select first enabled
    const first = items.findIndex(it => !it.disabled);
    if (first >= 0) TI._menuSel(first);
};
TI._menuSel = function (i) {
    const m = TI._menu;
    if (!m) return;
    if (m.sel >= 0) m.btns[m.sel].classList.remove("sel");
    m.sel = i;
    m.btns[i].classList.add("sel");
};
TI._menuMove = function (dir) {
    const m = TI._menu;
    if (!m) return;
    let i = m.sel;
    for (let k = 0; k < m.items.length; k++) {
        i = (i + dir + m.items.length) % m.items.length;
        if (!m.items[i].disabled) break;
    }
    TI._menuSel(i);
    TI.sound.play("move");
};
TI._menuPick = function (i) {
    const m = TI._menu;
    if (!m || m.items[i].disabled) return;
    TI.sound.play("select");
    const fn = m.items[i].fn;
    TI.menuClose();
    if (fn) fn();
};
TI.menuClose = function () {
    document.getElementById("menu").innerHTML = "";
    TI._menu = null;
    if (TI.mode === "menu") TI.mode = "free";
};

/* ============================ sound ============================ */
TI.sound = {
    ctx: null, on: true,
    ensure() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; }
        }
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, dur, type, vol, when, glide) {
        if (!this.on || !this.ctx) return;
        const t0 = this.ctx.currentTime + (when || 0);
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
        if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
        g.gain.setValueAtTime(vol || 0.05, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(this.ctx.destination);
        o.start(t0); o.stop(t0 + dur + 0.05);
    },
    play(name) {
        if (!this.on || !this.ctx) return;
        switch (name) {
            case "move":    this.tone(220, 0.03, "square", 0.012); break;
            case "select":  this.tone(440, 0.06, "square", 0.03); break;
            case "deny":    this.tone(110, 0.15, "sawtooth", 0.04); break;
            case "step":    this.tone(90 + Math.random() * 25, 0.04, "triangle", 0.02); break;
            case "hit":     this.tone(160, 0.08, "square", 0.05); this.tone(80, 0.12, "sawtooth", 0.04, 0.02); break;
            case "hurt":    this.tone(70, 0.25, "sawtooth", 0.07, 0, 40); break;
            case "miss":    this.tone(300, 0.08, "sine", 0.03, 0, 180); break;
            case "heal":    this.tone(520, 0.12, "sine", 0.04); this.tone(660, 0.16, "sine", 0.04, 0.09); break;
            case "item":    this.tone(392, 0.1, "sine", 0.04); this.tone(523, 0.12, "sine", 0.04, 0.08); break;
            case "craft":   this.tone(220, 0.08, "square", 0.04); this.tone(330, 0.1, "square", 0.04, 0.1); this.tone(440, 0.14, "square", 0.04, 0.2); break;
            case "frag":    this.tone(110, 2.2, "sine", 0.05); this.tone(165, 2.2, "sine", 0.03, 0.15); this.tone(220, 1.6, "sine", 0.02, 0.4); break;
            case "boss":    this.tone(82, 0.5, "sawtooth", 0.06); this.tone(78, 0.7, "sawtooth", 0.06, 0.4); break;
            case "death":   [220, 185, 147, 110].forEach((f, i) => this.tone(f, 0.35, "sine", 0.05, i * 0.22)); break;
            case "piece":   [330, 440, 554, 659].forEach((f, i) => this.tone(f, 0.2, "sine", 0.05, i * 0.1)); break;
            case "machine": this.tone(55, 3.0, "sawtooth", 0.04, 0, 110); this.tone(58, 3.0, "sine", 0.05, 0.5, 116); break;
            case "portal":  this.tone(880, 1.6, "sine", 0.03, 0, 1760); this.tone(440, 2.0, "sine", 0.04, 0.3, 880); break;
            case "victory": [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.4, "sine", 0.05, i * 0.18)); break;
        }
    },
    toggle() {
        this.ensure();
        this.on = !this.on;
        return this.on;
    },
};

/* ============================ music ============================ */
/* slow generative ambience: a low drone plus sparse notes from a scene scale */
TI.music = {
    on: true, scene: null, _timer: null, _nextAt: 0, _droneAt: 0,
    SCALES: {
        dark:   [0, 3, 5, 7, 10],
        dorian: [0, 2, 3, 7, 9],
        phryg:  [0, 1, 5, 7, 8],
        sparse: [0, 7, 12],
        warm:   [0, 4, 7, 9, 14],
        tense:  [0, 1, 6, 7],
    },
    SCENES: {
        title:     { root: 110.00, scale: "dark",   pace: 3400 },
        overworld: { root: 146.83, scale: "dorian", pace: 2600 },
        cabin:     { root: 130.81, scale: "warm",   pace: 3000 },
        swamp:     { root: 98.00,  scale: "dark",   pace: 3000 },
        castle:    { root: 110.00, scale: "dorian", pace: 2600 },
        forest:    { root: 123.47, scale: "dark",   pace: 3200 },
        cliff:     { root: 92.50,  scale: "dorian", pace: 2800 },
        ruins:     { root: 82.41,  scale: "phryg",  pace: 3000 },
        cave:      { root: 65.41,  scale: "sparse", pace: 3800 },
        combat:    { root: 87.31,  scale: "tense",  pace: 1100, pulse: true },
        final:     { root: 73.42,  scale: "tense",  pace: 900,  pulse: true },
    },
    setScene(name) {
        if (this.scene !== name) { this.scene = this.SCENES[name] ? name : null; this._nextAt = 0; }
    },
    start() {
        if (this._timer) return;
        this._timer = setInterval(() => this._tick(), 300);
    },
    _tick() {
        if (!this.on || !TI.sound.on || !TI.sound.ctx || !this.scene) return;
        if (TI.sound.ctx.state !== "running") return;
        const sc = this.SCENES[this.scene];
        const now = Date.now();
        if (now >= this._droneAt) {
            this._droneAt = now + 6000;
            TI.sound.tone(sc.root / 2, 5.5, "sine", 0.022);
            TI.sound.tone((sc.root / 2) * 1.5, 5.5, "sine", 0.011, 0.4);
        }
        if (now >= this._nextAt) {
            this._nextAt = now + sc.pace * (0.7 + Math.random() * 0.8);
            const scale = this.SCALES[sc.scale];
            const deg = scale[TI.rint(0, scale.length - 1)];
            const oct = TI.chance(0.3) ? 2 : 1;
            TI.sound.tone(sc.root * Math.pow(2, deg / 12) * oct, 1.6, "triangle", 0.02);
            if (sc.pulse) TI.sound.tone(sc.root / 2, 0.12, "square", 0.03);
        }
    },
    toggle() { this.on = !this.on; return this.on; },
};

/* ============================ settings ============================ */
TI.settings = { textMs: 24, music: true, sfx: true };
TI.loadSettings = function () {
    try { Object.assign(TI.settings, JSON.parse(localStorage.getItem("ti-settings-v1") || "{}")); } catch (e) {}
    TI.music.on = TI.settings.music;
    TI.sound.on = TI.settings.sfx;
};
TI.saveSettings = function () {
    TI.settings.music = TI.music.on;
    TI.settings.sfx = TI.sound.on;
    try { localStorage.setItem("ti-settings-v1", JSON.stringify(TI.settings)); } catch (e) {}
};
TI.textSpeedLabel = function () {
    return TI.settings.textMs === 0 ? "instant" : (TI.settings.textMs <= 10 ? "fast" : "normal");
};

/* ============================ fx ============================ */
TI.fade = function (kind, cb, slow) {
    const f = document.getElementById("fade");
    f.classList.toggle("slow", !!slow);
    f.classList.remove("black", "white");
    if (kind) {
        void f.offsetWidth;
        f.classList.add(kind);
    }
    setTimeout(() => { if (cb) cb(); }, (slow ? 3600 : 1050));
};
TI.flash = function (shake) {
    const c = document.getElementById("crt");
    c.classList.remove("hitflash", "shake");
    void c.offsetWidth;
    c.classList.add("hitflash");
    if (shake) c.classList.add("shake");
    setTimeout(() => c.classList.remove("hitflash", "shake"), 300);
};

/* ============================ sidebar ============================ */
TI.bar = function (cur, max, width) {
    width = width || 12;
    const fill = Math.round(Math.max(0, cur) / max * width);
    return "[" + "█".repeat(fill) + "░".repeat(width - fill) + "]";
};
TI.updateSidebar = function () {
    if (!TI.state) return;
    const s = TI.state;
    const hpEl = document.getElementById("side-hp");
    hpEl.innerHTML = `<span class="bar-fill">${TI.bar(s.hp, s.maxHp)}</span> ${Math.max(0, s.hp)}/${s.maxHp}`;
    hpEl.classList.toggle("hurt", s.hp <= s.maxHp / 3);

    const w = TI.ITEMS[s.weapon], a = TI.ITEMS[s.armor];
    document.getElementById("side-equip").innerHTML =
        `<div>» ${w.name} <span class="dim">${w.dice[0]}d${w.dice[1]}${w.dice[2] ? "+" + w.dice[2] : ""}</span></div>` +
        `<div>» ${a.name} <span class="dim">${a.dr ? "dr " + a.dr : "worn"}</span></div>`;

    let inv = "";
    for (let i = 0; i < TI.INV_SLOTS; i++) {
        inv += s.inv[i] ? `<div>· ${TI.ITEMS[s.inv[i]].name}</div>` : `<div class="empty">· —</div>`;
    }
    document.getElementById("side-inv").innerHTML = inv;
    document.getElementById("side-slots").textContent = `${s.inv.length}/${TI.INV_SLOTS}`;

    let pieces = "";
    TI.PIECE_ORDER.forEach(id => {
        if (s.installed.includes(id)) pieces += `<div class="got">■ ${TI.PIECES[id].short}</div>`;
        else if (s.pieces[id]) pieces += `<div class="got">□ ${TI.PIECES[id].short} <span class="dim">(carried)</span></div>`;
        else pieces += `<div class="not">□ ?</div>`;
    });
    document.getElementById("side-pieces").innerHTML = pieces;

    document.getElementById("side-frags").textContent =
        `${s.frags.length} / ${TI.MEMORY_ORDER.length} recovered`;
};

/* ============================ map + location helpers ============================ */
TI.setMap = function (html) { document.getElementById("map").innerHTML = html; };
TI.setMapTheme = function (cls) { document.getElementById("map").className = cls || ""; };
TI.flashMap = function () {
    const m = document.getElementById("map");
    m.classList.remove("foehit");
    void m.offsetWidth;
    m.classList.add("foehit");
};
TI.setLocation = function (name) { document.getElementById("location-name").textContent = name; };
TI.esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ============================ input ============================ */
TI.mode = "title";   // title | free | menu | busy
TI.view = null;      // object with .move(dx,dy) and optional .action()

document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()) || [" "].includes(e.key)) e.preventDefault();

    TI.sound.ensure();
    TI.music.start();

    // a running line-sequence: any key fast-forwards it
    if (TI._seqSkip) { TI._seqSkip(); return; }
    if (TI._typing) TI.skipTyping();

    if (TI.mode === "busy") return;

    if (TI.mode === "title") {
        if (k === "s") {
            const on = TI.sound.toggle();
            document.getElementById("title-sound").textContent = on ? "on" : "off";
            TI.saveSettings();
            return;
        }
        if (k === "m") {
            const on = TI.music.toggle();
            document.getElementById("title-music").textContent = on ? "on" : "off";
            TI.saveSettings();
            return;
        }
        if (k === "t") {
            TI.settings.textMs = TI.settings.textMs === 24 ? 8 : (TI.settings.textMs === 8 ? 0 : 24);
            document.getElementById("title-text").textContent = TI.textSpeedLabel();
            TI.saveSettings();
            return;
        }
        // fall through to menu nav below
    }

    if (TI._menu) {
        if (k === "w" || k === "arrowup" || k === "a" || k === "arrowleft") { TI._menuMove(-1); e.preventDefault(); }
        else if (k === "s" || k === "arrowdown" || k === "d" || k === "arrowright") { TI._menuMove(1); e.preventDefault(); }
        else if (k === "enter" || k === " ") { if (TI._menu.sel >= 0) TI._menuPick(TI._menu.sel); e.preventDefault(); }
        else if (k >= "1" && k <= "9") {
            const i = +k - 1;
            if (TI._menu.items[i]) TI._menuPick(i);
        }
        else if (k === "escape" && TI._menu.onCancel) { const fn = TI._menu.onCancel; TI.menuClose(); fn(); }
        return;
    }

    if (TI.mode !== "free" || !TI.view) return;

    let dx = 0, dy = 0;
    if (k === "w" || k === "arrowup") dy = -1;
    else if (k === "s" || k === "arrowdown") dy = 1;
    else if (k === "a" || k === "arrowleft") dx = -1;
    else if (k === "d" || k === "arrowright") dx = 1;
    else if (k === "i") { TI.inventory.openMenu(); return; }
    else if (k === "escape" && TI.view.escape) { TI.view.escape(); return; }
    else return;
    e.preventDefault();
    TI.view.move(dx, dy);
});

/* ============================ screens ============================ */
TI.showScreen = function (id) {
    document.getElementById("screen-title").classList.toggle("hidden", id !== "title");
    document.getElementById("screen-game").classList.toggle("hidden", id !== "game");
};

/* ============================ title / boot ============================ */
TI.showTitle = function () {
    TI.mode = "title";
    TI.music.setScene("title");
    TI.showScreen("title");
    document.getElementById("title-sound").textContent = TI.sound.on ? "on" : "off";
    document.getElementById("title-music").textContent = TI.music.on ? "on" : "off";
    document.getElementById("title-text").textContent = TI.textSpeedLabel();
    const el = document.getElementById("title-menu");
    el.innerHTML = "";
    const items = [{ label: "wake up", fn: () => TI.startNew() }];
    if (TI.hasSave()) items.unshift({ label: "continue", fn: () => TI.continueGame() });
    // reuse the menu system but render into the title menu div
    items.forEach((it, i) => {
        const b = document.createElement("button");
        b.className = "menu-btn";
        b.textContent = "[ " + it.label + " ]";
        b.addEventListener("click", () => { TI.sound.ensure(); TI.music.start(); TI._menu = null; it.fn(); });
        el.appendChild(b);
    });
    // keyboard for title: build a lightweight menu record
    TI._menu = {
        items, btns: Array.from(el.children), sel: -1,
        onCancel: null, keepMode: true,
    };
    TI._menuSel(0);
    TI.mode = "title";
};

TI.startNew = function () {
    TI.clearSave();
    TI.state = TI.newState();
    TI.showScreen("game");
    TI.clearLog();
    TI.updateSidebar();
    TI.mode = "busy";
    TI.setLocation("");
    TI.setMap("");
    TI.fade("black", () => {
        TI.fade(null);
        TI.playLines([
            { text: "you wake up in a field.", cls: "em" },
            { text: "you don't remember lying down. you don't remember your name." },
            { text: "there is a cabin nearby — the bright H on your map. smoke rises from the chimney. you didn't light that fire.", cls: "dim" },
        ], () => {
            TI.overworld.show();
            TI.save();
        }, 2000);
    });
};

TI.continueGame = function () {
    if (!TI.loadSaved()) { TI.showTitle(); return; }
    TI.showScreen("game");
    TI.clearLog();
    TI.updateSidebar();
    TI.log("you pick up where something left off.", "dim");
    TI.overworld.show();
};

/* run stats shown after either ending */
TI.showEndTitle = function () {
    TI.state.finished = true;
    TI.clearSave();
    const s = TI.state;
    TI.mode = "busy";
    setTimeout(() => {
        TI.showScreen("title");
        TI.music.setScene("title");
        document.getElementById("title-sub").textContent = "terra incognita";
        const el = document.getElementById("title-menu");
        el.innerHTML = `<p class="dim" style="text-align:center;line-height:2">memories recovered: ${s.frags.length} / ${TI.MEMORY_ORDER.length}
        &nbsp;·&nbsp; times you woke up on the cot: ${s.deaths}</p>`;
        const b = document.createElement("button");
        b.className = "menu-btn";
        b.textContent = "[ again ]";
        b.addEventListener("click", () => { location.reload(); });
        el.appendChild(b);
        TI._menu = { items: [{ label: "again", fn: () => location.reload() }], btns: [b], sel: -1, keepMode: true };
        TI._menuSel(0);
        TI.mode = "title";
        TI.fade(null);
    }, 400);
};

/* ============================ go ============================ */
document.addEventListener("DOMContentLoaded", () => {
    TI.loadSettings();
    TI.showTitle();

    // touch: swipe the map to move, tap to continue/skip
    const stage = document.getElementById("map-stage");
    let touchStart = null;
    stage.addEventListener("touchstart", (e) => {
        touchStart = e.changedTouches[0];
    }, { passive: true });
    stage.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    stage.addEventListener("touchend", (e) => {
        if (!touchStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.clientX;
        const dy = t.clientY - touchStart.clientY;
        touchStart = null;
        TI.sound.ensure();
        TI.music.start();
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
            // a tap: advance whatever is waiting
            if (TI._seqSkip) { TI._seqSkip(); return; }
            if (TI._typing) TI.skipTyping();
            return;
        }
        if (TI.mode !== "free" || !TI.view) return;
        if (Math.abs(dx) > Math.abs(dy)) TI.view.move(dx > 0 ? 1 : -1, 0);
        else TI.view.move(0, dy > 0 ? 1 : -1);
    }, { passive: true });

    // tapping the pack in the sidebar opens it
    document.getElementById("side-pack-block").addEventListener("click", () => {
        if (TI.mode === "free" && TI.state && !TI.combat.active) {
            TI.sound.ensure();
            TI.inventory.openMenu();
        }
    });
});
