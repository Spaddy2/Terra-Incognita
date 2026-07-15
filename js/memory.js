/* memory fragments — delivered inline in the log, never as pop-ups */
window.TI = window.TI || {};

TI.memory = {

    /* log a fragment. cb runs right after (short beat for pacing). */
    show(id, cb) {
        const text = TI.MEMORIES[id];
        if (!text) { if (cb) cb(); return; }
        if (!TI.state.frags.includes(id)) {
            TI.state.frags.push(id);
            TI.save();
        }
        TI.sound.play("frag");
        TI.log("“" + text + "”", "frag");
        TI.updateSidebar();
        if (cb) setTimeout(cb, 400);
    },

    /* kept for compatibility; fragments no longer block anything */
    dismiss() {},

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
