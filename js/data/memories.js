/* memory fragments — notes left by previous versions of you, or echoes of a real
   life before all this. the player should never be sure which is which. */
window.TI = window.TI || {};

TI.MEMORIES = {
    /* the ten key fragments, in rough order */
    f1:  "you've done this before. the frog dies the same way every time.",
    f3:  "the king knew your name. all of them. you didn't stop to ask how.",
    f4:  "the forest was the same the last time. and the time before.",
    f5:  "you stood at this cliff before. you didn't jump. you went back to work.",
    f6:  "the archivist said there have been forty-one of you. you are the first to read this far.",
    f7:  "it moved like you. fought like you. fell like you. you don't think about why.",
    f8:  "her name is—",
    f9:  "you built the machine because you wanted to leave. you don't remember what you were leaving.",
    f10: "this is the first time.",

    /* environmental fragments, one per area */
    m_swamp:  "the mud remembers your boots. the prints are already there, filled with water.",
    m_castle: "a banquet table set for one. the chair is already pulled out. you know which seat.",
    m_forest: "someone carved a tally into this trunk. the knife strokes match your hand. you stop counting at thirty.",
    m_cliff:  "salt on the wind. you taste it and think of a kitchen you can't place, and someone laughing in it.",
    m_ruins:  "your name is carved in the doorway. beneath it, your name. beneath that, your name.",
    m_cave:   "your footsteps echo twice down here. the second set is half a beat behind. it has always been half a beat behind.",
};

/* which fragment plays after each area's boss */
TI.BOSS_FRAGMENT = {
    swamp: "f1", castle: "f3", forest: "f4",
    cliff: "f5", ruins: "f6", cave: "f7",
};

TI.MEMORY_ORDER = [
    "f1", "m_swamp", "f3", "m_castle", "f4", "m_forest",
    "f5", "m_cliff", "f6", "m_ruins", "f7", "m_cave", "f8", "f9", "f10",
];
