log("31")
performance_trick()
load_code('12Utility')
load_code('1Main')
load_code('16Relations')	// cm
load_code('13Skills')	//skill3shot(), get_nearby_entitties()
load_code('14Partying')	// PARTY, bots
load_code('15Combat')
load_code('19management') //sell extras -- merge this and 12Inv?
load_code('40Gui')
// load_code('30WabbitHunt')

let merchant = 'VendorGuy';
let group = '1w1pr1ra' //'1ra1pr1ro'
let currentGroup = getGroup(group)
let myFarmMob = farmDefault[character.id]
let myFarmLocation = mobLocationDict[myFarmMob].loc

let farmerReserve = 2500000;
let desired_potion_count = 9999;
let desired_mp_pot = "mpot1"
let desired_hp_pot = "hpot1"
let PACK_THRESHOLD = 28;

let gearDict = {}

let lastScare;
let lastGearSwap;
let targetId;

if (character.controller) log(`CONTROLLER = ${character.controller}`)

//STARTUP
if (character.name == currentGroup[0]) startBots(currentGroup);
const keyInviteBots = map_key("9", "snippet", "sendInvites('r3')")
const keyKillBots = map_key('8', 'snippet', "killBots(currentGroup)")
const keyStartBots = map_key('7', 'snippet', 'startBots(currentGroup)')

if (character.ctype != 'rogue' && character.ctype != 'warrior') setInterval(loot, 25)

let adds = ['nerfedmummy', ]

character.on('hit', function(data) {
	if (data.heal > 0) return
	let orb = character.slots.orb
	if (character.ctype == 'priest' && !G.events.hasOwnProperty(this.current_action)) return
	if (!orb || !orb.name == 'jacko') return
	if (lastScare == null || new Date() - lastScare >= 1000) {
		if (character.mp >= G.skills.scare.mp && !is_on_cooldown('scare')) {
			use_skill('scare', data.actor)
			lastScare = new Date()
		}
	}
})

function pvpBank() {
	for (let item of character.items) {
		if (!item) continue;
		if (is_pvp()){
			switch (item["name"]) {
				
				case "suckerpunch":
					if (!server.id == "I") {
						change_server("US", "I")
						break;
					}
				case "ink":
					farmerBank()
					break
				case 'seashell':
					if (item.q > 500) farmerBank()
					break
				case 'gem0':
					if (item.q >= 5) farmerBank()
					break
			}
		} 
	}
}


function get_luck_elixir() {
	if (!character.slots.elixir) return
	let timeToExpire = new Date - character.slots.elixir.expires
	log(timeToExpire)
}


function farmerBank() {
	if (smart.moving) return;
	if (!character.bank && !smart.moving) {
		log('farmerBank move')
		smart_move('bank')
	}
	if (smart.moving || character.moving) return;
	char.current_action = undefined;
	if (character.gold > 2500000) {
		let deposit = character.gold - farmerReserve;
		bank_deposit(deposit)
	}
	if (character.gold < 1500000) {
		log("Bank success");
		bank_withdraw(500000);
	}
	if (character.bank) { // && character.bank['items0'].length < 42
		for (let itemSlot in character.items) {
			let item = character.items[itemSlot]
			if (!item) continue;
			let itemName = item.name
			if (!sell_dict['keep'].includes(itemName)) bank_store(itemSlot)
			
		}
	
	}
	log('farmerBank return move')
	char.moveToThen(myFarmLocation, char.current_action = myFarmMob)
}



let attack_mode = false

class Farmer {  

	constructor() {
  
		// states
		this.pvp;
		this.thinking;
		this.current_action;
		this.idle_counter = 0;
		this.eventJoined;
  
	  // timing
		this.idle_start;
		this.last_cm;
		this.last_respawn;
		this.last_use_potion;
		this.last_use_mp_potion;
		this.last_use_hp_potion;
  
		// combat
		this.turret = true;
		this.mon_type;
		this.can_kill;
		this.itemBounty;
		this.itemBountyQty;
		
		if(character.ctype == 'paladin') this.turret = false

	setTimeout(savePosition(), 10000)
	
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
			this.idle_counter = 0;
		}
	}

	isActionMonster() {
		if (G.monsters.hasOwnProperty(this.current_action)) return true
		return false
	}
  
	handle_death() {
		if (character.rip) {
		  this.eventJoined = false;
		  if (this.last_respawn == null || new Date() - this.last_respawn >= 10000) {
			  this.clear_current_action();
		  respawn();
		  this.last_respawn = new Date();
		}
	  }
	}


	drink(){
		let elixir = locate_item('elixirluck')
		
		// Don't have any elixirs; TODO: if -1, ask merch for more
		if (elixir == -1) return
		
		// Already drinking elixir
		if (character.slots['elixir']) return
		
		if (!character.slots['elixir'] && elixir > -1) use(elixir)
	}
	
	async wabbitHunt() {
		if (!parent.S.wabbit.live && this.current_action == 'wabbit') this.clear_current_action()
		if (!parent.S.wabbit.live) return
		this.current_action = 'wabbit'
		await gooseChase(parent.S.wabbit.map,'wabbit')
		if (!parent.S.wabbit.live) this.clear_current_action()

	}


	serverMiniEvents() {

		// TODO: snowman, rabbit support -- smart_move('snowman') gives 'Unrecognized Location'
		let bosses = ['mrpumpkin', 'mrgreen', 'snowman', ]		//'snowman', 'rabbit'
		let rareBosses = []

		// if (this.current_action && this.current_action != 'farming') return
		// if (character.ctype == 'ranger') return

		for (let boss of bosses) {
			if (parent.S[boss] && parent.S[boss].live) {

				if (boss == 'snowman' && (parent.S?.mrgreen?.live || parent.S?.mrpumpkin?.live)) return

				// TODO: what if current_action is more important event?
				if (smart.moving) return
				// TODO: maybe just mobsFocus / mobsGroup .includes(current_action)
				// e.g. is event mob, etc
				if (!this.current_action || (this.current_action && !mobsGroup.includes(this.current_action))) this.current_action = boss

				if (is_in_range(get_nearest_monster({ type: boss }))) break
				
				
				let bossLocation = mobLocationDict[boss].loc // imported data set
				if (!bossLocation) {
					log('no boss location defined!!')
					if (!smart.moving) smart_move(boss)
					return
				}
				if (this.current_action == boss && !get_nearest_monster({ type: boss })&& !smart.moving) smart_move(bossLocation)
			}

			if (!this.current_action == boss) continue
			if (parent.S[boss] && !parent.S[boss].live && this.current_action == boss && !smart.moving) this.moveToThen(myFarmLocation, this.clear_current_action())
		}
		if (bosses.includes(this.current_action) && !parent.S[this.current_action]?.live) this.clear_current_action()

	}
	
	joinEvent(event) {
		// event = 'icegolem', etc
		if (character.ctype == 'ranger') return
		if (!parent.S[event]) return// no event 
		// if (event == 'franky') return;
		if (parent.S.halloween) return // nobody farming in season
		if (parent.S.egghunt) {
			switch (event) {
				case 'crabxx':
				case 'icegolem':
					return
			}
		}

		if (this.current_action == event) return // we set this true once we get there

		// if event is a mob name and we don't see the mob, join
		if (G.monsters[event] && get_nearest_monster({ type: event })) return
		
		join(event)
		return true;
	}

	serverEventEnd() {
		if (G.events.hasOwnProperty(this.current_action) && !parent.S[this.current_action]) { // ?.live
			this.eventJoined = false
			use_skill('use_town').then(() => {
				this.clear_current_action()
				smart_move(myFarmLocation)
			})
		}
	}

	serverEvents() {
		if (character.ctype == 'merchant') return;
		if (character.ctype == 'ranger') return
		for (let event in G.events) {
			// event = String(event)
			if (!parent.S[event]) continue

			// seasonal events are global, not joinable
			if (seasonalEvents.includes(event)) continue

			// set event as current action if it's live
			if (parent.S[event]) this.current_action = event // && parent.S[event].live

			if (parent.S[event] && !this.eventJoined) {
				join(event)
				this.eventJoined = true
			}
			if (parent.S[event] == 'franky') smart_move({
				"x": -49.63502742251986,
				"y": 10.794962400312897,
				"map": "level2w"
			})
			// if checks return true, set action to event
			// if (this.joinEvent(event)) this.current_action = event // && G.monsters[event]
	
			// if (get_nearest_monster({ type: 'bgoo' })) this.current_action = 'bgoo'
			// if (get_nearest_monster({ type: 'rgoo' })) this.current_action = 'rgoo'


			// if (!this.joinEvent(event) && this.current_action == event) use_skill('use_town').then(this.moveToThen(myFarmLocation, this.clear_current_action()))
			// if (this.current_action == event && !parent.S[event]?.live && !smart.moving) {
			// 	this.eventJoined = false
			// 	use_skill('use_town').then(() => {
			// 		this.clear_current_action()
			// 		smart_move(myFarmLocation)
			// 	})
				// use_skill('use_town').then(this.moveToThen(myFarmLocation, this.clear_current_action()))
				
			// }
			
		}
	}

	moveToThen(loc, then) {
		if (smart.moving) return 
		smart_move(loc)
		.catch(() => {
			if (!character.moving && !smart.moving) use_skill('use_town')
				.then(smart_move(loc))
		})
		.then(then)

	}


	async manage_idle() {

		if (character.moving) {
			this.idle_counter = 0;
		}

		// if (character.ctype == 'paladin') return
		if (smart.moving || this.isActionMonster() || (this.current_action && this.current_action !== '')) return;

		// only increment counter when we're doing nothing
		if (!this.current_action && !character.moving && !this.thinking) {
			this.idle_counter += 0.2
			if (this.idle_counter % 1 == 0) log(`Idle: ${this.idle_counter}`);
		}
		
		if (this.idle_counter > 5 && !smart.moving) {
			log('idle move')
			this.moveToThen(myFarmLocation, this.set_current_action(myFarmMob))
		}
	}

  
	fixStuck(){
		if (smart.moving) return
		// stuck in main
		if (character.x == 0 && character.y == 0) {
			this.clear_current_action();
			log('stuck move')
			smart_move(myFarmLocation)
		}

		// !TODO: replace farmDefault with 'is in' dict logic. maybe .hasOwnProperty()
		// if (this.current_action == 'farming' && character.x != farmDefault[character.id].x && character.y != farmDefault[character.id].y) {
			// if (character.moving || smart.moving) return
			// smart_move(farmDefault[character.id]).catch(use_skill('use_town'))
		// }
	}
  
	needsMerch() {
		// returns BOOL
		// switch = true, else false
		switch (true) {
			case this.dry():
			case !hasLuck():
			case character.esize <= 8:
			case !character.slots.elixir:
			case !character.s.mluck:
				return true
		}
		return false
	}
  
	dry() {
	  	// checks to see if we need merch pots
		
	  	// if no health potions, go get them
	  	if (item_quantity(desired_hp_pot) < 100) {
			  return true;
	  	}
  
	  	// if no mana potions, go get them
	  	if (item_quantity(desired_mp_pot) < 100) {
			  return true;
	  	}
	  
	  	return false;
	}
  
  
	count_pot() {
		// determine how many we need to buy
		let HP_TO_BUY = desired_potion_count - item_quantity(desired_hp_pot);
		let MP_TO_BUY = desired_potion_count - item_quantity(desired_mp_pot);	
		let pots = {
			h: {
				type: desired_hp_pot,
				qty: HP_TO_BUY,
			},
			m: {
				type: desired_mp_pot,
				qty: MP_TO_BUY,
			}
		}
		return pots
	}


  

	
	// if full, call merchant. if merchant, manage inv
	manage_inv() {
		pvpBank();
		
		// don't call the truck if we're in a very temporary place (event bosses)
		if (smart.moving || character.moving) return

		// ONLY USE IF DON'T WANT TO CALL TRUCK IN EVENTS
		// if (this.current_action && mobsGroup.includes(this.current_action)) return
		
		for (let event in parent.S) {
			if (parent.S[event].live && mobsGroup.includes(String(event))) return
		}

		// ! TRY NOT TO CALL MERCH IF YOU'RE NOT IN A SEMI-PERMANENT SPOT
		if (!this.current_action || !character.target) return
		// if (this.dry()) {
		// 	// if (this.turret == false) this.set_current_action('unpacking')
		// 	doCm(merchant, { cmd: 'unpack', loc: current_location(), pots: this.count_pot() });
		// }
		if (this.needsMerch()) doCm(merchant, {cmd:'unpack', loc:current_location(), pots: this.count_pot()});
	}
	
  
	manage_healing() {
	  if (character.ctype == "paladin") {
		if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp - 500) use(locate_item(desired_mp_pot));
		if (!is_on_cooldown("selfheal") && character.hp < character.max_hp - 200 && character.slots.mainhand.name != "ololipop") {
		  if (character.mp > 100) {
			  use_skill("selfheal", character).then(s => {return}, f=>{return})
		  } else {
			  use(locate_item(desired_mp_pot));
		  }
		  if (is_on_cooldown("selfheal") && !is_on_cooldown("regen_mp") && character.hp <= character.max_hp - 500) use(locate_item(desired_hp_pot)) 
		}
		if (character.slots.mainhand.name == "ololipop") {
			  if (!is_on_cooldown("regen_hp") && character.hp <= character.max_hp - 400) use(locate_item(desired_hp_pot));
		  }
		  if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp) use_skill("regen_mp").then(s => {return}, f=>{return});
		  return;
	  } else {
		if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp - 500) use(locate_item(desired_mp_pot));
		if (!is_on_cooldown("regen_hp") && character.hp <= character.max_hp - 400) use(locate_item(desired_hp_pot));
	  }
	  if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp) use_skill("regen_mp");
	  if (!is_on_cooldown("regen_hp") && character.hp < character.max_hp) use_skill("regen_hp");
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
					  .then(log(`using skill ${skill}`))
					  .catch(`use skill ${skill} failed`)
			  }
		  }	
	}
	
  
	manage_buffs() { 
	  switch (character.ctype) {
		  case "paladin":
			  this.buff("mshield")
		  default:
			  null
	  }
	}
  

	handleMonsterHunt(){
		if (character.ctype == 'merchant' || character.id == 'camelCase') return;
		let monsterHunterLocation = {
			map: 'main', 
			x: parent.G.maps.main.npcs[24].position[0],
			y: parent.G.maps.main.npcs[24].position[1],
		}


		if (character.s.monsterhunt){
	
			// if monsterhunt not finished, keep killing
			if (character.s.monsterhunt.c > 0){
				// if mobType not in 'mobs' : skip
				let mobType = character.s.monsterhunt.id
				if (!mobsLow.includes(mobType) && this.current_action == 'monsterhunt') {
					this.clear_current_action();
					this.can_kill = false
					return
				};
				if (!mobsLow.includes(mobType)) return
				if (this.current_action == 'farming' && (character.x != monsterHunterLocation.x && character.y != monsterHunterLocation.y)) return;

				// if can kill or not current action, set
				this.can_kill = true
				if (this.current_action != 'monsterhunt') this.set_current_action = 'monsterhunt'

				// if (!mobs.includes(mobType) || !G.monsters[mobType].attack > character.hp/20) return
				// targetting
				let target = get_targeted_monster()
				let nearest = get_monster({ type: mobType, no_target: true })
				if (!target && nearest) change_target(nearest)
	
				// if not there, go!
				log('monsterhunt move')
				if (!nearest && !smart.moving) smart_move(mobType)
			}

	
			// if finished, turn in.
			if (character.s.monsterhunt.c == 0 && !smart.moving){
				log('monsterhunt complete move')
				smart_move(monsterHunterLocation).then(() => {
					parent.socket.emit('monsterhunt')
					this.clear_current_action()
				})
			}
		}
		if (!character.s.monsterhunt && !smart.moving){
			// get quest from Daisy
			log('monsterhunt get quest move')
			smart_move(monsterHunterLocation).then(() => {
				parent.socket.emit('monsterhunt')
				setTimeout(function(){
					parent.socket.emit('monsterhunt')
				}, character.ping)
				this.set_current_action('monsterhunt')
			})
		}
	}


	manage_combat(lastTargetID) {
		
		if (character.rip || smart.moving) return;
		
		let target;

		if (lastTargetID) target = get_monster(lastTargetID)

		// if (character.ctype != 'ranger' && character.ctype != 'merchant') doCombat()

		// if (character.ctype == 'warrior' && get_player('prayerBeads')?.target) target = get_player('prayerBeads').target

		if (!target && this.current_action && G.monsters.hasOwnProperty(this.current_action)) target = get_nearest_monster({ type: this.current_action, no_target: true })

		if (this.target) {
			if (this.target.dead || this.target.rip) this.target = false
			if (this.target) target = this.target
		}

		// GROUP MOBS / HARDER MOBS GET PRIORITY
		for (let mob of mobsFocus) {
			let targetFocus = get_nearest_monster({ type: mob })
			if (!targetFocus) continue
			target = targetFocus
			break
		}


		// near weak/always-attack mobs
		if (!target) {
			this.target = false
							
			if (this.isActionMonster()) {
				target = get_nearest_monster({ type: this.current_action, no_target: true })
			}

			// if (this.current_action && !this.isActionMonster()) {

			// 	for (let mob of mobsLow) {

			// 		target = get_nearest_monster({ type: mob, no_target: true })
			// 		// ! NOT OPTIMAL; SUPERSHOT IS 3x character.range !!
			// 		if (target) break
			// 	}
			// }
				
		}
		

		let companionTarget = getCompanionTarget('prayerBeads')
		if (companionTarget) target = companionTarget //character.ctype != 'warrior' &&


		if (!target && character.hp <- character.max_hp * 0.6) return
		if (!target) return 	// must have target beyond here
		if (character.ctype == 'warrior' || character.ctype == 'rogue') { // keep farmer from suiciding by monster cop
			if (!get_player('prayerBeads')) return
			if (target.id != getCompanionTarget('prayerBeads').id) return
		}
		
		let targetTarget = target.target

		// ! if (targetTarget && !is_friendly(targetTarget) && !mobsGroup.includes(target.name)) // FIX THIS

		this.target = target

		// if(!is_in_range(target) && can_move_to(target.x, target.y)) {
		// 	move(
		// 		character.x+(target.x-character.x)/4,
		// 		character.y+(target.y-character.y)/4
		// 	);
		// 	// Walk 1/4 the distance
		// }
		let targetName = target.mtype


		// TODO: BETTER SOLUTION BELOW
		if (!lastTargetID && character.ctype == 'rogue' && get_player('prayerBeads') && !companionTarget) return
		
		// TODO: maybe better phoenix selection
		if (!mobsFocus.includes(targetName)) {
			if (get_nearest_monster({ type: 'phoenix' })) target = get_nearest_monster({ type: 'phoenix' })
		}

		combatDistancing(target)


		// GROUP MOBS
		// if (mobsGroup.includes(targetName)) {
		// 	avoid(target)
		// 	if(!target.target) return
		// }

		let kite = (target) => {
			if (target?.target == character.name){
				if (!target.attack >= 300) return
				avoid(target)

			}
		}

		// kite(target)

		if (is_in_range(target)) change_target(target)

		
		switch(character.ctype) {
				
			case 'mage':
				if (!member.s.energize && !is_on_cooldown('energize')) use_skill('energize')
				break
			
			case 'ranger':
				if (target.max_hp > character.attack * 3 && !is_on_cooldown('huntersmark') && character.mp >= 400) use_skill('huntersmark', target)
			if (target.max_hp >= character.attack * 1.5 && !is_on_cooldown('supershot') && character.mp >= 500) use_skill('supershot', target)
			// ! MAYBE DO <= character.attack * 2
			if (target.max_hp < character.attack * 0.7 * 3 * 2 && !is_on_cooldown('3shot')) skill3shot(mobsLow, get_nearby_entities())
				break
				
			case 'priest':
				if (target.target == character.id && target.hp > target.max_hp / 6 && target.attack >= 550) gearSwap(priTank)
				if (target.hp < target.max_hp / 6) gearSwap(priLuck)
				if (!is_on_cooldown('attack') && character.max_hp - character.hp >= character.heal) use_skill('heal', character.id)
				this.priestHealParty()
				if (!is_on_cooldown('darkblessing') && character.mp > G.skills.darkblessing.mp) use_skill('darkblessing')
				if (character.hp >= character.max_hp * 0.6 && is_friendly(target.target) && target.target != character.name && !mobsGroup.includes(target.name) && !is_on_cooldown('absorb') && character.mp > G.skills.absorb.mp) use_skill('absorb', target.target)
				if (character.hp >= character.max_hp * 0.6 && !is_on_cooldown('curse') && character.mp > G.skills.curse.mp) use_skill('curse', target)
				break
			
			case 'rogue':
				if (!is_on_cooldown('invis')) use_skill('invis')
				if (!is_on_cooldown('attack')) attack(target)
				this.party_buff('rspeed', currentGroup)
				if (!is_on_cooldown('quickstab') && character.mp > G.skills.quickstab.mp) use_skill('quickstab', target)

				break
			
			case 'warrior':
				let war2h = ['scythe', 'axe',] // list of 2h weapons
				let wepType = (hand) => { return G.items[character.slots[hand].name].wtype } // checks weapon type
				
				if (!is_on_cooldown('charge')) use_skill('charge')
				if (war2h.includes(wepType('mainhand')) && !is_on_cooldown('cleave')&& target.attack <= 500 && character.mp >= G.skills.cleave.mp) use_skill('cleave').then(send_cm('prayerBeads', {cmd: 'absorb'}))
				
				if (!G.events.hasOwnProperty(this.current_action) && character.esize >= 2) {
					let bataxe = locate_item('bataxe')
					let scythe = locate_item('scythe')
					let fireblade = locate_item('fireblade')
					let ololipop = locate_item('ololipop')
					if (!is_on_cooldown('cleave') && character.mp >= G.skills.cleave.mp) {
						if (!war2h.includes(wepType('mainhand'))) {
							unequip('offhand')
							if (!character.items[scythe].l) break
							equip(scythe, 'mainhand')
							// doWeaponEquip(bataxe)
						}
					} else {
						if (war2h.includes(wepType('mainhand'))) {
							// doWeaponEquip(fireblade, 'mainhand')
							// doWeaponEquip(ololipop, 'offhand')
							if (!character.items[fireblade].l) break
							if (!character.items[ololipop].l) break

							equip(locate_item('fireblade'), 'mainhand')
							equip(locate_item('ololipop'), 'offhand')
						}
					}
				}
				break
				
		}


		if (!is_on_cooldown('attack')) {
			if (character.ctype == 'priest' && character.max_hp - character.hp >= character.heal * 0.8) use_skill('heal', character.id)
			attack(target)
		}
		if (mobsMed.includes(target.mtype) && target.target == character.name) {
			if (character.name == 'prayerBeads') goToTopLeft(target.id)
			if (!get_player('prayerBeads')) goToTopLeft(target.id)
		}

		// if (!is_on_cooldown('3shot')) skill3shot(mobsLow, get_nearby_entities());
	}


	priestHealParty() {
		if (character.ctype != 'priest') return
		if (is_on_cooldown('partyheal')) return
		if (character.mp < G.skills.partyheal.mp) return

		let missing_hp = get_party_missing_hp() // {total: x, player1: y, ...}
		if (missing_hp.length <= 2) return

		let arr = Object.values(missing_hp); // [x, y, ...]
		arr.shift() // remove total

		let heal = G.skills.partyheal.output

		let length = missing_hp.length - 1
		let min = Math.min(...arr);
		let max = Math.max(...arr);
		let avg = missing_hp.total / length

		// heal lowest toon if missing >= 1000
		if (max >= 1000) {
			let max_toon = getKeyByValue(missing_hp, max)
			use_skill('heal', max_toon)
		}

		// party heal if avg is > heal-100 and 1 toon isn't too hurt
		if (avg >= heal - 100 && max - min <= 1000) use_skill('partyheal')
		// TODO: account for toons between max & min
	}

	manage_item_bounty() {
		if (!this.itemBounty) return
		if (item_quantity(this.itemBounty) >= this.itemBountyQty) {
			this.clear_current_action()
			this.itemBountyQty = false
			this.itemBounty = false
		}
	}

	party_buff(skill, currentGroup){
		let party = currentGroup ?? parent.party
			for (let member of party) {
				if (!get_player(member)) continue
				member = get_player(member)
				// TODO: if (G.skills?.mp) have enough, do skill
				// TODO: or something that checks for G.skills.mp
				let mpCost = G.skills[skill].mp
				if (mpCost && character.mp < mpCost) continue
				if (!member.s[skill] && !is_on_cooldown(skill)) use_skill(skill, member.id)
			}
		}
		//}
  
	async sequence() {
		this.handle_death()

		if (character.rip) return;
		
		handle_party()
		orbSwap()
		// if (!this.current_action || this.current_action && !mobsGroup.includes(this.current_action)) getLuck()
		this.drink()
		this.manage_item_bounty
		//this.handleMonsterHunt();
		this.manage_idle()
		this.manage_inv()
		// this.manage_task()
		this.manage_healing()
		//this.manage_buffs()
		// await this.wabbitHunt()
		this.manage_combat()
		this.fixStuck();
		this.serverEventEnd()
		this.serverEvents()
		this.serverMiniEvents()
	}

  
	async loop() {
	  this.sequence()
		  
	  // loop timeout
	  setTimeout(() => {
		this.loop()
	  }, 200);
	};
  }
  
let char = new Farmer;
char.loop();

character.on("cm", async (m) => {
	if (!is_friendly(m.name)) return
	let data = m.message

	if (!data.cmd) return;

	if (data.cmd == 'move') {
		char.clear_current_action()
		if (data.loc){
			smart_move(data.loc)
			return
		}
		smart_move(myFarmLocation)
	}

	switch (data.cmd) {
		case 'clear':
			switch (character.ctype) {
				case 'merchant':
					merchantBot.clear_current_action()
					break
				default:
					char.clear_current_action()
					break
			}
			break
		
		case 'farm':
			if (character.ctype == merchant) break
			if (char.current_action && mobsGroup.includes(char.current_action)) break
			if (!data.mob) break
			let mobLoc = mobLocationDict[data.mob].loc ?? data.mob
			char.clear_current_action()
			char.set_current_action(data.mob)
			log(data.mob)
			if (!smart.moving) await smart_move(mobLoc)
			break
	}
})


function avoid(target) {
	let mtype = target.mtype
	let nearest = get_nearest_monster({ type: mtype })
	if (target.target) return
	if (character.moving||smart.moving) return
	if (distance(character, nearest) < target.range) {
		moveInCircle(nearest, 90)
		return
	}
}



function item_quantity(name)
{
	let itemCount = 0
	for(var i=0;i<42;i++)
	{
		if(character.items[i] && character.items[i].name==name) itemCount += character.items[i].q||0;
	}
	return itemCount;
}

function death_return(location){
		if (character.rip || is_moving(character)||smart.moving) return;
	log('death return move')	
	smart_move(location)
	}



function toMerch(){
	if (!is_in_range(get_player(merchant))) return;
	for (let i = 0; i < 9; i++) {
		let item = "egg"
		i = i.toString()
		let itemName=item+i
		if(!locate_item(itemName)) return false;
		let itemLoc = locate_item(itemName)
		send_item(merchant, itemLoc, character.items[itemLoc]['q']);
	}
	for (let i = 5; i<42; i++) {
		if (!character.items[i]) continue;
		send_item(merchant, i, character.items[i]['q']);
	}return;
}

function get_party_missing_hp() {
	// returns [{character.name: missing_hp}, ...]
	let party_hp = {total: 0}
	if (character.party) {
		for (let member in parent.party) {
			if (!get_player(member)) continue
			let toon = get_player(member)
			let missing_hp = toon.max_hp - toon.hp
			if (missing_hp == 0) continue
			party_hp[member] = missing_hp
			party_hp.total += missing_hp
		}
	}
	return party_hp
}

function who_to_heal() {
	hp_array = this.get_party_missing_hp()
	if (hp_array.length == 0) return false
}

function sendTarget(){
	if (!target) return
	for (let member of partyMembers) {
		if (get_player(member)) send_cm(member, { cmd:'target', id: target.id })
	}
}


function getCompanionTarget(companionName) {
	if (smart.moving) return

	let companionChar = get_player(companionName)
	if (!companionChar) return false

	let companionTarget = companionChar.target
	if (!companionTarget) return false
	
	let companionMonster = get_monster(companionTarget)
	if (!companionMonster || companionMonster.rip || companionMonster.dead) return false

	return companionMonster
}

function goToTarget(target) {
	if (!target) return
	// not in range, or we are moving - skip
	if(is_in_range(target)) return
	if(character.moving || smart.moving) return
	
	// Walk half the distance
	xmove(
		character.x+(target.x-character.x)/2,
		character.y+(target.y-character.y)/2
		);
}

function combatDistancing(target) {
	if (target) {
		// if turret, don't poke
		// ! TODO: fix having to list each ctype below
		if (mobLocationDict.hasOwnProperty(target.mtype) && 
		mobLocationDict[target.mtype].turret && 
		(character.ctype == 'mage' || character.ctype == 'priest' || character.ctype == 'ranger')) {
			
			return
		}

		// can't kill in 2 hits, 1/4 range or closer -> move away
		if (target.hp > character.attack * 2 && distanceToTarget(target) <= character.range * 0.25) {
			// TODO: poking ( CREATE LINE AND MOVE 1/4 character.range DOWN LINE )
			// xmove(
			// 	character.x + (target.x - character.x) * 1.05,
			// 	character.y + (target.y - character.y) * 1.05
			// );
		}
		
		if (!is_in_range(target)) {
			// TODO: move into 3/4 character.range
			xmove(
				character.x + (target.x - character.x) / 2,
				character.y + (target.y - character.y) / 2
			);
		}

	}
}

function distanceToTarget(target){
	let dist;
	if (target) dist = distance(character,target)
	return dist
}


// returns true if item is in character.items
function isInItems(itemSlot) {
	if (itemSlot > -1) return true
	return false
}

// equip if passes checks
function equipFromItems(itemName, invSlot, gearSlotName) {
	let equippedItem = character.slots[gearSlotName]
	if ( isInItems( invSlot ) && ( !equippedItem || equippedItem.name != itemName ) ) equip(invSlot)
}

// get eq gear type/slot from item name
function getGearType(itemName) {
	if (!G.items[itemName]) return false
	return G.items[itemName].type
}

// type: name,		e.g. {'helmet': 'phelmet', etc}
function populateGearDict(loadout) {
	gearDict = {}
	for (let itemName of loadout) {
		let slotType = getGearType(itemName)
		if (!slotType) continue
		gearDict[slotType] = itemName
	}
	return gearDict
}

function gearSwap(loadout) {
	// { helmet : 'phelmet' , chest:...}
	if (lastGearSwap && new Date() - lastGearSwap < 1000) return
	gearDict = populateGearDict(loadout)

	for (let gearSlot in gearDict) {
		let itemName = gearDict[gearSlot]
		if (!itemName) continue
		let itemSlot = locate_item(itemName)
		if (itemSlot < 0) continue
		equipFromItems(itemName, itemSlot, gearSlot)
	}
	lastGearSwap = new Date()
}


function doWeaponEquip(itemName, hand = 'mainhand') {
	let itemSlot = locate_item(itemName)
	if (character.items[itemSlot].name != itemName)itemSlot = locate_item(itemName)
	equip(itemSlot, hand)
}


function getTargetSpawnBorder(mtype, map = false) {
    // get a target monster and return the spawn border
	if (map) map = G.maps[map]
    if (!map) map = G.maps[character.map] ?? G.maps[character.in];
    // iterate through the monsters
    for (let monster of map.monsters) {
        // if it's of our target type
        if (monster.type == mtype) {

			// TODO: simple? trig to find other 2 ends + some 'if unreachable' logic
            let topLeft = [monster.boundary[0], monster.boundary[1]]
            let bottomRight = [monster.boundary[2], monster.boundary[3]]

            return [topLeft, bottomRight]
        }
    }
}

function coordDifference(coord1, coord2) {
	return Math.abs(coord1 - coord2)
}

function isNearArea(loc_coords, char_coords) {
	const loc_x = Math.abs(loc_coords[0])
	const loc_y = Math.abs(loc_coords[1])
	const char_x = Math.abs(char_coords[0])
	const char_y = Math.abs(char_coords[1])

	const differenceX = coordDifference(loc_x, char_x)
	const differenceY = coordDifference(loc_y, char_y)

	if (differenceX >= 5 || differenceY >= 5) return false
	
	return true
}

function goToTopLeft(monsterID) {
	let spawnBorder = getTargetSpawnBorder(parent.entities[monsterID].mtype)
	let topLeft = spawnBorder[0]

	let border_coords = [topLeft[0], topLeft[1]]
	let char_coords = [character.x, character.y]

	if (!isNearArea(border_coords, char_coords)) xmove(topLeft[0], topLeft[1])
}

function hasLuck(){
	if (!character.s.mluck || character.s.mluck.f != merchant) return false
	return true
}

// let spawnBorder = getTargetSpawnBorder(target)
// let topLeft = spawnBorder[0]

// if ( (target.hp < target.max_hp) && character.x !== topLeft[0] ) {
// 	xmove(topLeft[0], topLeft[1])
// }

async function gooseChase(map, goose) {
	if (character.map != map && !smart.moving) await smart_move(map)
	await doChase(map, goose)
}

async function doChase(map, goose) {
	for (let monsterData of map.monsters) {
		let bottomRight = [monsterData.boundary[1], monsterData.boundary[2]]
		
		if (!smart.moving) await smart_move(bottomRight)
		let found_goose = get_nearest_monster({type:goose})
		if (!found_goose) continue
		break
	}
	// if (!parent.S[goose].live) clear_current_action()
}

function getKeyByValue(object, value) {
	return Object.keys(object).find(key => object[key] === value);
  }