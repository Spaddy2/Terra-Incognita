/* memory fragments — display, tracking, and re-reading */
window.TI = window.TI || {};

TI.memory = {
    _after: null,
    _prevMode: "free",

    /* show a fragment overlay. cb runs after the player dismisses it. */
    show(id, cb) {
        const text = TI.MEMORIES[id];
        if (!text) { if (cb) cb(); return; }
        const isNew = !TI.state.frags.includes(id);
        if (isNew) { TI.state.frags.push(id); TI.save(); }

        this._after = cb || null;
        this._prevMode = TI.mode;
        TI.mode = "overlay";
        TI.sound.play("frag");

        const ov = document.getElementById("fragment-overlay");
        const tx = document.getElementById("fragment-text");
        const hint = document.getElementById("fragment-hint");
        tx.textContent = "“" + text + "”";
        tx.classList.remove("show");
        hint.classList.remove("show");
        ov.classList.remove("hidden");
        // slow fade in
        requestAnimationFrame(() => requestAnimationFrame(() => tx.classList.add("show")));
        this._hintTimer = setTimeout(() => hint.classList.add("show"), 2600);
        this._minTime = Date.now() + 900;   // can't be dismissed instantly by accident
        TI.updateSidebar();
    },

    dismiss() {
        if (Date.now() < this._minTime) return;
        clearTimeout(this._hintTimer);
        document.getElementById("fragment-overlay").classList.add("hidden");
        TI.mode = this._prevMode === "overlay" ? "free" : this._prevMode;
        const cb = this._after;
        this._after = null;
        if (cb) cb();
    },

    /* cabin: sit and remember — re-read recovered fragments */
    openJournalOfFragments(back) {
        const seen = TI.MEMORY_ORDER.filter(id => TI.state.frags.includes(id));
        if (!seen.length) {
            TI.log("you sit very still and try to remember. nothing comes. not yet.", "dim");
            back();
            return;
        }
        TI.log("you sit down and let them come back to you, one at a time.", "dim");
        const items = seen.map(id => ({
            label: TI.MEMORIES[id].slice(0, 34) + (TI.MEMORIES[id].length > 34 ? "…" : ""),
            fn: () => TI.memory.show(id, () => TI.memory.openJournalOfFragments(back)),
        }));
        items.push({ label: "enough", fn: back });
        TI.menuOpen(items, { title: "what you have recovered — " + seen.length + " of " + TI.MEMORY_ORDER.length });
    },
};
