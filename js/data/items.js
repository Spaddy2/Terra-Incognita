/* items, equipment, and crafting recipes */
window.TI = window.TI || {};

// dice: [count, sides, modifier]
TI.ITEMS = {
    // --- weapons ---
    fists:  { name: "bare hands",      type: "weapon", dice: [1, 2, 0],
              desc: "they remember doing this. you try not to wonder where." },
    stick:  { name: "blunt stick",     type: "weapon", dice: [1, 4, 0],
              desc: "it was leaning against the cabin door. someone left it there." },
    knife:  { name: "hunting knife",   type: "weapon", dice: [1, 6, 0],
              desc: "the initials on the handle are yours." },
    rsword: { name: "rusted sword",    type: "weapon", dice: [1, 6, 1],
              desc: "castle steel. it has been waiting a long time." },
    spear:  { name: "crude spear",     type: "weapon", dice: [1, 8, 0],
              desc: "a stick, a shard, and some intent." },
    hsword: { name: "honed sword",     type: "weapon", dice: [1, 8, 2],
              desc: "the rust comes off. the edge underneath is patient." },

    // --- armour ---
    boots:  { name: "worn boots",      type: "armor", dr: 0,
              desc: "they fit perfectly. that bothers you more than it should." },
    shield: { name: "warden's shield", type: "armor", dr: 2,
              desc: "stone-heavy. it remembers holding a line." },

    // --- consumables ---
    meat:    { name: "dried meat",     type: "consumable", heal: 6,
               desc: "you didn't dry this. someone did." },
    ration:  { name: "salted ration",  type: "consumable", heal: 10,
               desc: "sea salt keeps things. that's the idea, anyway." },
    glowcap: { name: "glowcap cluster",type: "consumable", heal: 10,
               desc: "it glows faintly even after picking. eat it anyway." },
    herbs:   { name: "marsh herbs",    type: "consumable", heal: 3, material: true,
               desc: "bitter. useful. better in a tonic." },
    tonic:   { name: "healing tonic",  type: "consumable", heal: "full",
               desc: "you remember the recipe without remembering learning it." },
    torch:   { name: "pitch torch",    type: "consumable", effect: "truestrike",
               desc: "light it in a fight. what hides from you will stop hiding." },

    // --- materials ---
    shard:     { name: "iron shard",   type: "material",
                 desc: "torn off something bigger. sharp on three sides." },
    whet:      { name: "whetstone",    type: "material",
                 desc: "worn in a groove that matches your grip." },
    waterskin: { name: "waterskin",    type: "material",
                 desc: "patched twice. by the same hand." },
    resin:     { name: "pale resin",   type: "material",
                 desc: "it seeps from the dark trees. it burns slow and white." },
    salt:      { name: "sea salt",     type: "material",
                 desc: "scraped from the rocks below the cliff." },
    dust:      { name: "stone dust",   type: "material",
                 desc: "it falls off the wardens when they stop. it hums, faintly." },
};

// crafting: [item a, item b, result, line shown on success]
TI.RECIPES = [
    ["stick",  "shard",     "spear",  "you lash the shard to the stick. it holds. a crude spear."],
    ["rsword", "whet",      "hsword", "you work the stone along the blade until the rust gives up. a honed sword."],
    ["herbs",  "waterskin", "tonic",  "you steep the herbs. the smell is familiar in a way you don't examine. a healing tonic."],
    ["stick",  "resin",     "torch",  "you coat the wood in resin. it will burn slow and white. a pitch torch."],
    ["meat",   "salt",      "ration", "you pack the meat in salt, the way you apparently know how. a salted ration."],
];

// the six machine pieces, in area order
TI.PIECES = {
    swamp:  { short: "copper cylinder", found: "half-buried in the mud behind it: a sealed copper cylinder. perfectly machined. no corrosion. completely out of place.",
              install: "the cylinder seats into the left bracket with a click you feel in your teeth." },
    castle: { short: "brass gear",      found: "in the king's hand: a brass gear, tolerances too fine for this era. you made this.",
              install: "the gear meshes with the cylinder's spindle. it turns half a degree and stops, waiting." },
    forest: { short: "glass prism",     found: "where the stag fell there is a glass prism. it bends the light the wrong way.",
              install: "the prism slots above the gear. the light that comes through it lands somewhere it shouldn't." },
    cliff:  { short: "copper wire",     found: "tangled in the caller's remains: a coil of copper wire, machine-wound, perfectly even.",
              install: "you wind the wire between the mounts. your hands know the pattern. eleven turns. always eleven." },
    ruins:  { short: "circuit board",   found: "the archivist leaves you a small circuit board. ancient but functional. you recognise the design because you designed it.",
              install: "the board clicks into its socket. a single green light wakes up and looks at you." },
    cave:   { short: "power cell",      found: "beneath where the echo stood: a power cell. still warm.",
              install: "the cell is still warm when you push it home. the shelf begins, very quietly, to hum." },
};
TI.PIECE_ORDER = ["swamp", "castle", "forest", "cliff", "ruins", "cave"];
