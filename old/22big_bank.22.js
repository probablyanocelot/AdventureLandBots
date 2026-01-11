let compoundList = [
	'intamulet', 'intring', 'intbelt', 'intearing',
	'strring', 'strearring', 'stramulet', 'strbelt',
	'dexamulet', 'dexring', 'dexbelt', 'dexearring',
	'skullamulet', 'book0', 'hpamulet', 'hpbelt', 'ringsj',
]

let invMemo = {};
let bankMemo = {};


function populateStorageDict(filterList, memoDict, container){
	
	for (let item of container){
		
		// no item in slot, or not in list : continue
		if (!item) continue
		if (!filterList.includes(item.name)) continue
		
		let itemName = item.name
		let itemLevel = item.level
		
		// if no 2nd layer of array, make one
		if (!memoDict[itemName]) memoDict[itemName] = {}
		// if array[item][itemLevel] null, set to 1. else, add 1 to current
		memoDict[itemName][itemLevel] = memoDict[itemName][itemLevel] ? memoDict[itemName][itemLevel] + 1 : 1;

		// quantity
		if(item.q) memoDict[itemName]['q'] = item.q
	}
	
	log(memoDict)
//	log(`counts object: ${counts}`)
	
}

// if (character.bank) {
// 	for (let bankStorage in character.bank) {
// 		let container = character.bank[bankStorage]
// 		populateStorageDict(compoundList, bankMemo, container)
// 	}
// }


// ! populateStorageDict(compoundList, invMemo, character.items)

function canCombine() {
	
	for (let itemName of compoundList){
		for (let itemLevel of invMemo[item]) {
			
			let invAmount = compoundList[item][itemLevel]
			let bankAmount = bankMemo[item][itemLevel]
			
			log(`item invAmount: ${invAmount}`)
			log(`item bankAmount: ${bankAmount}`)

			if (invAmount / 3 < 1 && invAmount + bankAmount > 3) {
				bank_retrieve()
				//LET'S FIND MORE INCLUSIVE SOLUTION FOR LINE ABOVE
				//get from bank 
				return
			}
		}
	}
}


function populateBankDict(bankMemo) {
	if (!character.bank) return;

	// each bank storage
	for (let containerIndex = 0; containerIndex < character.bank.length(); containerIndex++) {
		
		log(containerIndex)

		let container = character.bank[containerIndex]

		let containerName = `items${containerIndex}`

		bankMemo[containerName] = {};

		populateStorageDict(filterList, bankMemo, container)

		// for (let item of container) {
		// 	log(item)

		// 	let itemName = item.name
		// 	let itemLevel = item.level

		// }

	}
	log(bankMemo)
}