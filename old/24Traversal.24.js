function getPosition(id) {
    if(parent.entities[id]) return parent.entities[id]
    return get(`${id}_position`) ?? undefined
}

function savePosition() {
    return set(`${character.id}_position`, {
        server: {
            region: server.region,
            id: server.id
        },
        time: new Date().toISOString(),
        in: character.in,
        map: character.map,
        x: character.x,
        y: character.y
    })
}

function moveInCircle(center, radius = 30, angle = Math.PI / 2) { //\
    if (can_move_to(center.x, center.y)) {
        const angleFromCenterToCurrent = Math.atan2(character.y - center.y, character.x - center.x)
        const endGoalAngle = angleFromCenterToCurrent + angle
        const endGoal = { x: center.x + radius * Math.cos(endGoalAngle), y: center.y + radius * Math.sin(endGoalAngle) }
        move(endGoal.x, endGoal.y)
    }  else {
        // Move to where we want to start walking in a circle
        xmove(center)
    }
}

function backToTheFarm() {
	if (!farmDefault[character.name].x == character.x && !farmDefault[character.name].y == character.y) {
		smart_move(farmDefault[character.name])
			.then(this.set_current_action('farming'))
	}
	log('BACK TO THE FARM!')
	return
}
