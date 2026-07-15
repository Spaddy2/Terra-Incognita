/* turn-based combat. text menu driven. hp as ascii bars. */
window.TI = window.TI || {};

TI.combat = {
    active: null,

    /*  opts: { onWin, onFlee, areaName, final }  */
    start(creatureId, opts) {
        const def = TI.CREATURES[creatureId];
        this.active = {
            id: creatureId,
            def,
            hp: def.hp,
            opts: opts || {},
            playerDodging: false,
            opening: 0,          // bonus damage after a successful dodge
            truestrike: 0,       // torch: attacks that cannot miss
            windup: false,       // slow enemies telegraph
            lastPlayerAction: "attack",
            enemyBlocking: false,
            turn: 0,
            saidLines: [],
            secondWind: !!def.final,   // the final fight cannot simply end you
        };
        TI.mode = "busy";
        TI.setLocation(this.active.opts.areaName || "");
        TI.music.setScene(def.final ? "final" : "combat");
        this.renderStage();
        TI.sound.play(def.boss ? "boss" : "hit");
        const introLines = def.intro ? def.intro.split("\n").map(t => ({ text: t, cls: "em" })) : [];
        TI.playLines(introLines, () => this.playerTurn(), 1500);
    },

    /* ---------------- rendering ---------------- */
    renderStage() {
        const c = this.active;
        const art = c.def.art.map(l => `<span class="t-art">${TI.esc(l)}</span>`).join("\n");
        const foeBar = `<span class="t-hpfoe">${TI.bar(c.hp, c.def.hp, 16)}</span>`;
        const meBar = `<span class="t-hpme">${TI.bar(TI.state.hp, TI.state.maxHp, 16)}</span>`;
        TI.setMap(
            art + "\n\n" +
            `<span class="t-foe">${TI.esc(c.def.name)}</span>\n${foeBar} ${Math.max(0, c.hp)}/${c.def.hp}\n\n` +
            `<span class="t-you">you</span>\n${meBar} ${Math.max(0, TI.state.hp)}/${TI.state.maxHp}`
        );
        TI.updateSidebar();
    },

    /* ---------------- player turn ---------------- */
    playerTurn() {
        const c = this.active;
        if (!c) return;
        c.turn++;
        this.renderStage();

        // occasional boss flavour
        if (c.def.midLines && c.turn > 1 && TI.chance(0.35)) {
            const unsaid = c.def.midLines.filter(l => !c.saidLines.includes(l));
            if (unsaid.length) {
                const line = unsaid[TI.rint(0, unsaid.length - 1)];
                c.saidLines.push(line);
                TI.log(line, "say");
            }
        }

        if (c.def.final) {
            TI.menuOpen([
                { label: "fight",   fn: () => this.doAttack() },
                { label: "ask why", fn: () => this.doAskWhy() },
                { label: "stop",    fn: () => this.doStop() },
            ], { keepMode: true });
        } else {
            TI.menuOpen([
                { label: "attack",   fn: () => this.doAttack() },
                { label: "dodge",    fn: () => this.doDodge() },
                { label: "use item", fn: () => this.doItemMenu() },
                { label: "flee",     fn: () => this.doFlee() },
            ], { keepMode: true });
        }
        TI.mode = "menu";
    },

    doAttack() {
        const c = this.active;
        TI.mode = "busy";
        c.lastPlayerAction = "attack";
        const w = TI.ITEMS[TI.state.weapon];
        const [n, s, m] = w.dice;

        // does it connect?
        let evade = c.def.evade || 0;
        if (c.truestrike > 0) { evade = 0; c.truestrike--; }
        if (TI.chance(evade)) {
            TI.sound.play("miss");
            TI.log("you swing the " + w.name + " — it passes through where " + this.shortName() + " isn't.", "dim");
            return this.enemyTurn();
        }

        const extra = n > 1 ? TI.roll(n - 1, s, 0) : 0;
        const die = TI.rint(1, s);                 // a max roll on the die is a perfect strike
        const crit = die === s;
        let dmg = extra + die + m + c.opening;
        c.opening = 0;
        if (crit) dmg = Math.round(dmg * 1.5);
        if (c.enemyBlocking) {
            dmg = Math.max(1, Math.floor(dmg / 2));
            c.enemyBlocking = false;
            TI.log("it blocks. your " + w.name + " glances off — " + dmg + " damage.", "dmg");
        } else if (crit) {
            TI.log("a perfect strike — the " + w.name + " lands exactly where you meant it. " + dmg + " damage.", "em");
        } else {
            TI.log("you strike with the " + w.name + " — " + dmg + " damage.", "em");
        }
        TI.sound.play("hit");
        TI.flashMap();
        c.hp -= dmg;
        this.renderStage();
        if (c.hp <= 0) return this.win();
        this.checkPhase();
        this.enemyTurn();
    },

    /* wounded bosses change */
    checkPhase() {
        const c = this.active;
        if (!c || !c.def.phase2 || c.phaseTwo) return;
        if (c.hp > c.def.hp / 2) return;
        c.phaseTwo = true;
        c.behaviorOverride = c.def.phase2.behavior || null;
        c.dmgBonus = c.def.phase2.dmgBonus || 0;
        c.windup = false;
        TI.log(c.def.phase2.line, "say");
    },

    doDodge() {
        const c = this.active;
        TI.mode = "busy";
        c.lastPlayerAction = "dodge";
        c.playerDodging = true;
        TI.log("you watch its weight, ready to move.", "dim");
        this.enemyTurn();
    },

    doItemMenu() {
        const c = this.active;
        const usable = TI.state.inv.filter(id => {
            const it = TI.ITEMS[id];
            return it.type === "consumable";
        });
        if (!usable.length) {
            TI.log("nothing in your pack will help here.", "dim");
            return this.playerTurn();
        }
        const items = usable.map(id => ({
            label: TI.ITEMS[id].name,
            fn: () => this.doUseItem(id),
        }));
        items.push({ label: "back", fn: () => this.playerTurn() });
        TI.menuOpen(items, { title: "your pack", keepMode: true, onCancel: () => this.playerTurn() });
        TI.mode = "menu";
    },

    doUseItem(id) {
        const c = this.active;
        TI.mode = "busy";
        c.lastPlayerAction = "item";
        const it = TI.ITEMS[id];
        TI.inventory.remove(id);
        if (it.effect === "truestrike") {
            c.truestrike = 2;
            TI.log("you light the torch. the white flame does not flicker. nothing can hide from you now.", "em");
            TI.sound.play("item");
        } else if (it.heal) {
            const got = TI.inventory.heal(it.heal);
            TI.sound.play("heal");
            TI.log("you use the " + it.name + " — +" + got + " hp.", "heal");
        }
        TI.save();
        this.renderStage();
        this.enemyTurn();
    },

    doFlee() {
        const c = this.active;
        TI.mode = "busy";
        c.lastPlayerAction = "flee";
        if (c.def.boss) {
            TI.log("you turn to run. the way back isn't there any more. it never is, with this one.", "dim");
            return this.enemyTurn();
        }
        if (TI.chance(0.6)) {
            TI.log("you back away, and it lets you.", "dim");
            const onFlee = c.opts.onFlee;
            this.active = null;
            if (onFlee) onFlee();
            return;
        }
        TI.log("you try to break away — it cuts you off.", "dmg");
        this.enemyTurn();
    },

    /* -------- final-fight special options: they are not here to talk -------- */
    doAskWhy() {
        const c = this.active;
        TI.mode = "busy";
        c.lastPlayerAction = "attack";
        const lines = [
            "\"why?\" your voice sounds strange from the outside.",
            "they don't answer. they look at you like you've already had this conversation.",
            "maybe you have. forty-one times.",
        ];
        c._whyCount = (c._whyCount || 0) + 1;
        TI.log(lines[Math.min(c._whyCount - 1, lines.length - 1)], "say");
        this.enemyTurn();
    },

    doStop() {
        const c = this.active;
        TI.mode = "busy";
        c.lastPlayerAction = "attack";
        const lines = [
            "\"stop.\" you lower your weapon, half an inch.",
            "they do not stop. they have never stopped. that's how they got here.",
            "you understand, then, that one of you is leaving this room, and you get to choose which.",
        ];
        c._stopCount = (c._stopCount || 0) + 1;
        TI.log(lines[Math.min(c._stopCount - 1, lines.length - 1)], "say");
        this.enemyTurn();
    },

    /* ---------------- enemy turn ---------------- */
    enemyTurn() {
        const c = this.active;
        if (!c) return;
        setTimeout(() => {
            if (!this.active) return;
            const b = c.behaviorOverride || c.def.behavior;

            if (b === "slow") {
                if (!c.windup) {
                    c.windup = true;
                    TI.log(this.shortName() + " draws itself up. something heavy is coming.", "dim");
                    return this.endEnemyTurn();
                }
                c.windup = false;
                if (this.enemyHit(1.4, " comes down on you like weather —")) this.endEnemyTurn();
                return;
            }
            if (b === "fast") {
                if (!this.enemyHit(1, " darts in —")) return;
                if (TI.chance(0.25)) {
                    TI.log("— and again, faster than thought —", "dim");
                    if (!this.enemyHit(0.6, " strikes twice —")) return;
                }
                return this.endEnemyTurn();
            }
            if (b === "erratic") {
                const r = Math.random();
                if (r < 0.2) {
                    TI.log(this.shortName() + " drifts, muttering to itself. nothing happens.", "dim");
                    return this.endEnemyTurn();
                }
                if (r < 0.4) {
                    if (this.enemyHit(1.5, " lunges, wild and sudden —")) this.endEnemyTurn();
                    return;
                }
                if (this.enemyHit(1, " strikes —")) this.endEnemyTurn();
                return;
            }
            if (b === "defensive") {
                if (TI.chance(0.35)) c.enemyBlocking = true;
                if (c.lastPlayerAction === "attack" && TI.chance(0.4)) {
                    if (this.enemyHit(0.8, " answers your swing with its own —")) this.endEnemyTurn();
                    return;
                }
                if (TI.chance(0.7)) {
                    if (this.enemyHit(1, " presses forward —")) this.endEnemyTurn();
                    return;
                }
                TI.log(this.shortName() + " holds its ground, watching.", "dim");
                return this.endEnemyTurn();
            }
            if (b === "mirror") {
                if (c.lastPlayerAction === "dodge") {
                    TI.log("it dodges nothing, the way you dodged nothing. you are being studied.", "dim");
                    return this.endEnemyTurn();
                }
                if (c.lastPlayerAction === "item") {
                    TI.log("it mimes drinking from a bottle that isn't there. its wounds do not close.", "dim");
                    return this.endEnemyTurn();
                }
                if (this.enemyHit(1, " moves exactly as you moved —")) this.endEnemyTurn();
                return;
            }
            // aggressive
            if (this.enemyHit(1, " attacks —")) this.endEnemyTurn();
        }, 650);
    },

    /* deals one hit. returns true if combat continues (player alive), false otherwise */
    enemyHit(mult, verb) {
        const c = this.active;
        if (!c) return false;
        // dodge check
        if (c.playerDodging && TI.chance(0.72)) {
            c.playerDodging = false;
            c.opening = 2;
            TI.sound.play("miss");
            TI.log(this.shortName() + verb + " you slip aside. there's an opening.", "heal");
            return true;
        }
        c.playerDodging = false;
        const [lo, hi] = c.def.dmg;
        const dr = TI.ITEMS[TI.state.armor].dr || 0;
        let dmg = Math.max(1, Math.round(TI.rint(lo, hi) * mult) + (c.dmgBonus || 0) - dr);
        TI.state.hp -= dmg;
        TI.sound.play("hurt");
        TI.flash(true);
        TI.log(this.shortName() + verb + " " + dmg + " damage.", "dmg");
        this.renderStage();
        if (TI.state.hp <= 0) { this.playerDown(); return false; }
        return true;
    },

    endEnemyTurn() {
        if (!this.active) return;
        setTimeout(() => { if (this.active) this.playerTurn(); }, 500);
    },

    shortName() {
        const n = this.active.def.name;
        return n;
    },

    /* ---------------- outcomes ---------------- */
    win() {
        const c = this.active;
        this.active = null;
        TI.mode = "busy";
        TI.sound.play(c.def.boss ? "victory" : "hit");
        const lines = [];
        if (c.def.death) c.def.death.split("\n").forEach(t => lines.push({ text: t, cls: "em" }));
        if (c.def.loot && !TI.inventory.full()) {
            TI.state.inv.push(c.def.loot);
            lines.push({ text: c.def.lootLine, cls: "heal" });
        } else if (c.def.loot) {
            lines.push({ text: "there is something worth taking here, but your pack is full.", cls: "dim" });
        }
        TI.updateSidebar();
        TI.save();
        TI.playLines(lines, () => {
            if (c.opts.onWin) c.opts.onWin();
        }, 1500);
    },

    playerDown() {
        const c = this.active;
        this.active = null;
        TI.mode = "busy";

        if (c.secondWind) {
            // the final fight: you do not get to lose it the old way
            TI.sound.play("death");
            TI.playLines([
                { text: "you go down. the floor is cold and familiar.", cls: "dmg" },
                { text: "you have died in this room before. you understand that now.", cls: "frag" },
                { text: "not this time.", cls: "em" },
            ], () => {
                TI.state.hp = Math.floor(TI.state.maxHp / 2);
                c.secondWind = false;
                this.active = c;
                this.renderStage();
                this.playerTurn();
            }, 1700);
            return;
        }

        TI.state.deaths++;
        TI.sound.play("death");
        TI.save();
        TI.playLines([{ text: "everything goes quiet, then dark, then nothing.", cls: "dmg" }], () => {
            TI.fade("black", () => {
                TI.state.hp = Math.floor(TI.state.maxHp / 2);
                TI.state.ow = { ...TI.state.ow, x: 5, y: 3 };
                TI.updateSidebar();
                TI.save();
                TI.clearLog();
                TI.fade(null);
                TI.setLocation("the cabin");
                TI.setMap(TI.cabin.ART.map(l => `<span class="t-art">${TI.esc(l)}</span>`).join("\n"));
                TI.playLines([
                    { text: "you wake on the cot in the cabin. your wounds are dressed. you did not dress them.", cls: "dim" },
                    { text: "you've done this before.", cls: "frag" },
                ], () => TI.cabin.menu(), 1900);
            });
        }, 1400);
    },
};
