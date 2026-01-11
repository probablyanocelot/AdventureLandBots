log("11 - Npcs.11.js")
let itemsToBuy = [
// INGREDIENTS
    "ink", 'bfur', 'snakeoil', "snakefang", "lotusf", "cscale", "ascale", "pleather", "poison", 
    'spidersilk', 'emptyheart', 'feather0', 
    'x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8',
    'egg0', 'egg1', 'egg2', 'egg3', 'egg4', 'egg5', 'egg6', 'egg7', 'egg8',
    'feather0', 'carrot', 'feather1',
    'essenceoffrost', 'essenceofgreed', 'essenceoflife', 'essenceoffire', 'essenceofnature',
    'bwing',
    
    "offeringp",

// EXCHANGE
    "mistletoe", "basketofeggs",
    "candycane",  "leather",  'goldenegg', 'xbox',
    '5bucks', "troll", "candypop", 
	'gift0', 'gift1', 'armorbox', 'weaponbox', "candy0",
    'ornament','gemfragment',
// MISC
    'cryptkey',
    'cxjar', 'emotionjar', 'frozenkey', 'funtoken',
    'monstertoken', 'pvptoken', 'luckscroll', 'frequencyscroll', 'xpscroll', 'evasionscroll',
    'outputscroll', 'critscroll', 'lifestealscroll', 'mbones',
    
    'merry', 't3bow',
    'bowofthedead', 'xmace', 'crossbow', 'pinkie', 'ooze', 'oozingterror', 'cupid', 'bataxe',
    "hbow", "cryptkey", 
// HEAD
    'xhelmet', 'cyber', 'fury', 'oxhelmet', 'tigerhelmet', 'rednose', 
// LEGS
    'starkillers', 'fallen', 'xpants',
// BODY
    'tshirt7', 'tshirt4', 'tshirt9', 'tshirt8', 'tshirt3', 'tshirt88', 'luckyt',
    'vattire', 'cdragon', 'warpvest', 'xarmor', 
// BOOTS
    'wingedboots', 'xboots',
// GLOVES
    'wgloves', 'fierygloves', 'supermittens', 'powerglove', 'xgloves',
    'vgloves', 'goldenpowerglove', 'mpxgloves', 'poker', 
// CAPES
    'gcape', 'vcape', 'stealthcape', 'fcape', 'angelwings', 'tigercape',
// RINGS
    "intring","dexring",  "strring", 
    'cdarktristone', 'cring', 'resistancering', 'armorring', 'vring', 'zapper',
    "ringhs", 'trigger', 'ringofluck', 'goldring', 'suckerpunch', 'solitaire',
// EARRINGS
    'strearring',"dexearring", 
    'dexearringx', 'lostearring', 'cearring', 'molesteeth', "mearring","intearring",  'vitearring', 
// AMULETS
    'amuletofm', 't2dexamulet', 't2intamulet', 't2stramulet', 'snring', 'bfangamulet', 
    'sanguine', 'mpxamulet', 'northstar',"dexamulet",'stramulet',"intamulet",
// BELTS
    'mpxbelt', 'sbelt', 'santabelt', 'mbelt',"dexbelt","strbelt", "intbelt",
// ORBS
    'talkingskull', 'orbofsc', 'ftrinket', "jacko", 'charmer', 'rabbitsfoot',
    'tigerstone', 'orbg', 'vorb', 'orbofdex', 'orbofint', 'orbofstr',
// WEAPONS
    'vhammer', 'throwingstars', 'broom', 'rod', 'pickaxe', 'firestaff', 'fireblade', 'pmace',
    'ololipop', 'glolipop', 'harpybow',
// SHIELDS
    "sshield", 'tigershield', 'xshield', "mshield",
// OFFHANDS
    't2quiver', 'wbook1', 'wbookhs', 'exoarm', 

    'wbreeches', // 'wattire', 

     
     
    "tracker",
    
    'vblood',
] 
// "vitring",
// "candy1",
// 'ecape', 'eears', 'epyjamas','eslippers',

const shinyBlackList = [
    'hpamulet', 'hpbelt',
    'stinger', 'mushroomstaff', 'slimestaff',
    'warmscarf', 'carrotsword', //'candycanesword',
    'shoes1', 'gloves1', 'pants1', 'coat1', 'helmet1',
    'gphelmet', 'spear', 'iceskates', 'phelmet',
    'eears', 'epyjamas', 'eslippers',
    'xmasshoes', 'xmashat', 'xmaspants', 'xmasrobe', 'xmassweater',

]

function buyFromPonty() {


    // Set up the handler
    var itemsBought = 0
    parent.socket.once("secondhands", function(data) {
        for(let d of data) {
            if (d.p){
                game_log(`ITEM ${d.name} has ${d.p}!`)
                // don't buy junk shinies
                if (shinyBlackList.includes(d.name)) continue
                
                // TODO: WHITELIST FOR LEVELLED SHINIES

                if (d.level == 0) {
                parent.socket.emit("sbuy", { "rid": d.rid }, 1)
                }
            }

            if (itemsToBuy.includes(d.name)) {
                if (d.level) {
                    if (d.level == 0) {
                        game_log(`BUY ${d.name}!`)
                        // We want this item based on our list
                        parent.socket.emit("sbuy", { "rid": d.rid }, 1)
                    }
                } else {
                
                    game_log(`BUY ${d.name}!`)
                    // We want this item based on our list
                    parent.socket.emit("sbuy", { "rid": d.rid }, 1)
                }
            } else {
                continue;
                //game_log(`DON'T BUY ${d.name}!`)
            }
        }
    });

    // Attempt to buy stuff
    parent.socket.emit("secondhands");
}


function buyFromGoblin() {


    // character.on('lostandfound_info', function (data) {
    //     log(data.response)
    // })
    // FIGURE OUT WHEN WE GET TO USE THIS
    // parent.socket.emit('donate', {gold:1000000})


    // Set up the handler
    var itemsBought = 0
    parent.socket.once("lostandfound", function(data) {
        for(let d of data) {
            if (d.p){
                game_log(`ITEM ${d.name} has ${d.p}!`)
                if (d.level == 0) {
                    parent.socket.emit("sbuy", { "rid": d.rid, f:true }, 1)
                }
            }

            if (itemsToBuy.includes(d.name)) {
                if (d.level) {
                    if (d.level == 0) {
                        game_log(`BUY ${d.name}!`)
                        // We want this item based on our list
                        parent.socket.emit("sbuy", { "rid": d.rid, f:true }, 1)
                    }
                } else {
                
                    game_log(`BUY ${d.name}!`)
                    // We want this item based on our list
                    parent.socket.emit("sbuy", { "rid": d.rid, f:true }, 1)
                }
            } else {
                continue;
                //game_log(`DON'T BUY ${d.name}!`)
            }
        }
    });

    // Attempt to buy stuff
    parent.socket.emit("lostandfound");
}



function buyOneFromPonty(itemToBuy) {
    // set up handler to receive the emit
    parent.socket.once('secondhands', data => {
        for (let d of data) {
            if (d.name == itemToBuy.name && d.level == itemToBuy.level) {
                parent.socket.emit('sbuy', { "rid": d.rid }, 1);
                // we bought the item we want
                return;
            }
        }
    });
    
    parent.socket.emit('secondhands');
}

function hanoi() {
    // hanoi like the tower stacking game
    // if we have 2 0 and 2 1, go ahead and complete by buying a 0
    
    // get a map of our inventory
    let itemMap = aggregateItems();
    
    // for each unique item in our inventory
    for (let item of Object.keys(itemMap)) {
        // check if compoundable, only play hanoi on compoundables
        if (G.items[item].compound) {
            // get the obj from the map
            let itemObj = itemMap[item]
            // get a list of levels available
            let itemLevels = Object.keys(itemObj);
            
            // if we have a level 0 and a level 1
            if (itemLevels.includes("0") && itemLevels.includes("1")) {
                
                // if there are 2 level 0 and 2 level 1
                if (itemObj["0"] == 2 && itemObj["1"] == 2) {
                    
                    // buy a level 0 of this item (if available)
                    let buyPayload = {
                        'name': item,
                        'level': 0
                    }

                    log('buying:')
                    log(buyPayload)
                    buyOneFromPonty(buyPayload)
                }
            }
        }
    }
}



function aggregateItems() {
    let itemDict = {};
    for (let item of character.items) {
        if (!item) continue;
        let itemName = item.name
        let itemLevel = item.level
        if (!itemDict[itemName]) itemDict[itemName] = {}
        
        // if equippable, add it to the dict, quantify amount of each level
        if (G.items[itemName].upgrade || G.items[itemName].compound) {
            itemDict[itemName][itemLevel] = parseInt(itemDict[itemName][itemLevel]) + 1 || 1;
        }
        // if stackable, quantify
        else if (item.q) itemDict[itemName]["q"] = parseInt(item.q);
    }
    return itemDict
}