performance_trick();

load_code(89);
load_code(88);
load_code(51);

const { webFrame } = require('electron');
webFrame.setZoomFactor(0.8);

//buyFromGoblin(["ink", "quiver", "snakefang", "cryptkey",'rednose', 'tigerhelmet'])
var buy_list = ["ink", "quiver", "hbow", "snakefang", "cryptkey", 'rednose', 'tigerhelmet', 'wattire', 'wbreeches', 'wgloves', "poison", "mistletoe", "basketofeggs", "candycane", "candy0", "candy1", "leather", "troll", "candypop", "mshield", "mearring", "dexearring", "intearring", "spookyamulet", "jacko", "tracker"]


var attack_mode=false
var thinking = false;
var idle_spot = {map: 'main', x: -194, y: -130}
var block_unpack = false;
class MerchantManager {
	constructor() {
		this.thinking = false;
		// prevents us from conflicting actions
		this.current_action = "";
		this.buy_list = buy_list


		this.stand;
		setInterval(this.stander, 1000);
		
		// if idle move back to mainland
		this.idle_counter = 0;
		setInterval(this.regen, 500);
		setInterval(this.bless_up, 1000);
	}
	
	set_current_action(action) {
		log(`Requesting to update '${this.current_action}' to '${action}'`);
		if (!this.current_action && action) {
			this.current_action = action;
			this.idle_counter = 0;
		}
	}
	clear_current_action() {
		log(`Requesting to clear: ${this.current_action}`);
		if (this.current_action) {
			this.current_action = ""
		}
	}
	
	stander() {
		if (character.moving) {
			this.stand = false;
		} else {
			this.stand = true;
		}
		if (this.stand) {
			parent.open_merchant(6)
		} else {
			parent.close_merchant(6)
		}
		setTimeout(() => {
			this.stander
		}, 1000);
	}

	do_runs() {
		if (this.current_action) return;
		this.current_action = "runs";
		smart_move("secondhands", function (buy_list) { buyFromPonty(buy_list) }).then(
			success => {
				//if (character.moving) return;
				smart_move("lostandfound", function (buy_list) {
					buyFromGoblin(buy_list)
				}).then(
					success => {
						// move to main and reset
						this.idle_counter = 0;
						log("Idle clear")
						smart_move(idle_spot);
						this.clear_current_action();
					},
					failure => {
						log("Gobbo Failure");
						this.clear_current_action();
						this.idle_counter = 0;

					}
				);
			},
			failure => {
				log("Idle fail clear")
				this.clear_current_action()
				this.idle_counter = 0;

			}
		);
	}



	
	bless_up() {
		let characters = ["VendorGuy", "camelCase", "cannaMace", "couplaGrapes"];
		for (let idx in characters) {
			let name = characters[idx]
			let target = get_player(name)
			if (target) {
				if (!target.s.mluck || target.s.mluck.f !== character.name) {
					use_skill("mluck", name)
				}
			}
		}
	}

	
	
	loop() {
		log(`Processing loop with action: ${this.current_action}`)
		
		// if we ripped, respawn and reset
		if (character.rip) {
			respawn();
			log("Rip! Respawn clear")
			this.clear_current_action();
			this.thinking = false;
		} else {
			
			
			if (!this.current_action) {
				this.do_action("fishing");
				this.do_action("mining");
				this.go_exchange();
				this.bank();
				this.upgrade_all();
				if (character.moving) {
					this.idle_counter = 0;
				}
			}


			
			
			// increment counter when we're doing nothing
			if (!this.current_action && !character.moving && !this.thinking) {
				let valid_x = [0, -204];
				let valid_y = [0, -109];
				if (!valid_x.includes(character.real_x) && !valid_y.includes(character.real_y)) {
					this.idle_counter += 1
					log(`Idle: ${this.idle_counter}`);
				}
			}

			if (this.idle_counter > 30) {
				this.do_runs()
			}
		}

		setTimeout(() => {
			this.loop()
		}, 1000);
	}
	
	regen() {
		if (character.max_mp !== character.mp) {
			if (!is_on_cooldown("regen_mp"))
				use_skill("regen_mp");
		}

		if (character.max_hp !== character.hp) {
			if (!is_on_cooldown("regen_hp"))
				use_skill("regen_hp");
		}
	}
	
	bank() {
		for (let idx in character.items) {
			let item = character.items[idx];
			if (item) {
				if (item.name === "gemfragment") {
					this.set_current_action("banking");
					smart_move("bank").then(
						success => {
							log("Bank success clear")
							bank_store(idx, "items1");
							if (character.bank.items1.length){
								for (let i=0; i<character.bank.items1.length; i++){
									bank_retrieve("items2", i);
								}
							}
							
							smart_move("main");
							this.clear_current_action();
						},
						failure => {
							log("Bank fail clear")
							this.clear_current_action()
						}
					)
				}
			}
		}
	}
	
	unpack(char, location) {
		//if (!message == "unpack") return;
		//let location = getPosition(character);
		//let location = ;
		log(`Unpack request from ${char} at ${location}`);
		// dont do if there's something else going on
		//if (this.current_action || this.thinking)
			//return;

		this.set_current_action("unpacking");
		smart_move(location).then(
			(success) => {
				send_cm(char, "arrived")
				
				for (let idx in character.items) {
					let item = character.items[idx];
					if (item) {
						if (item.name.includes('egg') || item.name === "seashell" || item.name === "crabclaw") {
							send_item(char, idx, item.q)
						}
					}
				}
				// go back
				smart_move(idle_spot).then(
					success => {
						log("Unpack success clear");
						this.clear_current_action()
					}
				)
			},
			(failure) => {
				log("Failed to unpack")
			}
		)
	}
	
	go_exchange() {
		// dont do if there's something else going on
		if (this.current_action || this.thinking)
			return;
		
		let exchangeItems = ["basketofeggs", "goldenegg", "gem0"];
		
		let hasExchangeable = false;
		for (let idx in exchangeItems) {
			if (locate_item(exchangeItems[idx]) > -1) {
				hasExchangeable = true;
			}
		}
		
		if (!hasExchangeable) return

		log("Going to exchange")
		this.thinking = true;
		
		let exchangeCoordinates = { map: 'main', x: -204, y: -344 }
		smart_move(exchangeCoordinates).then(
			success => {
				this.set_current_action("exchange");
				this.thinking = false;
				
				let exchangeInterval = setInterval(() => {
					
					let sellItems = []
					for (let idx in sellItems) {
						let item = locate_item(sellItems[idx])
						if (item > -1) {
							// doesn't have a modifier
							if (character.items[item].p) {
								log("item has modifier")
							} else if (character.items[item].level) {
								log("item has level")
							} else {
								sell(item)
							}
						}
					}
					
					if (character.esize == 0) {
						log("No Space");
						this.upgrade_all();
						this.clear_current_action();
						clearInterval(exchangeInterval);
					}

					let hasExchangeable = false;
					for (let idx in exchangeItems) {
						let item = locate_item(exchangeItems[idx]);
						if (item > -1) {
							hasExchangeable = true;
							if (!parent.character.q.exchange) {
								exchange(item)
							}
						}
					}
					
					
					if (!hasExchangeable) {
						log("Exchangeable clear")
						this.clear_current_action();
						clearInterval(exchangeInterval);
					}
				}, 1000)
			},
			failure => {
				log("failed to go to exchange");
				this.thinking = false;
			}
		)
	}
	
	do_action(action) {
		// dont do if there's something else going on
		if (this.current_action || this.thinking)
			return;

		// don't do anything while it's on cooldown
		if (is_on_cooldown(action)) {
			// clear it out if we are done
			if (this.current_action == action) {
				//this.current_action = "";
				log("Action cooldown clear")
				this.clear_current_action();
			}

			return;

		}
		
		log(`Doing: ${action}`)

		// where to go
		let location_map = {
			fishing: {map: 'main', x: -1368, y: -216},
			mining: {map: 'tunnel', x: -264, y: -196}
		}
		let location = location_map[action]
		
		this.set_current_action(action);
		this.thinking = true;
		smart_move(location)
			.then(
			(success) => {
				log("got to destination")
				this.thinking = false;
				// turn on current action
				this.set_current_action(action);

				let item_map = {
					fishing: "rod",
					mining: "pickaxe"
				}
				let itemName = item_map[action]
				let itemIndex = locate_item(itemName)
				if (!character.slots.mainhand || !(character.slots.mainhand.name == itemName))
					equip(itemIndex)

				let actionInterval = setInterval(() => {
					if (is_on_cooldown(action)) {
						log("Action cooldown clear 2")
						this.clear_current_action();
						unequip("mainhand");
						clearInterval(actionInterval);
					} else {
						if (!character.c[action]) {
							use_skill(action)
						}
					}
				}, 1000)
			},
			(failure) => {
				this.thinking = false;
				log(`Couldn't go ${action}`)
			}
		)
	}
	
	mine() {
		log("Mine")
		this.do_action("mining")
	}
	
	fish() {
		log("Fish")
		this.do_action("fishing")
	}
	
	upgrade_all() {
		let itemList = ["xmashat","mushroomstaff", "stinger", "wcap", "wattire", "wbreeches", "wgloves", "wshoes", "bow", "swifty", "hbow", "sshield", "cclaw", "blade", "eslippers", "eears", "epyjamas", "quiver"]
		let scrollType = "scroll0"
		let scrollSlot = locate_item(scrollType)
	
		let action = "upgrade"
		// dont do if there's something else going on
		if (this.current_action) return;

		//this.current_action = action
		
		for (var idx in itemList) {
			let itemName = itemList[idx]
			for (var level = 0; level < 7; level++) {
				var itemSlots = locate_items(itemName, level)
				if (!itemSlots.length) {
					continue
				}
				this.current_action = action;
				
				if (character.real_x != -204 && character.real_y != -129) {
					if (!this.thinking) {
						this.thinking = true;
						smart_move("upgrade").then(
							success => this.thinking = false,
							failure => this.thinking = false
						)
					}
				}

				for (var listIndex in itemSlots) {
					let itemIndex = itemSlots[listIndex];
					let item = character.items[itemIndex];
					let itemName = character.items[itemIndex].name;
					// buy scroll if not in slot 3
					if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1)

					// get item grade
					let grade = item_grade(character.items[itemIndex]);

					// grade 1+ = +7
					if (grade > 0) {
						log("grade is over 0")
						if (this.current_action == action) {
							log("Grade over 0 clear")
							this.clear_current_action();
						}
					} else if (character.items[itemIndex] && character.items[itemIndex].p && !itemName === "stinger") {
						log("has some modifier");
						if (this.current_action == action) {
							log("Item modifier clear")
						}
					} else {
						// upgrade if we got here
						if (!parent.character.q.upgrade) {
							if (itemName == "stinger" && item.level == 4 && !item.q) {
								sell(itemIndex);
								this.clear_current_action();
							} else {
								this.set_current_action(action);
								upgrade(itemIndex, scrollSlot).then(
									success => {
										if (this.current_action == action) {
											log("Upgrade success clear")
											this.clear_current_action();
										}
									},
									failure => {
										if (this.current_action == action) {
											log("Upgrade failure clear")
											this.clear_current_action();
										}
									}
								)
							}
						}
					}
				}
			}
		}
	}
}

function do_craft(num) {
	for (var i = 0; i < num; i++) {
		craft(28, 29, 30, 31, 32, 33, 34, 40, 41);
	}
}

function locate_items(item_name, item_level=0) {
	// start w/ empty array
	let itemArray = []
	
	// iterate through items
	for(var i=0;i<character.items.length;i++) {
		let item = character.items[i];
		// if the item exists
		if(item) {
			// if the item matches our query
			if (item.name == item_name && item.level == item_level) {
				// push the index to our array
				itemArray.push(i);
			}
		};
	}
	
	return itemArray
}

function save_this() {
	for (idx in character.items) {
		let item = character.items[idx];
		if (item) {
			log('item!')
			log(item.str)
			if (item.int || item.str || item.dex) {
				log("Compoundable?")
			} else {
				console.log(item.str)
			}
		}
	}
}

function do_combine(item_name) {
	var COMPOUND_SCROLL = "cscroll0"

	var scrollSlot = locate_item(COMPOUND_SCROLL);
	// buy scroll if not in inventory
	if (!character.items[scrollSlot]) {
		buy_with_gold(COMPOUND_SCROLL);
		scrollSlot = locate_item(COMPOUND_SCROLL);
	}
	
	var levelArray = [0, 1, 2]
	for (var level in levelArray) {
		// get a list of items
		var itemList = locate_items(item_name, level);
		if (itemList.length >= 3) {
			// do the compound
			if (!parent.character.q.compound) {
				compound(itemList[0], itemList[1], itemList[2], scrollSlot)
			}
		}
	}
}

function upgrade_all() {
	var TIMEOUT = 1000;
	let itemList = ["mushroomstaff", "stinger", "wcap", "wattire", "wbreeches", "wgloves", "wshoes", "bow", "swifty", "hbow", "sshield", "cclaw", "blade", "eslippers", "epyjamas"]
	let scrollType = "scroll0"
	let scrollSlot = locate_item(scrollType)
	
	for (var idx in itemList) {
		let itemName = itemList[idx]
		for (var level = 0; level < 7; level++) {
			if (itemName == "stinger" && level == 4) continue;
			var itemSlots = locate_items(itemName, level)
			if (!itemSlots.length) {
				continue
			}
			for (var listIndex in itemSlots) {
				let itemIndex = itemSlots[listIndex];
				// buy scroll if not in slot 3
				if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1)

				// get item grade
				let grade = item_grade(character.items[itemIndex]);

				// grade 1+ = +7
				if (grade > 0) {
					log("grade is over 0")
					continue;
				} else if (character.items[itemIndex] && character.items[itemIndex].p || !itemName == "stinger") {
					log("has some modifier");
					continue;
				} else {
					// upgrade if we got here
					if (!character.q.upgrade) {
						upgrade(itemIndex, scrollSlot)
						break;
					}
				}
			}
		}
	}

	setTimeout(upgrade_all, TIMEOUT);
}

function high_upgrade_all() {
	var TIMEOUT = 1000;
	let itemList = ["bataxe", "oozingterror", "harbringer", "epyjamas", "eears", "pants1", "gloves1", "firestaff", "shoes1", "fireblade", "basher", "quiver", "merry"]
	let scrollType = "scroll1"
	let scrollSlot = locate_item(scrollType)
    let maxLevel = 7;
	
    for (var level = 0; level < maxLevel; level++) {
        for (var idx in itemList) {
            let itemName = itemList[idx]
            var itemSlots = locate_items(itemName, level)

            for (var listIndex in itemSlots) {
                let itemIndex = itemSlots[listIndex];
                // buy scroll if not in slot 3
                if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1)

                // get item grade
                let grade = item_grade(character.items[itemIndex]);

				
                // grade 1+ = +7
                if (grade != 1 || (itemName == "shoes1" && level >= 5)) {
                    log("grade is over/under 1")
                    continue;
                } else if (character.items[itemIndex] && character.items[itemIndex].p) {
                    log("has some modifier");
                    continue;
                } else {
                    // upgrade if we got here
                    if (!parent.character.q.upgrade) {
                        upgrade(itemIndex, scrollSlot)
                        break;
                    }
                }
            }
        }
    }
	
	setTimeout(high_upgrade_all, TIMEOUT);
}

function do_upgrade() {
	let item = "stinger"
	let itemList = ["cclaw", "quiver"]
	let scrollType = "scroll0"
	let scrollSlot = locate_item(scrollType)
	let itemSlot = 2
	itemSlot = locate_item(item)
	let itemIndex = itemSlot
	
	let rebuy_item = false;
	let rebuy_scroll = true;

	// buy scroll if not in slot 3
	if (!character.items[scrollSlot] && rebuy_scroll) buy_with_gold(scrollType, 1)
	// buy item if not in slot 4
	if (!character.items[itemIndex] && rebuy_item) buy_with_gold(item)
	
	// get item grade
	let grade = item_grade(character.items[itemIndex]);

	// grade 1+ = +7
	if (grade > 0) {
		log("We got a graded one!")
		
		if (!character.moving) {
			smart_move("bank").then(
				function(success) {
					// in bank, store at the bank
					bank_store(itemIndex, "items1");
					// move back to upgrade area
					smart_move("compound").then(do_upgrade)
				},
				function(failure) {
					game_log("trouble going to bank")
				}
			)
		}
		
		return;
	}
	
	// upgrade if we got here
	upgrade(itemIndex, scrollSlot).then(
		function(data){
			//game_log("Upgrade call completed");
			// call it again
			do_upgrade();
		},
		function(data){
			//game_log("Upgrade call failed with reason: "+data.reason);
			// wait 250ms to call again
			setTimeout(do_upgrade, 250);
		},
	);
}

function do_exchange() {
	// exchange
	let exchangeItems = ["basketofeggs", "goldenegg"]
	let exchangeSlot = locate_item(exchangeItem);
	
	if (!parent.character.q.exchange) {
		exchange(exchangeSlot);
	}
	
	// timeout to do it again
	setTimeout(() => {
		do_exchange();
	}, 1000);
}

function compound_loop() {

	setInterval(() => {
		var itemList = ["ringsj", "hpamulet", "hpbelt", "vitring", "intring", "dexring", "strring", "dexamulet", "intamulet", "stramulet", "intearring", "strearring", "dexearring", "vitearring", "wbook0", "intbelt", "strbelt", "dexbelt", "orbg"];
		for (var itemName of itemList) {
			do_combine(itemName)
		}
	}, 1000)
}

function main_loop() {
	setInterval(() => {
		if (character.max_mp !== character.mp) {
			if (!is_on_cooldown("regen_mp"))
				use_skill("regen_mp")
		}
		
		if (character.max_hp !== character.hp) {
			if (!is_on_cooldown("regen_hp"))
				use_skill("regen_hp")
		}
		
		let stuff_to_do = ["fishing", "mining"]
		let stuff_data = {
			fishing: {map: 'main', x: -1080, y: -305},
			mining: {map: 'tunnel', x: -264, y: -196}
		}
		for (let action of stuff_to_do) {
			if (!is_on_cooldown(action)) {
				//if (!thinking) return
				//smart_move(stuff_data[action]).then(() => { thinking = false })
				//thinking = true;
				log(`can ${action}`);
				if (!parent.character.c[action] && parent.character.slots.mainhand) {
					use_skill(action)
				}
			}
		}
	}, 1000);
}

let diocles = new MerchantManager();
diocles.loop();
//main_loop();
//do_upgrade();
//do_exchange();
//upgrade_all();
high_upgrade_all();
compound_loop();

character.on("cm",  function(data) {
	if (block_unpack) return;
	diocles.unpack(data.name, data.message);
});
