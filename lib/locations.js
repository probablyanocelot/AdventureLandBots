let tunnelMine = { map: "tunnel", x: -279.9999999, y: -10.0000001 };
let wofficeMine = { map: "woffice", x: -153.15, y: -177 };
let fishing = { map: "main", x: -1368, y: -216 };

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

module.exports = {
  tunnelMine,
  wofficeMine,
  fishing,
  crab,
  frog,
  squig,
  squigSouth,
  optimalBee,
  snake,
  osnake,
  cgoo,
  mrpumpkin,
  rat,
  spider,
  armadillo,
  boar,
  porcupine,
  bigbird,
  bbpompom,
  mrgreen,
  snowman,
  arcticbee,
  poisio,
  plantoid,
  croc,
  stoneworm,
  prat,
  mobLocationDict,
};
