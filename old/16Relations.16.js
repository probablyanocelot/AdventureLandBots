log("16 - cm.16.js")
load_code('23Dicts')
load_code('24Traversal')

// TODO better memo-ize
let last_cm;

function doCm(botName, message) {
      if (last_cm == null || new Date() - last_cm >= 5000) {
        send_cm(botName, message)
        last_cm = new Date();
    }
}


function group_cm(botlist, my_code, excludeArray) {
	if (excludeArray) {
		// filters array1 vs array2, returns uniques in array1
		let includeArray = botlist.filter(function (e) {
			return excludeArray.indexOf(e) == -1;
		});
		botlist = includeArray
	}

    for (let bot in botlist) {
		if (bot == character.id) continue;
        send_cm(botlist[bot], my_code)
    }
}


function get_item(fromChar, itemName, qty) {
	send_cm(fromChar, { cmd: 'get_item', item: itemName, qty: qty ?? 1 })	
}

function set_farm(mob, excludeArray) {
	// TODO: have better party storage?
	if (!character.party) return

	// current party
	let botlist = Object.keys(parent.party)
	
	group_cm(botlist, {cmd: 'farm', mob: mob}, excludeArray)
}

character.on("cm", async (m) => {
	if (character.ctype != 'merchant') log(m.message)

	// Make sure the message is from a trusted character
	if (!is_friendly(m.name)) {
		log(`UNAUTHORIZED CM ATTEMPT: ${m.name}`)
		return
	}	
	
	let data = m.message
	
	// if (data.cmd != 'unpack') log(data);  // Do something with the message!
	if (!data.cmd) return;
	log(`${m.name} requesting ${data.cmd}`)
	switch (data.cmd) {
		
		// case 'move':
		// 	if (character.ctype != 'merchant') char.clear_current_action()
		// 	// if (character.ctype == 'merchant') merchantBot.clear_current_action()
		// 	if (!data.loc) {
		// 		if (character.ctype != 'merchant') smart_move(myFarmDefault)
		// 		break;
		// 	}
			// if (smart.moving) return
			// smart_move(data.loc)
			// if(!data.cmd2) break
			// switch (data.cmd2) {
			// 	case 'send_equip':
			// 		send_item(m.name, data.data.idx)
			// 		send_cm(m.name, {cmd: 'sent_equip', item: data.data.name, level: data.data.level})
			// }
			// break;
				
		
		// ! what if sending +3 item and +0 item in character.items?
		// TODO: data.item.name, data.item.level 
		case 'get_item':
			let itemToSend = locate_item(data.item)
			if (itemToSend < 0) break
			send_item(m.name, itemToSend, data.qty ?? 1)
			break
		
		case 'absorb':
			if (character.ctype != 'priest') break
			use_skill('absorb', m.name)
			break

		case 'sent_equip':
			let itemReceived = locate_items(data.item, data.level)[0]
			if (!itemReceived) break
			equip(itemReceived)
			break
		
		case 'equip':
			let equipItem = locate_items(data.item, data.level)[0]
			if (!equipItem) break
			equip(equipItem)
			break
		
		case 'get_loc':
			savePosition()
			let myLoc = getPosition(character.name)
			if (data.cmd2) {
				doCm(m.name, {cmd:'move', loc:myLoc, cmd2: data.cmd2, data: data.data})
				break
			}
			doCm(m.name, {cmd:'move', loc:myLoc})
			break
		
		case 'unpack':

			// only merch unpack
			if (character.ctype != 'merchant' || merchantBot.current_action && merchantBot.current_action != 'exchange') break;

			if (merchantBot.current_action != 'banking') merchantBot.set_current_action('unpacking')

			// get pots if we need them
			if (data.pots) await merchantBot.get_pots(data.pots);
						
			// set limiters
			// merchantBot.thinking = true
			if (merchantBot.current_action != 'unpacking') merchantBot.set_current_action('unpacking')

			// go to farmer
			await smart_move(data.loc)
			log('should be there')

			// TODO: own function

			if (!smart.moving) {
				if (!character.x == data.loc.x && !character.y == data.loc.y) {
					if (!get_player(m.name)) doCm({ cmd: 'get_loc' })
				}
			}

			// let farmers know the truck is here
			if (is_in_range(get_player(m.name))) {
				send_cm(m.name, { cmd: 'arrived' })
			} else {
				await smart_move(get_player(m.name).x, get_player(m.name).y)
				send_cm(m.name, { cmd: 'arrived' })
				merchantBot.clear_current_action()
			}
			
			if (data.pots) {
				let hpotSize = data.pots.h.type
				let hpotQty = data.pots.h.qty
				let mpotSize = data.pots.m.type
				let mpotQty = data.pots.m.qty

				// share some drinks with the farmers
				if (quantity(hpotSize) > 0) send_item(m.name, locate_item(hpotSize), hpotQty)
				if (quantity(mpotSize) > 0) send_item(m.name, locate_item(mpotSize), mpotQty)
			}

			// clear limiters - maybe clear them on done_unpack instead?
			// merchantBot.thinking = false
			merchantBot.current_action = false
			break;
		
		case 'arrived':
			if (!is_in_range(get_player(m.name))) await smart_move(get_player(m.name).x, get_player(m.name).y);

			if (!character.slots.elixir) get_item(merchant, 'elixirluck')

			if (character.gold > farmerReserve) send_gold(merchant, character.gold - farmerReserve)

			for (let itemIndex in character.items) {
				if (!character.items[itemIndex]) continue;
				let item = character.items[itemIndex]
				if (item.l) continue
				// if (priTank.includes(item.name) || priLuck.includes(item.name))
				if (!sell_dict['farmer_keep'].includes(item.name))send_item(m.name, itemIndex, 9999)
			}
			if (char) {
				if (char.current_action == 'unpacking') char.clear_current_action()
			}

			send_cm(m.name, { cmd: 'done_unpack'})
			break;
		
		case 'done_unpack':
			if (character.ctype != 'merchant') break;
			use_skill('mluck', m.name)
			merchantBot.bank()
			break;
		
		case 'itemBounty':
			if (!data.itemBounty || !data.itemBountyQty) break;
			char.current_action = data.cmd
			char.itemBounty = data.itemBounty
			char.itemBountyQty = data.itemBountyQty
			for (let mobToFarm in itemMobDict) if (itemMobDict[mobToFarm].includes(data.itemBounty)) smart_move(mobToFarm)
			break;
		
		case "incoming":
			smart_move(getPosition(m.name)).then(() =>{
				change_target(get_player(m.name).target)
				let target = get_current_target();
				a = setInterval(rangerPVP(target), 220)
				if (target.rip || !target) clearInterval(a);
			}).catch(()=> {
				xmove(getPosition(m.name))
				change_target(get_player(m.name).target)
				let target = get_current_target();
				a = setInterval(rangerPVP(target), 220)
				if (target.rip || !target) clearInterval(a);
			})
			break;
		}
	}
)


character.on("incoming",function(data){
	if (data.damage> 50 && data.source != "mluck" && get_player(data.actor)){
		game_log("Incoming! "+data.damage+" from" + data.actor);
		savePosition();
		group_cm("incoming");
		change_target(get_player(data.actor));
		let target = get_current_target();
		let a = setInterval(rangerPVP(target), 220)
		if (!target || target.rip) clearInterval(a);		
	}
})

function rangerPVP(target) {
	if (!target || target.rip) return;
	if (is_in_range(target) && !is_on_cooldown("huntersmark") && character.mp>G.skills.huntersmark.mp) use_skill("huntersmark", target);
	if (is_in_range(data.actor) && !is_on_cooldown("supershot") && character.mp>G.skills.supershot.mp) use_skill("supershot", target);
	if (is_in_range(target)) attack(target)
}



// ############### - MERCHANT - ###############

async function send_equip(itemName, player) {

	// if not in inventory, stop
	let item_idx = locate_item(itemName)
	if (item_idx == -1) return
	
	// current solution to find best candidate
	let matches = []
	let count = 0
	let highest_level = 0;
    for (let item of character.items) {
        // console.log(item)

        if (!item) {
			count ++
			continue
		}
		if (item.name == itemName) {
            item.idx = count
            if (!item.hasOwnProperty('level')) {
                count++
                continue
            }
            if (item.hasOwnProperty('level') && item.level > highest_level) {
                highest_level = item.level
                matches.shift()
                matches.push(item)

            }
        }
        // console.log(count)
        count ++
        // console.log(count)
        

	}
	log(matches)
	send_cm(player, { cmd: 'get_loc', cmd2: 'send_equip', data:matches })
	// await smart_move(get_player(player))
	send_item(player, matches[0].idx)
	// return matches
}


function sendToMerchant() {
	if (character.ctype == 'merchant') return;
	if (!get_player(merchant)) return;
	// execute only if farmer & merchant in range
	let extraGold = character.gold - farmerReserve
	if (character.gold > farmerReserve) send_gold(merchant, extraGold)
	// send extra gold to merch
	for (let idx in character.items) {
		let item = character.items[idx]
		if (!item) continue;
		if (sell_dict['farmer_keep'].includes(item.name)) continue;
		if (item.p || sell_dict['toMerch'].includes(item.name) || item.q) send_item(merchant, idx, 9999)
		// shiny / toMerch whitelisted / stackable : send
	}
}

function request_merchant() {
	doCm(MERCHANT_NAME, {cmd:'call',loc:current_location()})
}

function send_to_merchant(start, end) {
	for (var i = start; i < end; i++)
		if (character.items[i])
			send_item(MERCHANT_NAME, i)
}

function almost_all(start, end) {
	for (var i = start; i < end; i++) {
		send_item(MERCHANT_NAME, i, character.items[i]["q"]-1)
	}
}

let full_pack = () => {
	return character.esize <= FULL_INVENTORY_THRESHOLD;
}



function current_location() {
	return {
        server: {
            region: server.region,
            id: server.id
        },
        time: new Date().toISOString(),
        in: character.in,
        map: character.map,
        x: character.x,
        y: character.y
    }
}


async function doUnpack(data, name) {
	// maybe bank first?
	log('unpack1')
		
	if (data.pots) await merchantBot.get_pots(data.pots);
	
	// only merch unpack
	if (character.ctype != 'merchant' || merchantBot.current_action) return;
	
	// set limiters
	merchantBot.thinking = true
	merchantBot.set_current_action('unpacking')


	smart_move(data.loc)
		.then(() => {
			log('should be there')
			// let farmers know the truck is here
			if (is_in_range(get_player(m.name))) send_cm(name, { cmd: 'arrived' })
			if (data.pots) {
				let hpotSize = pots.h.type
				let hpotQty = pots.h.qty
				let mpotSize = pots.m.type
				let mpotQty = pots.m.qty

				// share some drinks with the farmers
				send_item(m.name, locate_item(hpotSize), hpotQty)
				send_item(m.name, locate_item(mpotSize), mpotQty)
			}

			// clear limiters - maybe clear them on done_unpack instead?
			merchantBot.thinking = false
			merchantBot.clear_current_action()
					
		})
	return;			
}
