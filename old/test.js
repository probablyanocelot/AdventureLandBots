let character_items = [
	{
		"name": "scroll1",
		"q": 10
	},
	{
		"name": "cscroll0",
		"q": 5
	},
	{
		"level": 5,
		"stat_type": "int",
		"name": "xboots"
	},
	{
		"name": "mpot1",
		"q": 4131
	},
	{
		"name": "ringsj",
		"level": 4
	},
	{
		"name": "stand0"
	},
	null,
	{
		"name": "ringsj",
		"level": 2,
		"m": "prayerBeads"
	},
	null,
	null,
	null,
	{
		"name": "pickaxe",
		"level": 5
	},
	{
		"name": "scroll0",
		"q": 10
	},
	null,
	null,
    null,
    {
		"name": "ringsj",
		"level": 4
	},
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	{
		"q": 482,
		"name": "elixirluck"
	},
	{
		"q": 5,
		"name": "offering"
	},
	{
		"q": 102,
		"name": "cscroll1"
	},
	{
		"name": "jacko",
		"level": 2
	},
	{
		"name": "jacko",
		"level": 1
	},
	{
		"name": "tracker"
	},
	null
]

async function send_equip(itemName, player) {
	// await smart_move(player)

	// if not in inventory, stop
	// let item_idx = locate_item(itemName)
	// if (item_idx == -1) return
	
	// current solution to find best candidate
	let matches = []
	let count = 0
	let highest_level = 0;
    for (let item of character_items) {
        console.log(item)

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
        console.log(count)
        count ++
        console.log(count)
        

	}
	console.log(matches)
	return matches
}

send_equip('ringsj','a')