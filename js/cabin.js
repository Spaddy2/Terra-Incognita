/* the cabin — cot, workbench, machine shelf, journals, chest, and the end of the loop */
window.TI = window.TI || {};

TI.cabin = {

    ART: [
        "  ______________________________",
        " /                              \\",
        "/________________________________\\",
        "|  ___                    ____   |",
        "| |cot|   .--------.     |shlf|  |",
        "| |___|   | window |     |____|  |",
        "|         '--------'             |",
        "|  ____                    __    |",
        "| |wrkb|      table       |ch|   |",
        "| |____|       [ ]        |__|   |",
        "|________________  _______      _|",
        "                 ||       door   ",
    ],

    /* the machine shelf, piece by piece.  slots by piece id. */
    SLOT_TOKEN: {
        swamp: "[≡]", castle: "(¤)", forest: "/◊\\",
        cliff: "{S}", ruins: "[:]", cave: "[#]",
    },
    shelfArt() {
        const inst = TI.state.installed;
        const tok = id => inst.includes(id) ? this.SLOT_TOKEN[id] : "[ ]";
        const hum = inst.length >= 6;
        return [
            hum ? "        ~ ~ ~ ~ ~ ~ ~ ~" : "",
            "  .-----------------------.",
            `  |   ${tok("swamp")}    ${tok("castle")}    ${tok("forest")}   |`,
            "  |                       |",
            `  |   ${tok("cliff")}    ${tok("ruins")}    ${tok("cave")}   |`,
            "  '-----------------------'",
            "     ||               ||",
            hum ? "        ~ ~ ~ ~ ~ ~ ~ ~" : "",
        ].filter(l => l !== "").join("\n");
    },

    JOURNALS: [
        { title: "a journal, damp-swollen — 'the swamp'",
          text: ["\"the frog rears up before the big hit. move THEN, not before. it telegraphs everything, it has all the time in the world and it knows it.",
                 "\"the herbs that grow by the black water are bitter but they knit flesh. steep them in anything. i keep meaning to write down the\"" ] },
        { title: "a journal, neat handwriting going ragged — 'the castle'",
          text: ["\"the king is fast when he's laughing and slow when he's crying. wait out the laughing.",
                 "\"he called me elias today. then marcus, then wren. i checked the throne room wall. those names are all carved there, over and over, in my\"" ] },
        { title: "a journal that smells of pine — 'the forest'",
          text: ["\"the wisps can't be hit while they're drifting. bring fire if you can make it. resin burns white and slow.",
                 "\"the stag followed me for two rooms today. it isn't hunting. it's remembering. i think it misses one of the earlier\"" ] },
        { title: "a journal, salt-stained — 'the water'",
          text: ["\"the things at the cliff block high, always high. feint, let them commit, then go low.",
                 "\"i stood at the edge for a long time today. the drop would be quick. i came back and sharpened the sword instead. there was a kitchen once, a yellow table, coffee going cold because we were talking, and her name, her name is\"",
          ], frag: "f8" },
        { title: "the last journal. the ink is barely dry",
          text: ["\"if you are reading this, then i didn't make it to the shelf, and you are me, and it is your turn.",
                 "\"the pieces want to be found in the order the land gives them. the wardens fall if you keep your shield up and your patience long.",
                 "\"one more thing. the chest knows when the machine is half-built. when it opens, do exactly what the note says. check the\"" ] },
    ],

    enter() {
        TI.menuClose();
        TI.view = null;
        TI.mode = "busy";
        TI.setLocation("the cabin");
        TI.setMapTheme("");
        TI.music.setScene("cabin");
        TI.setMap(this.ART.map(l => `<span class="t-art">${TI.esc(l)}</span>`).join("\n"));

        const s = TI.state;
        const opening = [];
        if (!s.cabinVisited) {
            s.cabinVisited = true;
            opening.push(
                { text: "the door is unlocked. of course it is.", cls: "em" },
                { text: "there is a mug on the table. the tea is still warm." },
                { text: "someone left a candle burning. it has burned most of the way down." },
                { text: "gear that isn't yours hangs by the door, sized exactly for you. food you didn't make. a bed with your shape worn into it.", cls: "dim" },
            );
        } else {
            opening.push({ text: "the cabin takes you back without comment.", cls: "dim" });
        }
        const carried = TI.PIECE_ORDER.filter(id => s.pieces[id] && !s.installed.includes(id));
        if (carried.length) opening.push({ text: "the piece you're carrying feels heavier in here. the shelf is waiting.", cls: "em" });

        TI.playLines(opening, () => {
            if (!s.frags.includes("f2")) {
                TI.memory.show("f2", () => this.menu());
            } else this.menu();
        }, 1600);
        TI.save();
    },

    menu() {
        const s = TI.state;
        const carried = TI.PIECE_ORDER.filter(id => s.pieces[id] && !s.installed.includes(id));
        const chestLabel = s.chestOpened ? "the chest, open and empty"
            : (s.installed.length >= 3 ? "the chest — the lock has sprung" : "the locked chest");
        TI.setLocation("the cabin");
        TI.setMapTheme("");
        TI.music.setScene("cabin");
        TI.setMap(this.ART.map(l => `<span class="t-art">${TI.esc(l)}</span>`).join("\n"));
        TI.menuOpen([
            { label: "rest on the cot", fn: () => this.rest() },
            { label: "the workbench", fn: () => this.workbench() },
            { label: "the machine shelf" + (carried.length ? " ✶" : ""), fn: () => this.shelf() },
            { label: "the journals", fn: () => this.journals() },
            { label: chestLabel, fn: () => this.chest() },
            { label: "sit and remember", fn: () => TI.memory.openJournalOfFragments(() => this.menu()) },
            { label: "step outside", fn: () => this.leave() },
        ], { title: "the cabin. it was here before you. it will be here after." });
    },

    rest() {
        const s = TI.state;
        s.hp = s.maxHp;
        TI.sound.play("heal");
        TI.log("you sleep without meaning to. no dreams — or none you're allowed to keep. you wake whole.", "heal");
        TI.updateSidebar();
        TI.save();
        this.menu();
    },

    workbench() {
        TI.log("the workbench is scarred with use. the scars are organised. someone kept improving their system.", "dim");
        TI.inventory.craftMenu(() => this.menu());
    },

    journals() {
        const s = TI.state;
        const items = this.JOURNALS.map((j, i) => ({
            label: (s.journals.includes(i) ? "· " : "") + j.title,
            fn: () => this.readJournal(i),
        }));
        items.push({ label: "put them down", fn: () => this.menu() });
        TI.log("a stack of journals. different inks, different years, one handwriting. every single one stops mid-sentence.", "dim");
        TI.menuOpen(items, { title: "the journals", onCancel: () => this.menu() });
    },

    readJournal(i) {
        const s = TI.state;
        const j = this.JOURNALS[i];
        if (!s.journals.includes(i)) s.journals.push(i);
        TI.save();
        const lines = j.text.map(t => ({ text: t, cls: "say" }));
        lines.push({ text: "the entry stops there. mid-sentence. they all stop mid-sentence.", cls: "dim" });
        TI.playLines(lines, () => {
            if (j.frag && !s.frags.includes(j.frag)) {
                TI.memory.show(j.frag, () => this.journals());
            } else this.journals();
        }, 2400);
    },

    chest() {
        const s = TI.state;
        if (s.chestOpened) {
            TI.log("the chest is open and empty. the note is gone. you know it by heart anyway.", "dim");
            return this.menu();
        }
        if (s.installed.length < 3) {
            TI.sound.play("deny");
            TI.log("an iron-banded chest. the lock is old but confident. it isn't waiting for a key — it's waiting for something else.", "dim");
            return this.menu();
        }
        s.chestOpened = true;
        TI.save();
        TI.sound.play("item");
        TI.playLines([
            { text: "the lock has sprung itself. the chest opens on oiled hinges.", cls: "em" },
            { text: "inside: no gold. no gear. a single folded note, in your handwriting:" },
            { text: "“check the cave last. — you”", cls: "frag" },
        ], () => this.menu(), 2000);
    },

    /* ---------------- the machine shelf ---------------- */
    shelf() {
        const s = TI.state;
        TI.setMap(`<span class="t-art">${TI.esc(this.shelfArt())}</span>`);
        const carried = TI.PIECE_ORDER.filter(id => s.pieces[id] && !s.installed.includes(id));
        if (!carried.length) {
            const n = s.installed.length;
            if (n === 0) TI.log("a bare wooden shelf, mounted at working height. six empty brackets, machined and ready. ready for what, it doesn't say.", "dim");
            else if (n < 6) TI.log("the machine sits half-made on the shelf, patient. " + (6 - n) + " bracket" + (6 - n > 1 ? "s" : "") + " still empty.", "dim");
            return this.menu();
        }
        TI.mode = "busy";
        const installNext = () => {
            const id = carried.shift();
            s.installed.push(id);
            TI.sound.play("piece");
            TI.setMap(`<span class="t-art">${TI.esc(this.shelfArt())}</span>`);
            TI.updateSidebar();
            TI.save();
            TI.playLines([{ text: TI.PIECES[id].install, cls: "em" }], () => {
                const n = s.installed.length;
                if (n === 3 && !s.chestOpened) {
                    TI.playLines([{ text: "behind you, softly, the chest unlocks itself.", cls: "frag" }], () => proceed(), 1800);
                } else if (n === 5) {
                    TI.memory.show("f9", () => proceed());
                } else proceed();
            }, 1900);
        };
        const proceed = () => {
            if (carried.length) return installNext();
            if (s.installed.length >= 6) return this.finalSequence();
            this.menu();
        };
        installNext();
    },

    /* ---------------- the final sequence ---------------- */
    finalSequence() {
        const s = TI.state;
        s.machineOn = true;
        TI.save();
        TI.mode = "busy";
        TI.music.setScene("final");
        TI.sound.play("machine");
        TI.playLines([
            { text: "the last piece settles. for one long second, nothing.", cls: "em" },
            { text: "then the hum. low, certain, in a key you know from somewhere you can't name." },
            { text: "the gear turns. the prism drinks the candlelight and pays it back wrong." },
            { text: "the air above the shelf folds. unfolds. folds again —" },
            { text: "— and a seam of light opens, like a slow eye, and holds.", cls: "em" },
            { text: "the cabin fills with the smell of ozone and old rain." },
            { text: "a figure steps through.", cls: "em" },
            { text: "it is you. identical. down to the scar. down to the way you are standing right now." },
            { text: "they look at the shelf. they look at you. something like relief crosses their face —" },
            { text: "— and they reach for their weapon. tired. practiced. certain.", cls: "dmg" },
            { text: "they are not here to talk. they have done this forty-one times.", cls: "frag" },
        ], () => {
            TI.combat.start("you", {
                areaName: "the cabin",
                onWin: () => this.aftermath(),
            });
        }, 2100);
    },

    aftermath() {
        TI.playLines([
            { text: "they fall the way you would fall.", cls: "em" },
            { text: "you stand over yourself, breathing hard, and wait for the guilt. it doesn't come. only quiet." },
            { text: "the machine's hum changes pitch — settles — resolves. the loop had a shape, and the shape is broken." },
        ], () => {
            TI.memory.show("f10", () => this.portal());
        }, 2300);
    },

    portal() {
        TI.sound.play("portal");
        TI.playLines([
            { text: "the seam of light is still open. it is wider now, and steadier, and it is not a door to here.", cls: "em" },
            { text: "through it: somewhere mundane. somewhere familiar. a hallway, maybe. a kitchen. home, if that word still points anywhere." },
            { text: "the portal holds. it will hold for as long as you need it to. somehow you know that.", cls: "dim" },
        ], () => {
            TI.menuOpen([
                { label: "step through", fn: () => this.endingThrough() },
                { label: "not yet", fn: () => this.endingStay() },
            ]);
        }, 2300);
    },

    endingThrough() {
        TI.state.ending = "through";
        TI.mode = "busy";
        TI.playLines([
            { text: "you step through.", cls: "em" },
            { text: "a brief flash of somewhere mundane and familiar." },
        ], () => {
            TI.fade("white", () => TI.showEndTitle(), true);
        }, 2600);
    },

    endingStay() {
        TI.state.ending = "stay";
        TI.mode = "busy";
        TI.playLines([
            { text: "you look at the portal for a long time. then you look at the cabin.", cls: "dim" },
            { text: "you sit down. the journals are still there. you pick up a pen.", cls: "em" },
        ], () => {
            TI.fade("black", () => TI.showEndTitle(), true);
        }, 2800);
    },

    leave() {
        TI.log("you step outside. the light is still wrong. you're getting used to that, which is its own worry.", "dim");
        TI.overworld.show();
    },
};
