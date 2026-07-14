/* the area engine — sub-maps, rooms, encounters, bosses, pieces */
window.TI = window.TI || {};

TI.AREAS = {};
TI.registerArea = function (def) {
    def.map.forEach((row, i) => {
        if (row.length !== def.map[0].length)
            console.warn("area " + def.id + " row " + i + " has width " + row.length);
    });
    TI.AREAS[def.id] = def;
};

TI.area = {
    cur: null,      // area def
    grid: null,     // [y][x] base chars
    px: 0, py: 0,
    prevX: 0, prevY: 0,

    enter(id) {
        const def = TI.AREAS[id];
        this.cur = def;
        this.grid = def.map.map(r => r.split(""));
        for (let y = 0; y < this.grid.length; y++)
            for (let x = 0; x < this.grid[y].length; x++)
                if (this.grid[y][x] === "E") { this.px = x; this.py = y; }
        this.prevX = this.px; this.prevY = this.py;
        TI.view = this;
        TI.mode = "free";
        TI.setLocation(def.name);
        TI.log(def.enterText, "em");
        const as = TI.areaState(id);
        if (!as.regionsSeen) as.regionsSeen = [];
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

    render() {
        const as = this.state();
        let out = "";
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[0].length; x++) {
                let ch = this.grid[y][x], cls = "t-land";
                if (x === this.px && y === this.py) { ch = "@"; cls = "t-you"; }
                else switch (ch) {
                    case "#": ch = "▓"; cls = "t-wall"; break;
                    case "E": ch = "<"; cls = "t-exit"; break;
                    case "+": ch = "."; break;
                    case "m": ch = "."; break;
                    case "1": if (as.e1) { ch = "."; } else { ch = "x"; cls = "t-foe"; } break;
                    case "2": if (as.e2) { ch = "."; } else { ch = "x"; cls = "t-foe"; } break;
                    case "D":
                        if (as.boss) { ch = "."; }
                        else if (this.bossUnlocked()) { ch = "/"; cls = "t-door"; }
                        else { ch = "D"; cls = "t-door"; }
                        break;
                    case "B": if (as.boss) { ch = "."; } else { ch = "X"; cls = "t-foe"; } break;
                    case "i": if (as.item) { ch = "."; } else { ch = "?"; cls = "t-item"; } break;
                }
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
        // ambience
        if (this.cur.ambience && !this.state().boss && TI.chance(0.12)) {
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

        if (t === "i" && !as.item) {
            TI.log(this.cur.itemLine, "em");
            if (TI.inventory.add(this.cur.itemId)) {
                as.item = true;
                TI.sound.play("item");
                TI.log("(" + TI.ITEMS[this.cur.itemId].name + " added to your pack.)", "heal");
                TI.save();
                this.render();
            } else {
                this.swapPickup();
            }
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

    /* pack is full at a pickup: offer to leave something behind */
    swapPickup() {
        const as = this.state();
        const newItem = TI.ITEMS[this.cur.itemId];
        TI.log("your pack is full. leave something behind for the " + newItem.name + "?", "dim");
        const items = TI.state.inv.map(id => ({
            label: "drop " + TI.ITEMS[id].name,
            fn: () => {
                TI.inventory.remove(id);
                TI.log("you set the " + TI.ITEMS[id].name + " down. someone will find it. probably you.", "dim");
                TI.inventory.add(this.cur.itemId);
                as.item = true;
                TI.sound.play("item");
                TI.log("(" + newItem.name + " added to your pack.)", "heal");
                TI.save();
                this.render();
            },
        }));
        items.push({ label: "leave it for now", fn: () => {} });
        TI.menuOpen(items, { title: "your pack — " + TI.state.inv.length + "/" + TI.INV_SLOTS, onCancel: () => {} });
    },

    fight(slot, creatureId) {
        const stepBack = () => {
            this.px = this.prevX; this.py = this.prevY;
            TI.view = this;
            TI.mode = "free";
            TI.setLocation(this.cur.name);
            this.render();
        };
        TI.combat.start(creatureId, {
            areaName: this.cur.name,
            onWin: () => {
                const as = this.state();
                as[slot] = true;
                TI.save();
                TI.view = this;
                TI.mode = "free";
                TI.setLocation(this.cur.name);
                this.render();
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
                TI.save();
                TI.sound.play("piece");
                TI.playLines([
                    { text: TI.PIECES[this.cur.id].found, cls: "em" },
                    { text: "(machine piece recovered. it does not go in your pack. it goes with you.)", cls: "heal" },
                ], () => {
                    TI.memory.show(TI.BOSS_FRAGMENT[this.cur.id], () => {
                        TI.view = this;
                        TI.mode = "free";
                        TI.setLocation(this.cur.name);
                        TI.updateSidebar();
                        this.render();
                    });
                }, 2100);
            },
            onFlee: () => {},   // bosses never allow flight
        });
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
