
function get_nearby_entities() {
	let entities = []
	for (const id in parent.entities) {
		const entity = parent.entities[id]
		if (!entity.mtype) continue // Not a monster

		if (!is_in_range(entity)) continue;

		if (!entity.target == character.id) continue
		
		// TODO: Add filters to exclude entities you don't want

		if (mobsLow.includes(entity.mtype) || mobsMed.includes(entity.mtype)) entities.push(entity);
	}
	return entities;
}


function focus(entities){
	// TODO: add more priority checks
	entities.sort((a, b) => {
		// Example: Prioritize those targeting you
		if (a.target == character.id && b.target !== character.id) return -1
		if (b.target == character.id && a.target !== character.id) return 1

		// Example: Prioritize lower hp entities
		if (a.hp !== b.hp) return a.hp - b.hp

		// No difference in priority
		return 0
	})

	if (entities.length > 0) return entities[0]
}



// 3 SHOT
let last_use_3shot = 0;
function skill3shot(mobWhiteList=false, targets, manaReserve = 0.3) {
	
    if(character.ctype !== "ranger") return
    if(is_on_cooldown("attack")) return 
	//if(Date.now() - last_use_3shot >= 1000) return // We don't want to 3shot too often
	//if(targets.length < 2) return // Not enough targets to 3shot
    
    // Remove all targets out of range
    const inRangeTargets = []
    for(let target of targets) {
        if (get_monster(target)){
			target = get_monster(target)
		}
		if (!is_in_range(target)) continue; //)||target.ctype) continue // Out of range or is character
		
		// !REMOVE if TO ATTACK ANY
		if (!mobWhiteList) continue
        if(mobWhiteList.includes(target.mtype)) inRangeTargets.push(target)
    }
    
	if (inRangeTargets.length < 1) return // Not enough targets to 3shot
	if (inRangeTargets.length === 1) attack(inRangeTargets[0])
    if(manaReserve > (character.mp / character.max_mp)) return // We are low on mana, don't use 3shot
    // log("3 SHOT")
    use_skill("3shot", inRangeTargets).then(last_use_3shot = Date.now())
}
// 3 SHOT

function pallySkills(target) {
	if (!character.s.mshield) use_skill('mshield')
	if (!target) return
	if (target.hp < 2000 && !is_on_cooldown('purify')) use_skill('purify', target)
	// if (target.hp < character.attack * G.skills.smash.damage_multiplier && !is_on_cooldown('smash')) use_skill('smash', target)
	// if(!is_on_cooldown('smash') && target.hp == target.max_hp) use_skill('smash', target)
	if(!is_on_cooldown('smash') && target.hp > character.attack) use_skill('smash', target)
}