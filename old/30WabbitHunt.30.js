game.on("event",async (data) => {
	if(data.name=="wabbit")
	{
		// show_json(data)
		// let map = data.map
        await gooseChase(data.map, data.name)
		// Data includes only the "map"
		// It's up to you to visit all the possible monster spawns
	}
});

async function gooseChase(map, goose) {
    if (character.map != map) await smart_move(map)
    await doChase(map, goose)
}

async function doChase(map, goose) {
    for (let monsterData of map.monsters) {
        let bottomRight = [monsterData.boundary[1], monsterData.boundary[2]]
        await smart_move(bottomRight)
        let found_goose = get_nearest_monster({type:goose})
        if (!found_goose) continue
        break
	}
	// if (!parent.S[goose].live) clear_current_action()
}
// auto_craft("basketofeggs");

// character.s.easterluck <- is the buff