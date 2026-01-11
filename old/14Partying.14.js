log('partying')

function getGroup(group) {
	return bots[group]
}

function getCharacter(name) {
    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (char.name == name) return char
    }
}

function startBots(group) {
	//if any iframes = may need more testing
	if (top.$("iframe")["1"]|| top.$("iframe")["2"]) return
	for (let toon of group)
	{
		if (toon == character.id || toon == merchant) continue; // || toon == "camelCase"
		start_character(toon, 5)
	}
}

function killBots(currentGroup){
	for (let i = 1; i < currentGroup.length; i++) {
		stop_character(currentGroup[i]);
	}
}

function sendInvites() {
	let activeChars = Object.keys(get_active_characters())
	for (let idx in activeChars) {
		let char = activeChars[idx];
		if ( char == character.name) continue;
		if ( parent.party.hasOwnProperty(char) ) continue

		// if pri & rogue, group together.
		// need to add logic to party all bots during event
		// if (activeChars.includes('prayerBeads') && activeChars.includes('Teef')){
		switch (character.name) {
			case 'prayerBeads':
				send_party_invite('Teef')
				break
			case 'Teef':
				send_party_invite('prayerBeads')
				break
			case 'camelCase':
				send_party_invite('VendorGuy')
				break
		}
		// }
		send_party_invite(char)
	}
}

const friendly_other_players = [
    'Diocles', 'Mommy', 'Atlus', 'Cuts', 'Pokehontas',
]

function is_friendly(char_name) {
    //check if it's one of the accounts characters
    for (char of get_characters()) {
        if (char.name === char_name) {
            return true;
        }
    }
    //see if the player is in our friendly list
    if (friendly_other_players.includes(char_name)) {
        return true;
    }

    return false;
}

function on_party_request(name)
{
    if(is_friendly(name))
        accept_party_request(name);
}

function on_party_invite(name){
    if(is_friendly(name))
        accept_party_invite(name);
}

function handle_party() {
	// if we are not in party && we are group leader
	if (character.name == currentGroup[0]) {
		// send out invites
		if (Object.keys(parent.party).length < currentGroup.length) {
			for (let player of currentGroup) {
				// send invite to non-main characters
				if (player != character.id) send_party_invite(player)
			}
		}
	}
	if (character.party && character.party != currentGroup[0]) {
		// we are in the wrong party and need to leave current party
		leave_party();
	}
}

function getParentsOfCharacters(excludeSelf = true) {
    const parents = []

    for (const iframe of top.$("iframe")) {
        const mychar = iframe.contentWindow.character
        if (!mychar) continue // Character isn't loaded yet
        if (excludeSelf && mychar.name == character.name) continue
        if (!mychar.controller) {
            parents.push(top)
        } else {
            parents.push(iframe.contentWindow)
        }
    }

    return parents
}


function parentTargetting() {
    for (const eParent of getParentsOfCharacters(false)) {
        const eTarget = eParent.character.target;
        log (eParent.character.id)
        const eTargetName = eTarget ? eParent.entities[eTarget].mtype : null;
        log(`${eParent.character.name} targetting ${eTargetName}`)

        if (eTargetName == "Phoenix") {
            // TODO: the following c[name] and c.name have to be changed
            //smart_move(getCharacter(c[name]));
            //game_log("Indo ate posicao de " + c.name);
        }
    }
}

function isLeader() {
    log(getParentsOfCharacters(false)[0].character.name)
    if (getParentsOfCharacters(false)[0].character.name != character.id) {
        log("I'm not the leader")
        return false
        }
    log("I'm the leader")
    return true
}