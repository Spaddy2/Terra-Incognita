/* the area engine — sub-maps, rooms, encounters, bosses, pieces, secrets */
window.TI = window.TI || {};

TI.AREAS = {};
TI.registerArea = function (def) {
    def.map.forEach((row, i) => {
        if ([...row].length !== [...def.map[0]].length)
            console.warn("area " + def.id + " row " + i + " has width " + [...row].length);
    });
    TI.AREAS[def.id] = def;
};

/* decorative terrain: blocks movement, drawn in the area's accent colour */
TI.DECOR = {
    "≈": "deep, black water. not here. find another way around.",
    "T": "the trees grow too close together to pass.",
    "□": "rubble blocks the way — stacked too neatly to be an accident.",
    "*": "a wall of crystal, cold to the touch. your reflection moves a beat behind you.",
};

TI.area = {
    cur: null,
    grid: null,      // [y][x] base chars (unicode-safe)
    px: 0, py: 0,
    prevX: 0, prevY: 0,

    enter(id) {
        TI.menuClose();
        const def = TI.AREAS[id];
        this.cur = def;
        this.grid = def.map.map(r => [...r]);
        for (let y = 0; y < this.grid.length; y++)
            for (let x = 0; x < this.grid[y].length; x++)
                if (this.grid[y][x] === "E") { this.px = x; this.py = y; }
        this.prevX = this.px; this.prevY = this.py;
        TI.view = this;
        TI.mode = "free";
        TI.setLocation(def.name);
        TI.setMapTheme("thm-" + def.id);
        TI.music.setScene(def.id);
        TI.log(def.enterText, "em");
        const as = TI.areaState(id);
        if (!as.regionsSeen) as.regionsSeen = [];
        if (!as.seen) as.seen = [];
        this.render();
        this.checkRegion();
    },

    state() { return TI.areaState(this.cur.id); },

    tile(x, y) {
        if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) return "#";
        return this.grid[y][x];
    },

    bossUnlocked() {
        const as = this.state();
        return as.e1 && as.e2;
    },

    visionRadius() {
        if (!this.cur.vision) return Infinity;
        return TI.state.inv.includes("torch") ? this.cur.vision + 1.6 : this.cur.vision;
    },

    render() {
        const as = this.state();
        const W = this.grid[0].length;
        const r = this.visionRadius(), r2 = r * r;
        let out = "";
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < W; x++) {
                const dx = x - this.px, dy = y - this.py;
                const visible = (dx * dx + dy * dy) <= r2;
                const idx = y * W + x;
                if (visible && !as.seen.includes(idx)) as.seen.push(idx);

                let ch = this.grid[y][x], cls = "t-land";
                if (x === this.px && y === this.py) { ch = "@"; cls = "t-you"; }
                else if (!visible && !as.seen.includes(idx)) { out += "<span> </span>"; continue; }
                else switch (ch) {
                    case "#": ch = "▓"; cls = "t-wall"; break;
                    case "E": ch = "<"; cls = "t-exit"; break;
                    case "+": ch = "."; break;
                    case "m": ch = "."; break;
                    case "≈": case "T": case "□": case "*": cls = "t-decor"; break;
                    case "1": if (as.e1) { ch = "."; } else { ch = "x"; cls = "t-foe"; } break;
                    case "2": if (as.e2) { ch = "."; } else { ch = "x"; cls = "t-foe"; } break;
                    case "D":
                        if (as.boss) { ch = "."; }
                        else if (this.bossUnlocked()) { ch = "/"; cls = "t-door"; }
                        else { ch = "D"; cls = "t-door"; }
                        break;
                    case "B":
                        if (as.boss) { ch = (this.cur.id === "ruins") ? "≣" : "."; if (this.cur.id === "ruins") cls = "t-item"; }
                        else { ch = "X"; cls = "t-foe"; }
                        break;
                    case "i": if (as.item) { ch = "."; } else { ch = "?"; cls = "t-item"; } break;
                    case "s": if (as.secret) { ch = "."; } else { ch = "?"; cls = "t-item"; } break;
                }
                if (!visible) cls += " t-remembered";
                out += `<span class="${cls}">${TI.esc(ch)}</span>`;
            }
            out += "\n";
        }
        TI.setMap(out);
    },

    move(dx, dy) {
        const nx = this.px + dx, ny = this.py + dy;
        const t = this.tile(nx, ny);
        if (t === "#") { return; }
        if (TI.DECOR[t]) {
            TI.log(TI.DECOR[t], "dim");
            return;
        }
        if (t === "D" && !this.bossUnlocked() && !this.state().boss) {
            TI.sound.play("deny");
            TI.log(this.cur.lockedText, "dim");
            return;
        }
        this.prevX = this.px; this.prevY = this.py;
        this.px = nx; this.py = ny;
        TI.sound.play("step");
        this.render();
        this.checkRegion();
        this.checkTile();
    },

    checkRegion() {
        const as = this.state();
        this.cur.regions.forEach((r, i) => {
            if (as.regionsSeen.includes(i)) return;
            if (this.px >= r.x0 && this.px <= r.x1 && this.py >= r.y0 && this.py <= r.y1) {
                as.regionsSeen.push(i);
                TI.log(r.text, "dim");
                TI.save();
            }
        });
        if (this.cur.ambience && !this.state().boss && TI.chance(0.1)) {
            const line = this.cur.ambience[TI.rint(0, this.cur.ambience.length - 1)];
            TI.log(line, "dim");
        }
    },

    checkTile() {
        const t = this.tile(this.px, this.py);
        const as = this.state();

        if (t === "1" && !as.e1) return this.fight("e1", this.cur.creature);
        if (t === "2" && !as.e2) return this.fight("e2", this.cur.creature);
        if (t === "B" && !as.boss) return this.bossFight();
        if (t === "B" && as.boss && this.cur.id === "ruins") return this.readRecords();

        if (t === "i" && !as.item) {
            TI.log(this.cur.itemLine, "em");
            this.pickup(this.cur.itemId, () => { as.item = true; });
            return;
        }
        if (t === "s" && !as.secret) {
            TI.log(this.cur.secretLine, "em");
            this.pickup(this.cur.secretId, () => { as.secret = true; });
            return;
        }

        if (t === "m" && !as.mem) {
            as.mem = true;
            TI.save();
            TI.memory.show(this.cur.memId);
            return;
        }

        if (t === "E") {
            TI.menuOpen([
                { label: "leave " + this.cur.shortName, fn: () => this.exit() },
                { label: "stay", fn: () => {} },
            ], { onCancel: () => {} });
        }
    },

    /* take an item, offering a swap when the pack is full */
    pickup(itemId, mark) {
        const item = TI.ITEMS[itemId];
        if (TI.inventory.add(itemId)) {
            mark();
            TI.sound.play("item");
            TI.log("(" + item.name + " added to your pack.)", "heal");
            TI.save();
            this.render();
            return;
        }
        TI.log("your pack is full. leave something behind for the " + item.name + "?", "dim");
        const items = TI.state.inv.map(id => ({
            label: "drop " + TI.ITEMS[id].name,
            fn: () => {
                TI.inventory.remove(id);
                TI.log("you set the " + TI.ITEMS[id].name + " down. someone will find it. probably you.", "dim");
                TI.inventory.add(itemId);
                mark();
                TI.sound.play("item");
                TI.log("(" + item.name + " added to your pack.)", "heal");
                TI.save();
                this.render();
            },
        }));
        items.push({ label: "leave it for now", fn: () => {} });
        TI.menuOpen(items, { title: "your pack — " + TI.state.inv.length + "/" + TI.INV_SLOTS, onCancel: () => {} });
    },

    /* after the archivist falls, the records remain */
    RECORDS: [
        "loop 4: subject reached the swamp. subject did not reach the far side of the swamp.",
        "loop 9: subject befriended the king. this delayed nothing.",
        "loop 12: subject drowned. the tide caller was gentle about it, for whatever that is worth.",
        "loop 17: subject built the machine, then dismantled it, then sat in the field for eleven days.",
        "loop 22: subject asked the stag what it was. the stag told it. loop 22 ended shortly after.",
        "loop 30: subject simply stopped eating. we did not intervene. we are an archive, not a nurse.",
        "loop 33: subject burned the journals. subject then rewrote them, word for word, from memory.",
        "loop 38: subject made it to the cave. subject met the echo. the echo sends its regards.",
        "loop 41: subject read this record. hello, forty-one. you were the closest, before now.",
    ],
    readRecords() {
        const read = () => {
            const items = this.RECORDS.map((r, i) => ({
                label: "record " + (i + 1),
                fn: () => { TI.log(this.RECORDS[i], "say"); read(); },
            }));
            items.push({ label: "enough", fn: () => {} });
            TI.menuOpen(items, { title: "the records remain. the archive is patient.", onCancel: () => {} });
        };
        read();
    },

    fight(slot, creatureId) {
        const stepBack = () => {
            this.px = this.prevX; this.py = this.prevY;
            this.restore();
        };
        TI.combat.start(creatureId, {
            areaName: this.cur.name,
            onWin: () => {
                const as = this.state();
                as[slot] = true;
                TI.save();
                this.restore();
                if (this.bossUnlocked() && !as.boss) TI.log(this.cur.unlockText, "em");
            },
            onFlee: stepBack,
        });
    },

    bossFight() {
        TI.combat.start(this.cur.boss, {
            areaName: this.cur.name,
            onWin: () => {
                const as = this.state();
                as.boss = true;
                TI.state.pieces[this.cur.id] = true;
                TI.state.maxHp = Math.min(36, TI.state.maxHp + 2);
                TI.state.hp = Math.min(TI.state.maxHp, TI.state.hp + 2);
                TI.save();
                TI.sound.play("piece");
                TI.playLines([
                    { text: TI.PIECES[this.cur.id].found, cls: "em" },
                    { text: "(machine piece recovered. it does not go in your pack. it goes with you.)", cls: "heal" },
                    { text: "(you are more than you were. max hp +2.)", cls: "heal" },
                ], () => {
                    TI.memory.show(TI.BOSS_FRAGMENT[this.cur.id], () => {
                        this.restore();
                        TI.updateSidebar();
                    });
                }, 2100);
            },
            onFlee: () => {},
        });
    },

    /* put the area view back after combat or menus */
    restore() {
        TI.view = this;
        TI.mode = "free";
        TI.setLocation(this.cur.name);
        TI.setMapTheme("thm-" + this.cur.id);
        TI.music.setScene(this.cur.id);
        this.render();
    },

    exit() {
        TI.log("you walk back out, the way you came.", "dim");
        TI.overworld.show();
    },

    escape() {
        TI.menuOpen([
            { label: "walk back out", fn: () => this.exit() },
            { label: "keep exploring", fn: () => {} },
        ], { onCancel: () => {} });
    },
};
