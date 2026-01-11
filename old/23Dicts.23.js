// SET UP A MOB DICT FOR THIS
// ! USE THIS IN TRAVELLING FN TO GIVE COORDS IF NO x / y GIVEN
// let map = G.maps[character.map];

let farmDefault = {
  cannaMace: "squig",
  camelCase: "crab",
  couplaGrapes: "squig2",
  Hoodlamb: "crab",
  prayerBeads: "poisio",
  Teef: "prat",
  Boink: "poisio",
};

let priTank = [
  "oxhelmet",
  "harmor",
  "frankypants",
  "xboots",
  "vgloves",
  "sshield",
]; //'lantern', ]
let priLuck = ["wcap", "wattire", "wbreeches", "wshoes", "wgloves", "mshield"]; //, ]

let noUp = {
  2: ["vitring", "talkingskull"],
};
// // iterate through the monsters
// for (let monster of map.monsters) {
// 	// if it's of our target type
// 	if (monster.type == mtype) {

// 		let topLeft = [monster.boundary[0], monster.boundary[1]]
let crab = { map: "main", x: -1175.7559333568836, y: -94.26759905415406 };
let frog = { map: "main", x: -1166.3100928140552, y: 1225 };
let squig = { map: "main", x: -1165.6557029608748, y: 300.21328251075323 };
let squigSouth = { map: "main", x: -1166.3100928140552, y: 478.627440332755 };
let optimalBee = { map: "main", x: 745.0119325069998, y: 713.0353542476796 };
let snake = { map: "main", x: -99.00430360974092, y: 1892.1728334181553 };
let osnake = { map: "halloween", x: -585.5701569278165, y: -350.4367234174731 };
// let cgoo = { map: 'arena', x: 933, y: -178 }
let cgoo = { x: -364.6151891596926, y: -268.80206830638093, map: "level4" };
let mrpumpkin = { map: "halloween", x: -177, y: 776.2616171730763 };
let rat = { map: "mansion", x: 165.33474873906044, y: -261.7979385004271 };
let spider = { map: "main", x: 925, y: -155 };
let armadillo = { map: "main", x: 526, y: 1821 };
let boar = { map: "winterland", x: 17, y: -840 };
let porcupine = { map: "desertland", x: -824, y: 146 };
let bigbird = { map: "main", x: 1150, y: 200 };
let bbpompom = { map: "winter_cave", x: 50, y: -150 };
let mrgreen = { map: "spookytown", x: 480, y: 1070 };
let snowman = { map: "winterland", x: 1150, y: -850 };
let arcticbee = { map: "winterland", x: 1150, y: -850 };
let poisio = "poisio";
let plantoid = "plantoid";
let croc = {
  x: 799,
  y: 1623.5,
  map: "main",
};
let stoneworm = {
  x: 571,
  y: 166,
  map: "spookytown",
};

let prat = {
  x: -86,
  y: 17,
  map: "level1",
};

// TURRET MAY BE OVERKILL?
let mobLocationDict = {
  poisio: { loc: "poisio" },
  plantoid: { loc: "plantoid" },
  prat: { loc: prat },
  crab: {
    loc: crab,
    turret: true,
  },
  squig: {
    loc: squig,
    turret: true,
  },
  squig2: {
    loc: squigSouth,
    turret: true,
  },
  squigtoad: {
    turret: true,
  },
  bee: {
    loc: optimalBee,
    turret: true,
  },
  arcticbee: {
    loc: arcticbee,
    turret: true,
  },
  snake: {
    loc: snake,
    turret: true,
  },
  osnake: {
    loc: osnake,
    turret: true,
  },
  armadillo: {
    loc: armadillo,
    turret: true,
  },
  croc: {
    loc: croc,
    turret: true,
  },
  rat: {
    loc: rat,
    turret: true,
  },
  bbpompom: {
    loc: bbpompom,
    turret: true,
  },
  stoneworm: {
    loc: stoneworm,
    turret: true,
  },

  bigbird: {
    loc: bigbird,
  },
  boar: {
    loc: boar,
  },
  spider: {
    loc: spider,
  },
  cgoo: {
    loc: cgoo,
  },
  mrpumpkin: {
    loc: mrpumpkin,
  },
  mrgreen: {
    loc: mrgreen,
  },
  snowman: {
    loc: snowman,
  },
  // below maybe redundant/unnecessary?
  crabxx: {},
  franky: {},
};

let bots = {
  "3ra": ["couplaGrapes", "cannaMace", "camelCase", "VendorGuy"],
  "2ra": ["couplaGrapes", "camelCase", "VendorGuy"],
  "2ra1pa": ["couplaGrapes", "camelCase", "SaladMan", "VendorGuy"],
  "1ra1pa1ro": ["camelCase", "SaladMan", "Teef", "VendorGuy"],
  "2ra1ma": ["Hoodlamb", "couplaGrapes", "camelCase", "VendorGuy"],
  "1ra1pr1ro": ["prayerBeads", "Teef", "camelCase", "VendorGuy"],
  "1w1pr1ra": ["Boink", "prayerBeads", "camelCase", "VendorGuy"],
};

function makeGroups() {
  // dict of ctypes, maybe do if {mainChar} == x, group=y
  switch (character.ctype) {
    case "ranger":
      break;
    case "paladin":
      break;
  }
}

let itemMobDict = {
  spider: "spidersilk",
  snake: ["stramulet", "intamulet", "dexamulet"],
  arcticbee: ["strring", "vitring", "intring", "dexring"],
};
let sell_dict = {
  merch_keep: [
    "hpot0",
    "hpot1",
    "mpot0",
    "mpot1",
    "stand0",
    "tracker",
    "rod",
    "pickaxe",
    "offering",
    "scroll0",
    "scroll1",
    "scroll2",
    "cscroll0",
    "cscroll1",
    "cscroll2",
    "elixirluck", // 'jacko',
    "seashell",
    "computer",
    "egg0",
    "egg1",
    "egg2",
    "egg3",
    "egg4",
    "egg5",
    "egg6",
    "egg7",
    "egg8",

    // CRAFTING
    "essenceoffire",
    "feather0",

    "candycane",
    "mistletoe",
    "basketofeggs",
    "offeringp",
    // 'candy1', 'candy0',
  ],
  farmer_keep: [
    "hpot0",
    "hpot1",
    "mpot0",
    "mpot1",
    "tracker",
    "luckbooster",
    "jacko",
    "mshield",
    "sshield", // ! TODO: block sending loadout gear in unpack code instead
    // 'egg0', 'egg1', 'egg2', 'egg3', 'egg4', 'egg5', 'egg6', 'egg7', 'egg8',
  ],
  low: [
    "hpamulet",
    "hpbelt",
    "wattire",
    "wcap",
    "wbreeches",
    "wgloves",
    "stinger",
    "cclaw",
    "ringsj",
    "vitearring",
  ],
  toMerch: ["ringsj", "gem0", "gem1", "seashell"],
  merchSell: [
    "coat1",
    "helmet1",
    "hpbelt",
    "hpamulet",
    "whiteegg",
    "smoke",
    "phelmet",
    "gphelmet",
    "pants1",
    "gloves1",
    "shoes1",
    "pmaceofthedead",
    "warmscarf",
    "snowball",
    "wcap",
    "wshoes",
    "spear",
    "pstem",
    "frogt",
    "bandages",
    "smush",
    "dstones",
    "lspores",
    "slimestaff",

    "sword",

    "epyjamas",
    "carrotsword",
    "xmassweater",
  ], // 'xmasshoes', 'xmashat', 'eears', 'eslippers',
  merchTradeSell: [],
};

let upgradeDict = {
  upgrade_all: [
    "xmaspants",
    "xmashat",
    "xmasshoes", // 'xmassweater',
    "eslippers",
    "eears", // "epyjamas", "stinger", "swifty",
    "mittens",

    "wattire",
    "wbreeches",
    "wgloves",
    "wshoes",
    "wcap",
    "hbow",
    "sshield",
    "quiver",
    "cclaw",

    "ololipop",
    "glolipop",
    "broom",
    "wingedboots",
  ],
  high_upgrade_all: [
    // 'xmasshoes', 'xmaspants', 'xmassweater',
    // "quiver", "xmashat", "epyjamas", "eears",

    "ecape",
    "ornamentstaff",
    // 'staffofthedead', 'swordofthedead', // 'pmaceofthedead',
    "daggerofthedead", // 'bowofthedead', 'maceofthedead',
    "candycanesword",

    "oozingterror",
    "harbringer",
    "basher",
    "pinkie",
    "t2bow",
    "merry",
    "firestaff",
    "fireblade",
    "bataxe",
    "dagger",
    "tigerhelmet",
    "tigershield",
    "xmace",

    "firestars",
    "snowflakes",

    "hpants",
    "hgloves",
    "fierygloves",
    "pmace",
  ],
  compound: [
    "intamulet",
    "intring",
    "intbelt",
    "intearring",
    "strring",
    "strearring",
    "stramulet",
    "strbelt",
    "dexamulet",
    "dexring",
    "dexbelt",
    "dexearring",
    "skullamulet",
    "book0",
    "hpamulet",
    "hpbelt",
    "ringsj",
    "wbook0",
    "vitring",
    "jacko",
    "talkingskull",
    "vitearring",
    "rednose",
    //'lantern',
  ],
};

let mobsLow = [
  "bee",
  "crab",
  "squigtoad",
  "snake",
  "osnake",
  "croc",
  "squig",
  "goo",
  "tortoise",
  "minimush",
  "frog",
  "armadillo",
  "spider",
  "stoneworm",

  // harder
  "boar",
  "spider",
  "porcupine",
  // 2nd priority
  "snowman",
  "cutebee",
  "grinch",
  "rgoo",
  "bgoo",
  "goldenbat",
  "tinyp",
  "greenjr",
  "phoenix",
  // 1st priority - group mobs
  "franky",
  "mrpumpkin",
  "mrgreen",
  "icegolem",
  "crabxx",
];

let mobsGroup = [
  "franky",
  "mrpumpkin",
  "mrgreen",
  "icegolem",
  " dragold",
  "crabxx",
  "rgoo",
  "bgoo",
]; // ,

let mobsFocus = [
  "franky",
  "mrpumpkin",
  "mrgreen",
  "icegolem",
  "grinch",
  "cutebee",
  "tinyp",
  "rgoo",
  "jr",
  "greenjr",
  "snowman",
  "tiger",
  "dragold",
  "pinkgoo",
  "wabbit",
  "crabxx",
];

let mobsMed = [
  // 'rat', 'bbpompom', "iceroamer", 'scorpion', "bat", 'arcticbee',
  // "porcupine", "spider",
  "cgoo",
  "bigbird",
  "mole",
  "fireroamer",
  "wolf",
  "plantoid",
  "xscorpion",
  "prat",
];

let mobsHard = {};

let seasonalEvents = [
  "halloween",
  "holidayseason",
  "lunarnewyear",
  "valentines",
  "egghunt",
];
