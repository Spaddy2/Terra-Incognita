/* inventory — 6 carry slots, equipping, item use, and workbench crafting */
window.TI = window.TI || {};

TI.inventory = {

    full() { return TI.state.inv.length >= TI.INV_SLOTS; },

    /* try to add an item; returns true if it fit */
    add(id) {
        if (this.full()) return false;
        TI.state.inv.push(id);
        TI.updateSidebar();
        TI.save();
        return true;
    },

    remove(id) {
        const i = TI.state.inv.indexOf(id);
        if (i >= 0) TI.state.inv.splice(i, 1);
        TI.updateSidebar();
    },

    heal(amount) {
        const s = TI.state;
        const before = s.hp;
        s.hp = amount === "full" ? s.maxHp : Math.min(s.maxHp, s.hp + amount);
        TI.updateSidebar();
        return s.hp - before;
    },

    /* the pack menu — usable anywhere outside combat */
    openMenu(back) {
        back = back || (() => TI.menuClose());
        const s = TI.state;
        const items = [];
        s.inv.forEach(id => {
            const it = TI.ITEMS[id];
            items.push({
                label: it.name,
                fn: () => TI.inventory.itemMenu(id, () => TI.inventory.openMenu(back)),
            });
        });
        if (!items.length) items.push({ label: "your pack is empty", disabled: true });
        items.push({ label: "close", fn: back });
        TI.menuOpen(items, { title: "your pack", onCancel: back });
    },

    itemMenu(id, back) {
        const it = TI.ITEMS[id];
        TI.log(it.desc, "dim");
        const items = [];
        if (it.type === "weapon" || it.type === "armor") {
            items.push({ label: "equip", fn: () => { TI.inventory.equip(id); back(); } });
        }
        if (it.type === "consumable" && it.heal) {
            items.push({ label: "use", fn: () => { TI.inventory.consume(id); back(); } });
        }
        items.push({ label: "drop", fn: () => {
            TI.inventory.remove(id);
            TI.log("you leave the " + it.name + " behind.", "dim");
            TI.save();
            back();
        }});
        items.push({ label: "back", fn: back });
        TI.menuOpen(items, { title: it.name, onCancel: back });
    },

    equip(id) {
        const it = TI.ITEMS[id];
        const s = TI.state;
        const slot = it.type === "weapon" ? "weapon" : "armor";
        const old = s[slot];
        this.remove(id);
        s[slot] = id;
        s.inv.push(old);   // guaranteed room: we just removed one
        TI.sound.play("item");
        TI.log("you take up the " + it.name + ".", "em");
        TI.updateSidebar();
        TI.save();
    },

    consume(id) {
        const it = TI.ITEMS[id];
        this.remove(id);
        if (it.heal) {
            const got = this.heal(it.heal);
            TI.sound.play("heal");
            TI.log("you use the " + it.name + ". " + (got > 0 ? "+" + got + " hp." : "you feel no different."), "heal");
        }
        TI.save();
    },

    /* ---------------- workbench crafting ---------------- */
    findRecipe(a, b) {
        return TI.RECIPES.find(r => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a));
    },

    craftMenu(back) {
        const s = TI.state;
        // everything you could put on the bench: pack + currently equipped
        const pool = () => s.inv.concat([s.weapon, s.armor]);
        const pickFirst = () => {
            const items = pool().map(id => ({
                label: TI.ITEMS[id].name,
                fn: () => pickSecond(id),
            }));
            items.push({ label: "step away", fn: back });
            TI.menuOpen(items, { title: "the workbench. combine two things.", onCancel: back });
        };
        const pickSecond = (first) => {
            const rest = pool().slice();
            rest.splice(rest.indexOf(first), 1);
            const items = rest.map(id => ({
                label: TI.ITEMS[id].name,
                fn: () => attempt(first, id),
            }));
            items.push({ label: "put it back", fn: pickFirst });
            TI.menuOpen(items, { title: TI.ITEMS[first].name + "  +  ?", onCancel: pickFirst });
        };
        const attempt = (a, b) => {
            const r = this.findRecipe(a, b);
            if (!r) {
                TI.log("nothing happens.", "dim");
                TI.sound.play("deny");
                pickFirst();
                return;
            }
            // consume the two parts from wherever they live (pack or hands)
            const take = (id) => {
                if (s.inv.includes(id)) this.remove(id);
                else if (s.weapon === id) s.weapon = null;
                else if (s.armor === id) s.armor = null;
            };
            take(a); take(b);
            const result = r[2];
            TI.sound.play("craft");
            TI.log(r[3], "em");
            // a crafted weapon fills an empty hand; otherwise it goes in the pack
            // (the pack always has room here — at least one ingredient came out of it)
            if (TI.ITEMS[result].type === "weapon" && !s.weapon) {
                s.weapon = result;
                TI.log("you take it up. it feels right, which is its own kind of wrong.", "dim");
            } else {
                this.add(result);
            }
            if (!s.weapon) s.weapon = "fists";
            if (!s.armor) s.armor = "boots";
            TI.updateSidebar();
            TI.save();
            pickFirst();
        };
        pickFirst();
    },
};
