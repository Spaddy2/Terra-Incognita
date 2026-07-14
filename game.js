/* =========================================================================
   TERRA INCOGNITA — chart the unknown continent
   Procedural exploration game. Vanilla JS + Canvas. No dependencies.
   ========================================================================= */
"use strict";

/* ============================== Config ================================= */
const MAP_W = 110, MAP_H = 110;
const DAY_LENGTH = 70;            // time ticks per full day
const NIGHT_START = 0.62;         // fraction of day when night falls
const START_SUPPLIES = 100;
const SAVE_KEY = "terra-incognita-save-v1";

const T = {
    DEEP:   0, WATER: 1, SAND: 2, GRASS: 3, FOREST: 4,
    HILLS:  5, MOUNTAIN: 6, SNOW: 7, DESERT: 8, SWAMP: 9,
};

const TERRAIN = {
    [T.DEEP]:     { name: "open sea",   cost: 0,   pass: false, color: [22, 48, 86]   },
    [T.WATER]:    { name: "shallows",   cost: 0,   pass: false, color: [38, 84, 128]  },
    [T.SAND]:     { name: "beach",      cost: 1,   pass: true,  color: [214, 189, 130]},
    [T.GRASS]:    { name: "grassland",  cost: 1,   pass: true,  color: [118, 152, 76] },
    [T.FOREST]:   { name: "forest",     cost: 2,   pass: true,  color: [62, 106, 54]  },
    [T.HILLS]:    { name: "hills",      cost: 2,   pass: true,  color: [136, 128, 90] },
    [T.MOUNTAIN]: { name: "peaks",      cost: 4,   pass: true,  color: [110, 104, 102]},
    [T.SNOW]:     { name: "snowfields", cost: 3,   pass: true,  color: [222, 226, 230]},
    [T.DESERT]:   { name: "desert",     cost: 2,   pass: true,  color: [204, 168, 96] },
    [T.SWAMP]:    { name: "swamp",      cost: 3,   pass: true,  color: [80, 96, 66]   },
};

const LANDMARKS = {
    village:   { icon: "⛺", label: "Village" },
    ruins:     { icon: "🗿", label: "Ancient Ruins" },
    temple:    { icon: "🏛️", label: "Forgotten Temple" },
    shipwreck: { icon: "⚓", label: "Shipwreck" },
    obelisk:   { icon: "🗼", label: "Obelisk" },
    lostcity:  { icon: "👑", label: "The Lost City" },
};

/* ============================== RNG ==================================== */
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// cheap deterministic per-tile hash for texture variation
function tileHash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ============================ Value noise ============================== */
function makeNoise(rand) {
    const SIZE = 256;
    const vals = new Float32Array(SIZE * SIZE);
    for (let i = 0; i < vals.length; i++) vals[i] = rand() * 2 - 1;
    const lat = (x, y) => vals[((y & 255) << 8) | (x & 255)];
    const smooth = t => t * t * (3 - 2 * t);
    function noise2(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const tx = smooth(x - xi), ty = smooth(y - yi);
        const a = lat(xi, yi), b = lat(xi + 1, yi);
        const c = lat(xi, yi + 1), d = lat(xi + 1, yi + 1);
        return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
    return function fbm(x, y, octaves = 4) {
        let v = 0, amp = 1, freq = 1, norm = 0;
        for (let o = 0; o < octaves; o++) {
            v += noise2(x * freq, y * freq) * amp;
            norm += amp;
            amp *= 0.5; freq *= 2.05;
        }
        return v / norm;
    };
}

/* ============================ World gen ================================ */
function generateWorld(seedStr) {
    const seedFn = xmur3(seedStr);
    const rand = mulberry32(seedFn());
    const elevNoise = makeNoise(rand);
    const moistNoise = makeNoise(rand);

    const tiles = new Uint8Array(MAP_W * MAP_H);
    const cx = MAP_W / 2, cy = MAP_H / 2;

    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            const nx = x / MAP_W - 0.5, ny = y / MAP_H - 0.5;
            const d = Math.sqrt(nx * nx + ny * ny) * 2;          // 0 center → ~1.4 corner
            let e = elevNoise(x * 0.045, y * 0.045, 5) * 0.75
                  + elevNoise(x * 0.012 + 90, y * 0.012 + 90, 3) * 0.45;
            e += 0.34 - Math.pow(d, 2.0) * 0.72;                 // continent bias + ocean falloff
            const m = moistNoise(x * 0.05 + 300, y * 0.05 + 300, 4);

            let t;
            if (e < -0.14)      t = T.DEEP;
            else if (e < 0.02)  t = T.WATER;
            else if (e < 0.06)  t = T.SAND;
            else if (e > 0.66)  t = T.SNOW;
            else if (e > 0.52)  t = T.MOUNTAIN;
            else if (e > 0.40)  t = T.HILLS;
            else if (m < -0.22) t = T.DESERT;
            else if (m > 0.30 && e < 0.16) t = T.SWAMP;
            else if (m > 0.08)  t = T.FOREST;
            else                t = T.GRASS;
            tiles[y * MAP_W + x] = t;
        }
    }

    const isLand = (x, y) => {
        const t = tiles[y * MAP_W + x];
        return t !== T.DEEP && t !== T.WATER;
    };
    const isWalkableGround = (x, y) => {
        const t = tiles[y * MAP_W + x];
        return t === T.SAND || t === T.GRASS || t === T.FOREST || t === T.DESERT;
    };

    // --- find the mainland: largest connected passable region ---
    const comp = new Int32Array(MAP_W * MAP_H).fill(-1);
    const compSizes = [];
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            const i0 = y * MAP_W + x;
            if (comp[i0] !== -1 || !TERRAIN[tiles[i0]].pass) continue;
            const id = compSizes.length;
            let size = 0;
            const stack = [i0];
            comp[i0] = id;
            while (stack.length) {
                const i = stack.pop();
                size++;
                const ix = i % MAP_W, iy = (i / MAP_W) | 0;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = ix + dx, ny = iy + dy;
                    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
                    const j = ny * MAP_W + nx;
                    if (comp[j] === -1 && TERRAIN[tiles[j]].pass) { comp[j] = id; stack.push(j); }
                }
            }
            compSizes.push(size);
        }
    }
    let mainland = 0;
    for (let i = 1; i < compSizes.length; i++) if (compSizes[i] > compSizes[mainland]) mainland = i;
    const onMainland = (x, y) => comp[y * MAP_W + x] === mainland;

    // --- starting position: a mainland beach, biased toward the west coast ---
    let start = null;
    const beachCandidates = [];
    for (let y = 2; y < MAP_H - 2; y++)
        for (let x = 2; x < MAP_W - 2; x++)
            if (tiles[y * MAP_W + x] === T.SAND && onMainland(x, y)) beachCandidates.push({ x, y });
    if (beachCandidates.length) {
        beachCandidates.sort((a, b) => a.x - b.x);
        start = beachCandidates[Math.floor(rand() * Math.min(30, beachCandidates.length))];
    } else {
        // degenerate world with no mainland beach; drop anywhere on the mainland
        for (let y = 0; y < MAP_H && !start; y++)
            for (let x = 0; x < MAP_W && !start; x++)
                if (onMainland(x, y)) start = { x, y };
    }

    // --- landmarks ---
    const landmarks = [];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    function place(type, count, opts = {}) {
        const { minDistOthers = 9, minDistStart = 12, filter = isWalkableGround, minStart = 0 } = opts;
        const ok = (x, y) => filter(x, y) && onMainland(x, y);
        let placed = 0, tries = 0;
        while (placed < count && tries < 6000) {
            tries++;
            const x = 4 + Math.floor(rand() * (MAP_W - 8));
            const y = 4 + Math.floor(rand() * (MAP_H - 8));
            if (!ok(x, y)) continue;
            const p = { x, y };
            if (dist(p, start) < Math.max(minDistStart, minStart)) continue;
            if (landmarks.some(l => dist(l, p) < minDistOthers)) continue;
            landmarks.push({ type, x, y, found: false });
            placed++;
        }
        return placed;
    }
    const nearWater = (x, y) => {
        if (tiles[y * MAP_W + x] !== T.SAND) return false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const t = tiles[(y + dy) * MAP_W + (x + dx)];
            if (t === T.WATER || t === T.DEEP) return true;
        }
        return false;
    };

    const passableLand = (x, y) => isLand(x, y) && TERRAIN[tiles[y * MAP_W + x]].pass;

    // The Lost City must exist: try far from start, then relax, then take the
    // farthest passable tile outright.
    if (!place("lostcity", 1, { minStart: Math.min(MAP_W, MAP_H) * 0.42, minDistOthers: 14, filter: passableLand })
        && !place("lostcity", 1, { minStart: Math.min(MAP_W, MAP_H) * 0.25, minDistOthers: 8, filter: passableLand })) {
        let far = null, farD = -1;
        for (let y = 1; y < MAP_H - 1; y++)
            for (let x = 1; x < MAP_W - 1; x++)
                if (passableLand(x, y) && onMainland(x, y)) {
                    const d = dist({ x, y }, start);
                    if (d > farD) { farD = d; far = { x, y }; }
                }
        if (far) landmarks.push({ type: "lostcity", x: far.x, y: far.y, found: false });
    }

    // Everything else: normal pass, then a relaxed pass to fill shortfalls.
    const wanted = [
        ["village", 5, { minDistStart: 8 }],
        ["temple", 4, {}],
        ["ruins", 7, {}],
        ["obelisk", 4, { filter: passableLand }],
        ["shipwreck", 4, { filter: nearWater, minDistOthers: 7 }],
    ];
    for (const [type, count, opts] of wanted) {
        const short = count - place(type, count, opts);
        if (short > 0) place(type, short, { ...opts, minDistOthers: 4, minDistStart: 5 });
    }

    // 3 map fragments hidden among ruins & temples — force extra ruins if the
    // world is too cramped, so the Lost City is always attainable.
    let holders = landmarks.filter(l => l.type === "ruins" || l.type === "temple");
    let guard = 0;
    while (holders.length < 3 && guard++ < 4000) {
        const x = 1 + Math.floor(rand() * (MAP_W - 2));
        const y = 1 + Math.floor(rand() * (MAP_H - 2));
        if (!passableLand(x, y) || !onMainland(x, y)) continue;
        if (landmarks.some(l => l.x === x && l.y === y)) continue;
        const l = { type: "ruins", x, y, found: false };
        landmarks.push(l);
        holders.push(l);
    }
    for (let i = holders.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [holders[i], holders[j]] = [holders[j], holders[i]];
    }
    holders.slice(0, 3).forEach(l => { l.fragment = true; });

    let landTotal = 0;
    for (let y = 0; y < MAP_H; y++)
        for (let x = 0; x < MAP_W; x++)
            if (isLand(x, y)) landTotal++;

    return { seed: seedStr, tiles, landmarks, start, landTotal };
}

/* ============================== Audio ================================== */
const Sound = {
    ctx: null, muted: false,
    ensure() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { this.muted = true; }
        }
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, dur, type = "sine", vol = 0.08, when = 0) {
        if (this.muted || !this.ctx) return;
        const t0 = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type; osc.frequency.value = freq;
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g).connect(this.ctx.destination);
        osc.start(t0); osc.stop(t0 + dur + 0.05);
    },
    step()     { this.tone(90 + Math.random() * 30, 0.07, "triangle", 0.03); },
    forage()   { this.tone(520, 0.12, "sine", 0.05); this.tone(660, 0.14, "sine", 0.05, 0.08); },
    discover() { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.22, "sine", 0.07, i * 0.09)); },
    fragment() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, "sine", 0.08, i * 0.11)); },
    denied()   { this.tone(120, 0.18, "sawtooth", 0.05); },
    camp()     { this.tone(330, 0.4, "sine", 0.05); this.tone(220, 0.5, "sine", 0.05, 0.2); },
    win()      { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.35, "sine", 0.09, i * 0.16)); },
    lose()     { [330, 277, 233, 196].forEach((f, i) => this.tone(f, 0.4, "sine", 0.07, i * 0.22)); },
};

/* ============================ Game state =============================== */
const G = {
    world: null,
    fog: null,               // 0 unknown, 1 charted, 2 in sight
    px: 0, py: 0,
    supplies: START_SUPPLIES,
    gold: 0,
    fragments: 0,
    time: DAY_LENGTH * 0.15, // start in the morning
    day: 1,
    weather: "clear",        // clear | rain
    exploredLand: 0,
    landmarksFound: 0,
    steps: 0,
    cityRevealed: false,
    over: false,
    path: [],                // queued auto-travel tiles
    pathTimer: 0,
    particles: [],
    forageCooldown: 0,
    running: false,
};

const cam = { x: 0, y: 0, tx: 0, ty: 0, zoom: 30 };

/* ============================== Canvas ================================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const mmctx = minimap.getContext("2d");
const bigmap = document.getElementById("bigmap");
const bmctx = bigmap.getContext("2d");

function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/* =============================== Fog =================================== */
function visionRadius() {
    let r = 4.4;
    if (isNight()) r -= 1.8;
    if (G.weather === "rain") r -= 0.8;
    return Math.max(2.2, r);
}
function updateFog() {
    const w = G.world;
    // downgrade "in sight" → "charted"
    for (let i = 0; i < G.fog.length; i++) if (G.fog[i] === 2) G.fog[i] = 1;
    const r = visionRadius(), r2 = r * r;
    const x0 = Math.max(0, Math.floor(G.px - r)), x1 = Math.min(MAP_W - 1, Math.ceil(G.px + r));
    const y0 = Math.max(0, Math.floor(G.py - r)), y1 = Math.min(MAP_H - 1, Math.ceil(G.py + r));
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const dx = x - G.px, dy = y - G.py;
            if (dx * dx + dy * dy <= r2) {
                const i = y * MAP_W + x;
                if (G.fog[i] === 0) {
                    const t = w.tiles[i];
                    if (t !== T.DEEP && t !== T.WATER) G.exploredLand++;
                }
                G.fog[i] = 2;
            }
        }
    }
    updateHUD();
    drawMinimap();
}
function revealArea(cx, cy, r) {
    const r2 = r * r;
    for (let y = Math.max(0, cy - r); y <= Math.min(MAP_H - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(MAP_W - 1, cx + r); x++) {
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy <= r2) {
                const i = y * MAP_W + x;
                if (G.fog[i] === 0) {
                    const t = G.world.tiles[i];
                    if (t !== T.DEEP && t !== T.WATER) G.exploredLand++;
                    G.fog[i] = 1;
                }
            }
        }
    }
}

/* ============================ Time & weather =========================== */
function isNight() { return (G.time % DAY_LENGTH) / DAY_LENGTH >= NIGHT_START; }
function advanceTime(ticks) {
    const prevDay = G.day;
    G.time += ticks;
    G.day = Math.floor(G.time / DAY_LENGTH) + 1;
    if (G.day !== prevDay) rollWeather();
}
function rollWeather() {
    const wasRain = G.weather === "rain";
    G.weather = Math.random() < 0.22 ? "rain" : "clear";
    if (G.weather === "rain" && !wasRain) log("Storm clouds gather. Rain slows the expedition.", "bad");
    if (G.weather === "clear" && wasRain) log("The skies clear.");
}

/* ============================== Logging ================================ */
const logEl = document.getElementById("log");
function log(text, kind = "") {
    const div = document.createElement("div");
    div.className = "log-msg" + (kind ? " " + kind : "");
    div.textContent = text;
    logEl.appendChild(div);
    while (logEl.children.length > 6) logEl.removeChild(logEl.firstChild);
    setTimeout(() => div.classList.add("fade"), 9000);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 10500);
}

/* ============================ Movement ================================= */
function tileAt(x, y) { return G.world.tiles[y * MAP_W + x]; }
function passable(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    return TERRAIN[tileAt(x, y)].pass;
}

function tryMove(dx, dy) {
    if (G.over) return;
    const nx = G.px + dx, ny = G.py + dy;
    if (!passable(nx, ny)) {
        const t = (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H) ? TERRAIN[tileAt(nx, ny)].name : "the void";
        log(`You cannot cross ${t}.`, "bad");
        Sound.denied();
        return;
    }
    const terr = TERRAIN[tileAt(nx, ny)];
    let cost = terr.cost;
    if (G.weather === "rain") cost += 0.5;

    G.px = nx; G.py = ny;
    G.steps++;
    G.supplies = Math.max(0, G.supplies - cost);
    advanceTime(Math.ceil(cost));
    Sound.step();

    forageCheck(nx, ny);
    updateFog();
    checkLandmark();
    checkSupplies();
    saveGame();
}

function forageCheck(x, y) {
    if (G.forageCooldown > 0) { G.forageCooldown--; return; }
    const t = tileAt(x, y);
    let chance = 0, amount = 0, what = "";
    if (t === T.FOREST)      { chance = 0.16; amount = 4 + Math.floor(Math.random() * 5); what = "berries and game"; }
    else if (t === T.GRASS)  { chance = 0.08; amount = 2 + Math.floor(Math.random() * 4); what = "wild roots"; }
    else if (t === T.SWAMP)  { chance = 0.06; amount = 3 + Math.floor(Math.random() * 3); what = "swamp eels"; }
    if (chance && Math.random() < chance && G.supplies < START_SUPPLIES) {
        G.supplies = Math.min(START_SUPPLIES, G.supplies + amount);
        G.forageCooldown = 6;
        log(`Foraged ${what} (+${amount} supplies).`, "good");
        Sound.forage();
        spawnParticles(x, y, "#8fce6a", 8);
    }
}

function checkSupplies() {
    if (G.supplies <= 0) return endGame(false, "starved");
    if (G.supplies <= 20 && !G._warned20) { G._warned20 = true; log("Supplies are running low!", "bad"); }
    if (G.supplies <= 10 && !G._warned10) { G._warned10 = true; log("Your expedition is nearly out of supplies!", "bad"); }
    if (G.supplies > 20) { G._warned20 = false; G._warned10 = false; }
}

/* ============================ Landmarks ================================ */
function landmarkAt(x, y) {
    return G.world.landmarks.find(l => l.x === x && l.y === y);
}
function checkLandmark() {
    const l = landmarkAt(G.px, G.py);
    if (!l || l.found) return;
    l.found = true;
    G.landmarksFound++;
    const def = LANDMARKS[l.type];
    spawnParticles(l.x, l.y, "#e3b341", 20);

    switch (l.type) {
        case "village": {
            G.supplies = START_SUPPLIES;
            log(`⛺ ${def.label} — the locals share food and stories. Supplies fully restocked!`, "good");
            Sound.discover();
            break;
        }
        case "ruins": {
            const gold = 20 + Math.floor(Math.random() * 41);
            G.gold += gold;
            log(`🗿 ${def.label} — you unearth ${gold} gold among the fallen stones.`, "good");
            Sound.discover();
            grantFragment(l);
            break;
        }
        case "temple": {
            const gold = 40 + Math.floor(Math.random() * 51);
            G.gold += gold;
            log(`🏛️ ${def.label} — offerings of ${gold} gold lie untouched on the altar.`, "good");
            Sound.discover();
            grantFragment(l);
            break;
        }
        case "shipwreck": {
            const gold = 10 + Math.floor(Math.random() * 21);
            G.gold += gold;
            G.supplies = Math.min(START_SUPPLIES, G.supplies + 25);
            log(`⚓ ${def.label} — salvaged ${gold} gold and 25 supplies from the hold.`, "good");
            Sound.discover();
            break;
        }
        case "obelisk": {
            revealArea(l.x, l.y, 7);
            log(`🗼 ${def.label} — carvings depict the surrounding lands. Your map expands!`, "good");
            Sound.discover();
            drawMinimap();
            break;
        }
        case "lostcity": {
            endGame(true);
            return;
        }
    }
    updateHUD();
    saveGame();
}
function grantFragment(l) {
    if (!l.fragment) return;
    G.fragments++;
    Sound.fragment();
    if (G.fragments >= 3) {
        G.cityRevealed = true;
        const city = G.world.landmarks.find(k => k.type === "lostcity");
        if (city) revealArea(city.x, city.y, 3);
        log("🗺️ The third map fragment! Assembled, they reveal the LOST CITY. Follow the golden compass!", "good");
        document.getElementById("compass").classList.remove("hidden");
        drawMinimap();
    } else {
        log(`🗺️ You found a map fragment! (${G.fragments} of 3)`, "good");
    }
}

/* ============================ Pathfinding ============================== */
function findPath(sx, sy, gx, gy) {
    // A* over charted, passable tiles
    const open = [{ x: sx, y: sy, g: 0, f: 0, parent: null }];
    const best = new Map([[sy * MAP_W + sx, 0]]);
    const h = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);
    while (open.length) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
        const cur = open.splice(bi, 1)[0];
        if (cur.x === gx && cur.y === gy) {
            const path = [];
            for (let n = cur; n.parent; n = n.parent) path.unshift({ x: n.x, y: n.y });
            return path;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cur.x + dx, ny = cur.y + dy;
            if (!passable(nx, ny)) continue;
            const i = ny * MAP_W + nx;
            if (G.fog[i] === 0) continue; // only travel through charted land
            const g = cur.g + TERRAIN[tileAt(nx, ny)].cost;
            if (best.has(i) && best.get(i) <= g) continue;
            best.set(i, g);
            open.push({ x: nx, y: ny, g, f: g + h(nx, ny), parent: cur });
        }
        if (best.size > 9000) break; // safety valve
    }
    return null;
}

/* ============================ Particles ================================ */
function spawnParticles(tx, ty, color, n) {
    for (let i = 0; i < n; i++) {
        G.particles.push({
            x: tx + 0.5, y: ty + 0.5,
            vx: (Math.random() - 0.5) * 2.4,
            vy: (Math.random() - 0.9) * 2.4,
            life: 0.7 + Math.random() * 0.6,
            age: 0, color,
        });
    }
}

/* ============================== Render ================================= */
let lastFrame = performance.now();
const rainDrops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }));

function shade([r, g, b], f) { return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; }

function draw(now) {
    requestAnimationFrame(draw);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!G.running) return;

    // auto-travel along queued path
    if (G.path.length && !G.over) {
        G.pathTimer -= dt;
        if (G.pathTimer <= 0) {
            const next = G.path.shift();
            tryMove(next.x - G.px, next.y - G.py);
            G.pathTimer = 0.13;
        }
    }

    const vw = window.innerWidth, vh = window.innerHeight;
    const z = cam.zoom;

    // camera follows player
    cam.tx = (G.px + 0.5) * z - vw / 2;
    cam.ty = (G.py + 0.5) * z - vh / 2;
    cam.x += (cam.tx - cam.x) * Math.min(1, dt * 6);
    cam.y += (cam.ty - cam.y) * Math.min(1, dt * 6);

    ctx.fillStyle = "#0b0e12";
    ctx.fillRect(0, 0, vw, vh);

    const x0 = Math.max(0, Math.floor(cam.x / z)), x1 = Math.min(MAP_W - 1, Math.ceil((cam.x + vw) / z));
    const y0 = Math.max(0, Math.floor(cam.y / z)), y1 = Math.min(MAP_H - 1, Math.ceil((cam.y + vh) / z));
    const waterPhase = now / 1000;

    for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
            const i = ty * MAP_W + tx;
            const fog = G.fog[i];
            if (fog === 0) continue;
            const t = G.world.tiles[i];
            const def = TERRAIN[t];
            let f = 0.9 + tileHash(tx, ty) * 0.2;                 // texture variation
            if (t === T.WATER || t === T.DEEP)
                f += Math.sin(waterPhase * 1.6 + tx * 0.7 + ty * 1.1) * 0.07;  // shimmer
            if (fog === 1) f *= 0.45;                              // charted but out of sight
            ctx.fillStyle = shade(def.color, f);
            const sx = Math.floor(tx * z - cam.x), sy = Math.floor(ty * z - cam.y);
            ctx.fillRect(sx, sy, Math.ceil(z) + 1, Math.ceil(z) + 1);

            // terrain detail glyphs (cheap, deterministic)
            if (fog === 2 && z >= 22) {
                const hsh = tileHash(tx * 3 + 1, ty * 3 + 7);
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.font = `${Math.floor(z * 0.55)}px serif`;
                if (t === T.FOREST && hsh < 0.5)      ctx.fillText("🌲", sx + z / 2, sy + z / 2);
                else if (t === T.MOUNTAIN && hsh < 0.45) ctx.fillText("⛰️", sx + z / 2, sy + z / 2);
                else if (t === T.DESERT && hsh < 0.1)  ctx.fillText("🌵", sx + z / 2, sy + z / 2);
                else if (t === T.SWAMP && hsh < 0.2)   ctx.fillText("🌿", sx + z / 2, sy + z / 2);
                else if (t === T.SNOW && hsh < 0.12)   ctx.fillText("❄️", sx + z / 2, sy + z / 2);
            }
        }
    }

    // landmarks
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const l of G.world.landmarks) {
        const i = l.y * MAP_W + l.x;
        if (G.fog[i] === 0 && !(l.type === "lostcity" && G.cityRevealed)) continue;
        if (l.x < x0 - 1 || l.x > x1 + 1 || l.y < y0 - 1 || l.y > y1 + 1) continue;
        const sx = (l.x + 0.5) * z - cam.x, sy = (l.y + 0.5) * z - cam.y;
        const bob = l.type === "lostcity" ? Math.sin(now / 300) * z * 0.06 : 0;
        ctx.globalAlpha = G.fog[i] === 1 ? 0.75 : 1;
        if (!l.found) {
            ctx.beginPath();
            ctx.arc(sx, sy, z * 0.52 + Math.sin(now / 400) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(227,179,65,0.55)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.font = `${Math.floor(z * 0.8)}px serif`;
        ctx.fillText(LANDMARKS[l.type].icon, sx, sy + bob);
        ctx.globalAlpha = 1;
    }

    // path preview
    if (G.path.length) {
        ctx.fillStyle = "rgba(255, 240, 200, 0.5)";
        for (const p of G.path) {
            const sx = (p.x + 0.5) * z - cam.x, sy = (p.y + 0.5) * z - cam.y;
            ctx.beginPath(); ctx.arc(sx, sy, z * 0.09, 0, Math.PI * 2); ctx.fill();
        }
    }

    // player
    {
        const sx = (G.px + 0.5) * z - cam.x;
        const sy = (G.py + 0.5) * z - cam.y + Math.sin(now / 250) * z * 0.04;
        ctx.beginPath();
        ctx.ellipse(sx, sy + z * 0.28, z * 0.26, z * 0.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();
        ctx.font = `${Math.floor(z * 0.85)}px serif`;
        ctx.fillText("🧭", sx, sy - z * 0.05);
        ctx.beginPath();
        ctx.arc(sx, sy, z * 0.6 + Math.sin(now / 500) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // particles
    for (let i = G.particles.length - 1; i >= 0; i--) {
        const p = G.particles[i];
        p.age += dt;
        if (p.age >= p.life) { G.particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 2.4 * dt;
        const sx = p.x * z - cam.x, sy = p.y * z - cam.y;
        ctx.globalAlpha = 1 - p.age / p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(sx, sy, 3, 3);
    }
    ctx.globalAlpha = 1;

    // rain
    if (G.weather === "rain") {
        ctx.strokeStyle = "rgba(180, 200, 230, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of rainDrops) {
            d.y += dt * d.s * 1.6; d.x += dt * 0.12;
            if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
            const rx = d.x * vw, ry = d.y * vh;
            ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 11 * d.s);
        }
        ctx.stroke();
    }

    // night: darkness with a lantern glow around the player
    const dayFrac = (G.time % DAY_LENGTH) / DAY_LENGTH;
    let darkness = 0;
    if (dayFrac >= NIGHT_START) {
        const nf = (dayFrac - NIGHT_START) / (1 - NIGHT_START);
        darkness = 0.55 * Math.sin(Math.min(1, nf * 1.4) * Math.PI * 0.5 + (nf > 0.85 ? (nf - 0.85) : 0));
        darkness = Math.min(0.55, Math.max(0, 0.55 * Math.sin(nf * Math.PI)));
    }
    if (darkness > 0.02) {
        const sx = (G.px + 0.5) * z - cam.x, sy = (G.py + 0.5) * z - cam.y;
        const grad = ctx.createRadialGradient(sx, sy, z * 1.5, sx, sy, z * 7);
        grad.addColorStop(0, `rgba(8, 10, 24, ${darkness * 0.25})`);
        grad.addColorStop(1, `rgba(8, 10, 24, ${darkness})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, vw, vh);
    }

    // compass needle toward the lost city
    if (G.cityRevealed && !G.over) {
        const city = G.world.landmarks.find(l => l.type === "lostcity");
        if (city) {
            const ang = Math.atan2(city.y - G.py, city.x - G.px);
            document.getElementById("compass-needle").style.transform = `rotate(${ang}rad)`;
        }
    }
}
requestAnimationFrame(draw);

/* ============================= Minimap ================================= */
function drawMinimap() {
    const w = minimap.width, h = minimap.height;
    mmctx.fillStyle = "#0d1420";
    mmctx.fillRect(0, 0, w, h);
    const sx = w / MAP_W, sy = h / MAP_H;
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            const i = y * MAP_W + x;
            if (G.fog[i] === 0) continue;
            const c = TERRAIN[G.world.tiles[i]].color;
            const f = G.fog[i] === 1 ? 0.6 : 1;
            mmctx.fillStyle = shade(c, f);
            mmctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
        }
    }
    for (const l of G.world.landmarks) {
        const known = G.fog[l.y * MAP_W + l.x] !== 0 || (l.type === "lostcity" && G.cityRevealed);
        if (!known) continue;
        mmctx.fillStyle = l.type === "lostcity" ? "#ffd700" : (l.found ? "#9c8b60" : "#e3b341");
        mmctx.fillRect(l.x * sx - 1, l.y * sy - 1, 3, 3);
    }
    mmctx.fillStyle = "#ff5540";
    mmctx.fillRect(G.px * sx - 1.5, G.py * sy - 1.5, 4, 4);
}

function drawBigmap() {
    const w = bigmap.width, h = bigmap.height;
    bmctx.fillStyle = "#0d1420";
    bmctx.fillRect(0, 0, w, h);
    const sx = w / MAP_W, sy = h / MAP_H;
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            const i = y * MAP_W + x;
            if (G.fog[i] === 0) continue;
            const f = (G.fog[i] === 1 ? 0.7 : 1) * (0.92 + tileHash(x, y) * 0.16);
            bmctx.fillStyle = shade(TERRAIN[G.world.tiles[i]].color, f);
            bmctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
        }
    }
    bmctx.textAlign = "center"; bmctx.textBaseline = "middle";
    bmctx.font = "13px serif";
    for (const l of G.world.landmarks) {
        const known = G.fog[l.y * MAP_W + l.x] !== 0 || (l.type === "lostcity" && G.cityRevealed);
        if (!known) continue;
        bmctx.globalAlpha = l.found ? 0.8 : 1;
        bmctx.fillText(LANDMARKS[l.type].icon, (l.x + 0.5) * sx, (l.y + 0.5) * sy);
        bmctx.globalAlpha = 1;
    }
    bmctx.font = "15px serif";
    bmctx.fillText("📍", (G.px + 0.5) * sx, (G.py + 0.5) * sy);
}

/* =============================== HUD =================================== */
function updateHUD() {
    document.getElementById("supply-num").textContent = Math.ceil(G.supplies);
    const fill = document.getElementById("supply-fill");
    fill.style.width = `${(G.supplies / START_SUPPLIES) * 100}%`;
    fill.classList.toggle("low", G.supplies <= 25);
    document.getElementById("gold-num").textContent = G.gold;
    document.getElementById("frag-num").textContent = `${G.fragments} / 3`;
    document.getElementById("chart-num").textContent =
        `${Math.round((G.exploredLand / Math.max(1, G.world.landTotal)) * 100)}%`;
    document.getElementById("day-num").textContent = `Day ${G.day}`;
    document.getElementById("time-icon").textContent = isNight() ? "🌙" : "☀️";
    document.getElementById("weather-icon").textContent = G.weather === "rain" ? "🌧️" : "🌤️";
}

/* ============================ Save / Load ============================== */
function saveGame() {
    if (G.over) return;
    try {
        const fogB64 = btoa(String.fromCharCode(...G.fog));
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            seed: G.world.seed, fog: fogB64,
            px: G.px, py: G.py,
            supplies: G.supplies, gold: G.gold, fragments: G.fragments,
            time: G.time, weather: G.weather,
            steps: G.steps, cityRevealed: G.cityRevealed,
            found: G.world.landmarks.map(l => l.found ? 1 : 0),
        }));
    } catch (e) { /* storage unavailable — play on without saves */ }
}
function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const s = JSON.parse(raw);
        startWorld(s.seed);
        const bytes = atob(s.fog);
        for (let i = 0; i < bytes.length && i < G.fog.length; i++) {
            G.fog[i] = Math.min(1, bytes.charCodeAt(i)); // everything charted, nothing "in sight" yet
        }
        G.px = s.px; G.py = s.py;
        G.supplies = s.supplies; G.gold = s.gold; G.fragments = s.fragments;
        G.time = s.time; G.day = Math.floor(s.time / DAY_LENGTH) + 1;
        G.weather = s.weather || "clear";
        G.steps = s.steps || 0;
        G.cityRevealed = !!s.cityRevealed;
        (s.found || []).forEach((f, i) => { if (G.world.landmarks[i]) G.world.landmarks[i].found = !!f; });
        G.landmarksFound = G.world.landmarks.filter(l => l.found).length;
        // recount explored land
        G.exploredLand = 0;
        for (let i = 0; i < G.fog.length; i++) {
            if (G.fog[i] !== 0) {
                const t = G.world.tiles[i];
                if (t !== T.DEEP && t !== T.WATER) G.exploredLand++;
            }
        }
        if (G.cityRevealed) document.getElementById("compass").classList.remove("hidden");
        updateFog();
        log("Expedition journal restored. Onward!");
        return true;
    } catch (e) { return false; }
}

/* ============================ Game flow ================================ */
function startWorld(seed) {
    G.world = generateWorld(seed);
    G.fog = new Uint8Array(MAP_W * MAP_H);
    G.px = G.world.start.x; G.py = G.world.start.y;
    G.supplies = START_SUPPLIES;
    G.gold = 0; G.fragments = 0;
    G.time = DAY_LENGTH * 0.15; G.day = 1;
    G.weather = "clear";
    G.exploredLand = 0; G.landmarksFound = 0; G.steps = 0;
    G.cityRevealed = false; G.over = false;
    G.path = []; G.particles = []; G.forageCooldown = 0;
    G._warned10 = G._warned20 = false;
    cam.zoom = 30;
    cam.x = (G.px + 0.5) * cam.zoom - window.innerWidth / 2;
    cam.y = (G.py + 0.5) * cam.zoom - window.innerHeight / 2;
    document.getElementById("compass").classList.add("hidden");
    logEl.innerHTML = "";
    G.running = true;
    updateFog();
    updateHUD();
}

function newExpedition(seed) {
    startWorld(seed);
    log(`You land on an unknown shore. World seed: ${seed}`);
    log("Find 3 map fragments in ruins and temples to reveal the Lost City.");
    saveGame();
}

function endGame(won, reason) {
    if (G.over) return;
    G.over = true;
    G.path = [];
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}

    const title = document.getElementById("end-title");
    const text = document.getElementById("end-text");
    const chartPct = Math.round((G.exploredLand / Math.max(1, G.world.landTotal)) * 100);
    const score = G.gold + chartPct * 5 + G.landmarksFound * 25 + (won ? 500 : 0);

    if (won) {
        title.textContent = "👑 The Lost City!";
        title.className = "win";
        text.textContent = "Golden spires rise from the jungle mist. The legends were true — and it was YOU who found them. Your name will be etched into every map that follows.";
        Sound.win();
        spawnParticles(G.px, G.py, "#ffd700", 40);
    } else {
        title.textContent = "☠️ Expedition Lost";
        title.className = "lose";
        text.textContent = reason === "starved"
            ? "Your supplies are gone. Weak and starving, the expedition turns back — the Lost City keeps its secret a while longer."
            : "The expedition has come to an end.";
        Sound.lose();
    }

    document.getElementById("end-stats").innerHTML = [
        [won ? "🏆" : "📜", score, "Final score"],
        ["🪙", G.gold, "Gold"],
        ["🧭", chartPct + "%", "Land charted"],
        ["📍", G.landmarksFound, "Landmarks"],
        ["🗺️", G.fragments + "/3", "Fragments"],
        ["☀️", G.day, "Days"],
    ].map(([ic, v, k]) =>
        `<div class="stat-cell"><span class="v">${ic} ${v}</span><span class="k">${k}</span></div>`
    ).join("");

    setTimeout(() => document.getElementById("end-overlay").classList.remove("hidden"), won ? 900 : 400);
}

/* ============================== Input ================================== */
window.addEventListener("keydown", (e) => {
    if (document.activeElement && document.activeElement.tagName === "INPUT") return;
    const k = e.key.toLowerCase();

    if (k === "m") { toggleOverlay("bigmap-overlay"); e.preventDefault(); return; }
    if (k === "h" || k === "?") { toggleOverlay("help-overlay"); e.preventDefault(); return; }
    if (k === "escape") {
        ["bigmap-overlay", "help-overlay"].forEach(id => document.getElementById(id).classList.add("hidden"));
        return;
    }
    if (!G.running || G.over) return;
    if (!document.getElementById("title-overlay").classList.contains("hidden")) return;

    Sound.ensure();
    let dx = 0, dy = 0;
    if (k === "arrowup" || k === "w") dy = -1;
    else if (k === "arrowdown" || k === "s") dy = 1;
    else if (k === "arrowleft" || k === "a") dx = -1;
    else if (k === "arrowright" || k === "d") dx = 1;
    else if (k === "c") { camp(); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    G.path = []; // manual input interrupts auto-travel
    tryMove(dx, dy);
});

canvas.addEventListener("click", (e) => {
    if (!G.running || G.over) return;
    if (!document.getElementById("title-overlay").classList.contains("hidden")) return;
    Sound.ensure();
    const tx = Math.floor((e.clientX + cam.x) / cam.zoom);
    const ty = Math.floor((e.clientY + cam.y) / cam.zoom);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    const i = ty * MAP_W + tx;
    if (G.fog[i] === 0) { log("You can only travel to charted territory.", "bad"); Sound.denied(); return; }
    if (!passable(tx, ty)) { log(`You cannot travel across ${TERRAIN[tileAt(tx, ty)].name}.`, "bad"); Sound.denied(); return; }
    const path = findPath(G.px, G.py, tx, ty);
    if (!path) { log("No safe route there.", "bad"); Sound.denied(); return; }
    G.path = path;
    G.pathTimer = 0;
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.zoom = Math.max(16, Math.min(52, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
}, { passive: false });

function camp() {
    if (G.supplies <= 4) { log("Not enough supplies to make camp.", "bad"); Sound.denied(); return; }
    G.supplies -= 4;
    const dayFrac = (G.time % DAY_LENGTH) / DAY_LENGTH;
    const toMorning = dayFrac < 0.15
        ? (0.15 - dayFrac) * DAY_LENGTH
        : (1 - dayFrac + 0.15) * DAY_LENGTH;
    advanceTime(Math.ceil(toMorning));
    Sound.camp();
    log("You make camp and rest until morning. (−4 supplies)");
    updateFog();
    updateHUD();
    saveGame();
}

/* ============================ UI wiring ================================ */
function toggleOverlay(id) {
    const el = document.getElementById(id);
    const show = el.classList.contains("hidden");
    el.classList.toggle("hidden");
    if (id === "bigmap-overlay" && show) drawBigmap();
}
document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => document.getElementById(btn.dataset.close).classList.add("hidden")));

document.getElementById("btn-map").addEventListener("click", () => toggleOverlay("bigmap-overlay"));
document.getElementById("btn-help").addEventListener("click", () => toggleOverlay("help-overlay"));
document.getElementById("btn-camp").addEventListener("click", () => { if (G.running && !G.over) { Sound.ensure(); camp(); } });
document.getElementById("btn-sound").addEventListener("click", (e) => {
    Sound.ensure();
    Sound.muted = !Sound.muted;
    e.target.textContent = Sound.muted ? "🔇" : "🔊";
});
document.getElementById("btn-menu").addEventListener("click", () => {
    document.getElementById("title-overlay").classList.remove("hidden");
    refreshContinueButton();
});

function randomSeed() {
    const words = ["AMBER", "RAVEN", "TIGER", "CORAL", "STORM", "EMBER", "LOTUS", "ONYX",
                   "PEARL", "SABLE", "IVORY", "AZURE", "CEDAR", "FJORD", "GALE", "DUNE"];
    return words[Math.floor(Math.random() * words.length)] + "-" +
           Math.floor(1000 + Math.random() * 9000);
}
const seedInput = document.getElementById("seed-input");
seedInput.value = randomSeed();
document.getElementById("btn-reroll").addEventListener("click", () => { seedInput.value = randomSeed(); });

function refreshContinueButton() {
    let has = false;
    try { has = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
    document.getElementById("btn-continue").disabled = !has;
}
refreshContinueButton();

document.getElementById("btn-new").addEventListener("click", () => {
    Sound.ensure();
    const seed = seedInput.value.trim() || randomSeed();
    document.getElementById("title-overlay").classList.add("hidden");
    document.getElementById("end-overlay").classList.add("hidden");
    newExpedition(seed);
});
document.getElementById("btn-continue").addEventListener("click", () => {
    Sound.ensure();
    if (loadGame()) {
        document.getElementById("title-overlay").classList.add("hidden");
        document.getElementById("end-overlay").classList.add("hidden");
    } else {
        log("The old journal is unreadable. Start a new expedition.", "bad");
        refreshContinueButton();
    }
});
document.getElementById("btn-again").addEventListener("click", () => {
    document.getElementById("end-overlay").classList.add("hidden");
    document.getElementById("title-overlay").classList.remove("hidden");
    seedInput.value = randomSeed();
    refreshContinueButton();
});
