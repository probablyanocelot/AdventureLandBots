let loadout = new Object;


function updateLoadout() {
    loadout[character.id] = loadout[character.id] || {};
    // loadout is self or {} if undefined -- prevents wipe

    transcribe(character.slots, loadout[character.id])
}


function transcribe(fromDataStructure, toDataStructure) {
    for (child in fromDataStructure) {
        toDataStructure[child] = fromDataStructure[child]
    }
}


let bankDict = new Object;


async function updateBank(){
	if (!character.bank) return
	// must be in bank
	bankDict = {}
	transcribe(character.bank, bankDict)
}

async function searchBank(itemName) {
	for (let container in bankDict) {
		// log(bankDict[container])
		for (let slot in bankDict[container]) {
			// if (!Object.hasOwn(bankDict[container][slot], itemName)) continue
			// log(`${container} has itemName`)
			let itemContainerIndex = bankDict[container][slot].map(function(item) { return item.name; }).indexOf(itemName);
			log(itemContainerIndex)
		}
		// bank_retrieve(container,)
	}
}


let bankItemDict = new Object;


// !ACCOUNT FOR ACHIEVEMENTS, OTHER MODIFIERS LATER!
async function populateBankItemDict() {


		// "intamulet": {
		// 	"1": [
		// 		{
		// 			"slot": "19",
		// 			"container": "items0"
		// 		},
		// 		{
		// 			"slot": "30",
		// 			"container": "items7"
		// 		}
		// 	],
		// 	"3": [
		// 		{
		// 			"slot": "0",
		// 			"container": "items0"
		// 		},
		// 		{
		// 			"slot": "1",
		// 			"container": "items0"
		// 		}
		// 		]
		// },
	


	bankItemDict = {}
	for (let container in bankDict) {

		for (let slot in bankDict[container]) {

			// { name: 'item', level: 0 }
			let item = bankDict[container][slot]
			if (!item) continue;
						

            let itemName = item.name
            let itemQty = item.q
			let itemLevel = item.level
            
            
            if (itemQty) {
                bankItemDict[itemName] = bankItemDict[itemName] || []
                bankItemDict[itemName].push({ q: itemQty, slot: slot, container: container, })
            }
			if (itemLevel >= 0) {
				
                bankItemDict[itemName] = bankItemDict[itemName] || {}
				bankItemDict[itemName][itemLevel] = bankItemDict[itemName][itemLevel] || []
				
				// TODO: check for achievements, other modifiers
				// check for shiny
                if (item.p) bankItemDict[itemName][itemLevel].push({ slot: slot, container: container, p: item.p, })
				if (!item.p) bankItemDict[itemName][itemLevel].push({ slot: slot, container: container, })
				
            }
		}
	}
}

let bankCompoundDict = new Object;

async function populateBankCompoundDict() {
	
    for (let itemName in bankItemDict) {
		if (!G.items[itemName].compound) continue; 

		bankCompoundDict[itemName] = bankItemDict[itemName]
	}
}

async function getCompoundables() {
	// TODO: let someVar = new Date;  if it's been too long -> go to bank & refresh
	if (character.bank) {
		await updateBank()
		await populateBankItemDict()
		await populateBankCompoundDict()
		await checkBankCompound()
	}

}


async function bankHanoi(array){
	// if we have anough to upgrade, grab them
	if (array && array.length >= 3) {
         
		// !FIX BELOW, PULLING 5x +2 vitring - SHOULD PULL 6 
		let iterations = (array.length/3+1) +1
		
		 //TODO: Hanoi
		 for (let i = 0; i < iterations; i ++) { // Math.floor(array.length / 3)

			// if (i == 2 &&)
			let item = array[i]
			let container = item.container
			let slot = item.slot
			// console.log(item.container)
			bank_retrieve(container, slot)
		 }
	}
}


async function checkBankCompound() {
	for (let itemName in bankCompoundDict) {
		
		// if empty, can't do anything. --- maybe use this to trigger
		// 		smart_move('bank') -> getCompoundables()
		if (!itemName) return
		//log('didnt return')
        
		let level0 = bankCompoundDict[itemName][0]
		let level1 = bankCompoundDict[itemName][1]
		let level2 = bankCompoundDict[itemName][2]
        let level3 = bankCompoundDict[itemName][3]
		
		arrays = [ level0, level1, level2, level3 ] //level3
		
		for (let array of arrays) {
			// TODO: some whitelist.includes()/.hasOwnProperty()
			if (noUp['2'].includes(itemName) && array == level2) continue
				await bankHanoi(array)
		}

    }
}


function getKeyByValue(object, value) {
	return Object.keys(object).find(key => object[key] === value);
}


function hasProp(container, propStr) {
	for (let idx in container) {
		let item = container[idx]
		if (!item) continue;
		let itemName = item.name
		let itemInfo = G.items[itemName]

		if (itemInfo.hasOwnProperty(propStr)) log(`${itemName} has ${propStr}`)
		// const hasProperty = (propStr) => { if (itemInfo.hasOwnProperty(propStr)) log(`${itemName} has ${propStr}`) }
		// hasProperty('e')
	}
}


function exampleFindDuplicate() {
	let array = [{ "name": "Steven Smith", "Country": "England", "Age": 35 }, { "name": "Hannah Reed", "Country": "Scottland", "Age": 23 }, { "name": "Steven Smith", "Country": "England", "Age": 35 }, { "name": "Robert Landley", "Country": "England", "Age": 84 }, { "name": "Steven Smith", "Country": "England", "Age": 35 }, { "name": "Robert Landley", "Country": "England", "Age": 84 }]

	let result = Object.values(array.reduce((c, v) => {
		let k = v.name + '-' + v.Age;
		c[k] = c[k] || [];
		log(c)
		c[k].push(v);
		return c;
	}, {})).reduce((c, v) => v.length > 1 ? c.concat(v) : c, []);

	console.log(result);
}

function orbSwap() {
	let jacko = locate_item('jacko') 
	if (jacko > -1 && smart.moving) {
		if (!character.slots.orb || !character.slots.orb.name == 'jacko') equip(jacko)
	}
}