/* creatures and bosses */
window.TI = window.TI || {};

/*
 behaviors:
   aggressive — attacks every turn
   slow       — telegraphs, then hits hard (skip, heavy)
   fast       — attacks every turn, chance of double strike
   erratic    — random: attack / drift (nothing) / lunge (heavy)
   defensive  — chance to block (halve damage taken), counterattacks
   mirror     — repeats the player's previous action
 evade: chance the player's attack misses outright
*/
TI.CREATURES = {

    /* ---- minions ---- */
    boglurker: {
        name: "bog lurker", hp: 10, dmg: [4, 7], behavior: "slow", evade: 0,
        intro: "the mud stands up. it has been waiting, the way mud waits.",
        death: "it folds back into the bog. the surface smooths over like nothing was ever there.",
        loot: "herbs",
        lootLine: "caught in what used to be its throat: a fistful of marsh herbs.",
        art: [
            "      ~~~~~~~",
            "   ~~( o   o )~~",
            "  ~~ (   ___  ) ~~",
            " ~~~ / |    | \\ ~~~",
            "  ~ (__|,,,,|__) ~",
            "     ~~~~~~~~~~",
        ],
    },
    hollowguard: {
        name: "hollow guard", hp: 6, dmg: [2, 4], behavior: "fast", evade: 0,
        intro: "armour with nothing inside it draws a sword with nobody's hand.",
        death: "the armour collapses into a pile. whatever was holding it up has somewhere else to be.",
        loot: "waterskin",
        lootLine: "on its belt: a waterskin, patched twice by the same hand.",
        art: [
            "      _/^\\_",
            "     | o o |",
            "     |_____|",
            "    /|     |\\",
            "   d |  |  | b",
            "     |__|__|",
            "     _|   |_",
        ],
    },
    shadewisp: {
        name: "shade wisp", hp: 8, dmg: [2, 5], behavior: "erratic", evade: 0.35,
        intro: "a piece of the dark detaches from the rest of the dark.",
        death: "it thins out into nothing. the forest is one shadow lighter.",
        loot: "resin",
        lootLine: "where it dissolved, the tree bleeds pale resin.",
        art: [
            "     .  *  .",
            "   *  (   )  *",
            "  .  ( ) ( )  .",
            "    ( (   ) )",
            "   * (  )  ) *",
            "  .   ( ) (   .",
        ],
    },
    tidewraith: {
        name: "tide wraith", hp: 9, dmg: [2, 5], behavior: "defensive", evade: 0,
        intro: "the spray hangs in the air too long. then it turns to look at you.",
        death: "it comes apart into ordinary water and falls, all at once, like a dropped sheet.",
        loot: "salt",
        lootLine: "the rocks where it stood are crusted white. you scrape off a handful of sea salt.",
        art: [
            "    , ~ ~ ~ ,",
            "  ~ (  o o  ) ~",
            " ~ ~)       (~ ~",
            "  ~(  )   (  )~",
            " ~ ~ )  ~  ( ~ ~",
            "   ~ ~ ~ ~ ~ ~",
        ],
    },
    stonewarden: {
        name: "stone warden", hp: 16, dmg: [3, 5], behavior: "slow", evade: 0,
        intro: "one of the fallen statues is not fallen. it grinds upright, shedding centuries.",
        death: "it stops. that's all — it just stops, mid-motion, a statue again. dust hums off it.",
        loot: "dust",
        lootLine: "you gather the humming stone dust before it settles.",
        art: [
            "      _____",
            "     / o o \\",
            "    | _____ |",
            "   /| |   | |\\",
            "  |_| |   | |_|",
            "    _|_|_|_|_",
            "   |_________|",
        ],
    },
    hollowecho: {
        name: "hollow echo", hp: 10, dmg: [3, 6], behavior: "mirror", evade: 0.2,
        intro: "your shadow arrives a half-second after you do. then it keeps arriving.",
        death: "it comes apart. it leaves nothing behind. nothing at all.",
        loot: null,
        lootLine: null,
        art: [
            "      .....",
            "     : . . :",
            "     :     :",
            "    ::     ::",
            "   : :     : :",
            "     :     :",
            "    .:     :.",
        ],
    },

    /* ---- bosses ---- */
    frog: {
        name: "the giant purple frog", hp: 22, dmg: [4, 8], behavior: "slow", evade: 0, boss: true,
        intro: "it is ancient. it is wrong. it has been here far, far too long.\nit looks at you like it recognises you.",
        death: "the frog dies slowly, without surprise. like it has done this before. like you have.",
        midLines: [
            "it watches you between blows. patient. familiar.",
            "its throat swells. the croak sounds almost like a word.",
        ],
        art: [
            "       .--------.",
            "      / (@)  (@) \\",
            "     |   ______   |",
            "     |  \\______/  |",
            "    /|            |\\",
            "   (_|   , ,  ,   |_)",
            "     \\__|_|__|_|__/",
            "      ^^        ^^",
        ],
    },
    king: {
        name: "the crazed king", hp: 24, dmg: [3, 7], behavior: "erratic", evade: 0, boss: true,
        intro: "he was sane once. you can see the ruin of it.\nhe rises from the throne and smiles like an old friend.",
        death: "the king kneels, finally quiet. \"there you are,\" he says, to none of your names, and is gone.",
        midLines: [
            "\"ELIAS!\" he screams. that's not your name. is it?",
            "\"marcus, you came back,\" he says, gently. that's not your name either.",
            "\"i buried the last one of you myself,\" he says, conversationally.",
            "\"jonah. samuel. wren.\" he counts on his fingers. he doesn't run out.",
        ],
        art: [
            "      \\\\|王|//",
            "       .-----.",
            "      / x   x \\",
            "     |    ^    |",
            "      \\ '---' /",
            "     __|     |__",
            "    /  |     |  \\",
            "   |   |_____|   |",
        ],
    },
    stag: {
        name: "the hollow stag", hp: 26, dmg: [4, 7], behavior: "fast", evade: 0.2, boss: true,
        intro: "it steps out from between two trees that are too close together.\nbeautiful. wrong. it has been following you for some time now, and it knows you know.",
        death: "the stag folds like paper. the forest exhales. the light between the trees goes ordinary.",
        midLines: [
            "its antlers scrape the canopy. no leaves fall.",
            "it makes no sound when it moves. it never has.",
        ],
        art: [
            "   \\ /       \\ /",
            "    \\\\  ___  //",
            "     \\\\/   \\//",
            "      | o o |",
            "      |  .  |",
            "      /|   |\\",
            "     / |   | \\",
            "       |___|",
        ],
    },
    tidecaller: {
        name: "the tide caller", hp: 26, dmg: [4, 7], behavior: "defensive", evade: 0, boss: true,
        intro: "something that used to be human stands where the water meets the rock.\nit reaches for you. it looks like it is asking for help.",
        death: "it sinks without struggling. at the last moment, it waves. or the water moves. one of those.",
        midLines: [
            "it reaches for you again. slower this time. asking.",
            "water pours from its mouth in the shape of words.",
        ],
        art: [
            "     ~ ~ ~ ~ ~",
            "      .-----.",
            "     ( 0   0 )",
            "      |  ~  |",
            "     /|     |\\",
            "    ~ |     | ~",
            "   ~  |_____|  ~",
            "    ~ ~ ~ ~ ~ ~",
        ],
    },
    archivist: {
        name: "the archivist", hp: 28, dmg: [3, 6], behavior: "defensive", evade: 0.15, boss: true,
        intro: "it sits among the records, and the records are all about you.\n\"back again,\" it says, warmly. \"sit. no? straight to it, then. like the others.\"",
        death: "\"forty-two,\" it says as it crumbles, and it sounds — proud? \"do read the files. you've earned that much.\"",
        midLines: [
            "\"loop twelve: you drowned,\" it recites. \"loop thirty: you simply stopped eating.\"",
            "\"i do like you best when you make it this far,\" it says, parrying.",
            "\"you always favour that shoulder. every single one of you.\"",
            "\"shall i tell you how the last one died? no. no, you'll see.\"",
        ],
        art: [
            "      |[]|[]|[]|",
            "      |[]|[]|[]|",
            "       .------.",
            "      ( o    o )",
            "       |  ==  |",
            "      /|~~~~~~|\\",
            "     | |______| |",
            "      |[]|[]|[]|",
        ],
    },
    echo: {
        name: "the echo", hp: 30, dmg: [4, 7], behavior: "mirror", evade: 0.2, boss: true,
        intro: "at the bottom of the cave something is waiting, and it is shaped exactly like you.\nit does not speak. it raises its weapon when you raise yours.",
        death: "it falls the way you would fall. it lies the way you would lie.\nyou leave without looking back. you don't think about why.",
        midLines: [
            "it says nothing.",
            "it moves like you. exactly like you.",
            "you feint left. it has already feinted left.",
        ],
        art: [
            "       @",
            "      /|\\",
            "      / \\",
            "",
            "       @",
            "      /|\\",
            "      / \\",
        ],
    },

    /* ---- the final boss ---- */
    you: {
        name: "you", hp: 34, dmg: [4, 8], behavior: "aggressive", evade: 0.15, boss: true, final: true,
        intro: "",
        death: "",
        midLines: [
            "they fight the way you fight. of course they do.",
            "there is no hatred in their face. only the work.",
            "for one step their footing is wrong — the machine spat them out crooked. yours didn't.",
        ],
        art: [
            "        .---.",
            "       | o o |",
            "       |  -  |",
            "      _|     |_",
            "     / |     | \\",
            "    |  |_____|  |",
            "       |  |  |",
            "      _|  |  |_",
        ],
    },
};
