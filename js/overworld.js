/* the overworld — a 13x7 grid. @ is you. the fog only lifts where you walk. */
window.TI = window.TI || {};

TI.overworld = {
    W: 13, H: 7,
    /* S swamp · C castle · F forest · K sea cliff · R ruins · V cave · ~ cabin
       t trees · ^ hills · , reeds · ≈ water · . field */
    MAP: [
        "SS,.....tt.CC",
        "SS,.t....t.CC",
        ",tt...^..VV^≈",
        "tFF...~..VV.≈",
        "tFF.......^≈≈",
        "....RR....KK≈",
        "....RR..≈≈KK≈",
    ],
    LETTERS: { S: "swamp", C: "castle", F: "forest", K: "cliff", R: "ruins", V: "cave" },

    tile(x, y) {
        if (x < 0 || y < 0 || x >= this.W || y >= this.H) return null;
        return this.MAP[y][x];
    },

    show() {
        TI.menuClose();
        TI.view = this;
        TI.mode = "free";
        TI.setLocation("terra incognita");
        TI.setMapTheme("");
        TI.music.setScene("overworld");
        this.discover();
        this.render();
        TI.updateSidebar();
        // slow water shimmer
        if (!this._anim) {
            this._anim = setInterval(() => {
                if (TI.view === this && (TI.mode === "free" || TI.mode === "menu")) {
                    this._wave = !this._wave;
                    this.render();
                }
            }, 900);
        }
    },
    _wave: false,

    discover() {
        const s = TI.state.ow;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = s.x + dx, y = s.y + dy;
                if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
                const i = y * this.W + x;
                if (!s.disc.includes(i)) s.disc.push(i);
            }
        }
    },

    render() {
        const s = TI.state.ow;
        let out = "";
        for (let y = 0; y < this.H; y++) {
            for (let x = 0; x < this.W; x++) {
                const i = y * this.W + x;
                let ch, cls;
                if (x === s.x && y === s.y) { ch = "@"; cls = "t-you"; }
                else if (!s.disc.includes(i)) { ch = "·"; cls = "t-dim"; }
                else {
                    ch = this.MAP[y][x];
                    if (this.LETTERS[ch]) {
                        cls = "t-area";
                        // a fully cleared area dims back down
                        const as = TI.state.areas[this.LETTERS[ch]];
                        if (as && as.boss) cls = "t-cabin";
                    }
                    else if (ch === "~") cls = "t-cabin";
                    else if (ch === "≈") { cls = "t-water"; if (this._wave) ch = "~"; }
                    else if (ch === "t") cls = "t-tree";
                    else if (ch === "^") cls = "t-hill";
                    else if (ch === ",") cls = "t-reed";
                    else cls = "t-land";
                }
                out += `<span class="${cls}">${TI.esc(ch)}</span>`;
            }
            out += "\n";
        }
        TI.setMap(out);
    },

    move(dx, dy) {
        const s = TI.state.ow;
        const nx = s.x + dx, ny = s.y + dy;
        const t = this.tile(nx, ny);
        if (t === null) { return; }
        if (t === "≈") {
            TI.sound.play("deny");
            TI.log("the water is cold and dark and does not want you. not that way.", "dim");
            return;
        }
        s.x = nx; s.y = ny;
        TI.sound.play("step");
        this.discover();
        this.render();
        TI.save();
        this.checkTile();
    },

    checkTile() {
        const s = TI.state.ow;
        const t = this.tile(s.x, s.y);
        if (t === "~") {
            TI.menuOpen([
                { label: "enter the cabin", fn: () => TI.cabin.enter() },
                { label: "keep walking", fn: () => {} },
            ], { onCancel: () => {} });
            return;
        }
        const areaId = this.LETTERS[t];
        if (areaId) {
            const def = TI.AREAS[areaId];
            const as = TI.state.areas[areaId];
            const done = as && as.boss;
            TI.menuOpen([
                { label: "enter " + def.shortName + (done ? " (quiet now)" : ""), fn: () => TI.area.enter(areaId) },
                { label: "not now", fn: () => {} },
            ], { onCancel: () => {} });
        }
    },
};
