// log("1 - Main");
//load_code(88) // bots; 
// load_code(12) // utility fns; locate_items(), getPosition("charname"), savePosition()
// load_code(14) // partying


let tunnelMine = {map: 'tunnel', x: -279.9999999, y: -10.0000001}
let wofficeMine = {map:"woffice", x: -153.15, y: -177}

// where to go
let location_map = {
	fishing: {map: 'main', x: -1368, y: -216},
	mining: tunnelMine
}		
			
class Character {
	constructor() {
		
		// LIMITERS
		this.thinking = false;
		// prevents us from conflicting actions
		this.current_action = "";
		this.idle_counter = 0;

		
		// IDENTIFIERS
		this.class = parent.character.ctype;
		this.action;
		this.state;		
		this.support = false
		// TARGETTING
		this.target;
		this.target_name;
		this.target_type;
		this.target_hp;
		this.target_mp;
		this.target_distance;
		this.target_distance_x;
		this.target_distance_y;

	}
	show() {
		log(this.class)
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
		

		let location = location_map[action]
		
		
		this.set_current_action(action);
		this.thinking = true;
		smart_move(location)
			.then(
				() => {
					log("got to destination")
					this.thinking = false;

					// turn on current action
					this.set_current_action(action);

					// MAY NEED TO BE MOVED BACK INTO THE smart_move().then() below

					let item_map = {
						fishing: "rod",
						mining: "pickaxe"
					}

					let itemName = item_map[action]
					let itemIndex = locate_item(itemName)
					if (!itemIndex) return

				
					if (action == "fishing" || action == "mining") {
						if (character.slots.offhand) unequip("offhand")
					
						if (character.slots?.mainhand.name != itemName) equip(itemIndex)
					}
				
					this.gatheringInterval(action);
				})
				.catch(() => {
					this.thinking = false;
					log(`Couldn't go ${action}`)
					this.clear_current_action();
				}
		)
	}

	gatheringInterval(action) {
		let actionInterval = setInterval(() => {
					
			if (is_on_cooldown(action)) {
				log("Action cooldown clear 2")
				switch (action) {
					case "fishing":
					case "mining":
						unequip("mainhand")
						break;
					default:
						break;
				}
				this.clear_current_action();
	
				clearInterval(actionInterval);
	
			} else {
				
				if (!character.c[action]) {
					use_skill(action)
				}
			}
		}, 1000)
	}

	buff(skill) {

		// do more dynamic character solution later
		let characters = ["VendorGuy", "camelCase", "cannaMace", "couplaGrapes"];
		for (let idx in characters) {
			let name = characters[idx]
			let target = get_player(name)
			if(!target) continue;
			if (!target.s.skill || target.s.skill.f !== character.name) {
				use_skill(skill, name)
			}
		}	
	}	
}

// module.exports = Character;




// var base = new Character();

// switch (base.class) {
// 	case "mage":
// 		require_code(2);
// 		break;

// 	case "merchant":
// 		require_code(3);
// 		break;
	
// 	case "paladin":
// 		require_code(4);
// 		break;
	
// 	case "priest":
// 		require_code(5);
// 		break;
	
// 	case "ranger":
// 		require_code(6)
// 		break;
	
// 	case "rogue":
// 		require_code(7);
// 		break;

// 	case "warrior":
// 		require_code(8);
// 		break;
			
	
// }
