performance_trick()

function do_skill(skill, target) {
    if (!is_on_cooldown(skill) && character.mp >= G.skills[skill].mp) {
      use_skill(skill, target).then(s => {return}, f=>{return});
    }
  }


function manage_combat_skills(target) {
    if(!target) return;
    switch (character.ctype) {
      case "paladin":
        if (target.hp < G.skills.purify.damage) do_skill("purify", target);
        if (target.hp <= 700 * .36) do_skill("smash", target);
    }
  }


function is_friendly(char_name) {
  
  //check if it's one of the accounts characters
  for(char of get_characters()){
      if(char.name === char_name){
          return true;
      }
  }

  return false;

}


character.on("cm", function (data) {

  if (!is_friendly(data.name)) return;

  log(data);
})


const desired_potion_count = 500;
const desired_mp_pot = "mpot1"
const desired_hp_pot = "hpot1"


let whitelist_keep = ['hpot0', 'hpot1', 'mpot0', 'mpot1', 'tracker',]
let whitelist_sell = ['wattire', 'wbreeches', 'what', 'wgloves', 'wshoes']


class Character {  

  constructor() {
    // this.sell_items = this.sell_items.bind(this);

    // states
    this.action;
    this.pvp;
    this.thinking;
    this.current_action;
    this.idle_counter;

    // timing
    this.last_cm;
    this.last_respawn;
    this.last_use_potion;
    this.last_use_mp_potion;
    this.last_use_hp_potion;

    // combat
    this.target;
    this.mon_type = 'cgoo';
  
  }
  

  handle_death() {
    if (character.rip) {
      if (this.last_respawn == null || new Date() - this.last_respawn >= 10000) {
        respawn();
        this.last_respawn = new Date();
      }
    }
  }


  // use as limiter - if you have action; don't do anything else
  manage_task() {
    if (!this.action) {
      this.action = "idle"
    }
  }


  dry() {
    // checks to see if we're out of weed
    // if no health potions, go get them
    if (quantity(desired_hp_pot) < 15) {
        return true;
    }

    // if no mana potions, go get them
    if (quantity(desired_mp_pot) < 15) {
        return true;
    }
    
    return false;
  }


  get_pot() {

    // get potions since we're out of one of them
    // determine how many we need to buy
    let HP_TO_BUY = desired_potion_count - quantity(desired_hp_pot);
    let MP_TO_BUY = desired_potion_count - quantity(desired_mp_pot);


    if (character.moving || smart.moving || this.thinking) return;
    this.thinking = true;

    // go to the nearest potion seller & buy
    smart_move("potions").then(
      success => {
        if (HP_TO_BUY > 0) buy_with_gold(desired_hp_pot, HP_TO_BUY);
        if (HP_TO_BUY > 0) buy_with_gold(desired_mp_pot, MP_TO_BUY);
        this.sell_items();
        this.thinking = false;
        return;
      },
      failure => {
        this.thinking = false;
        return;
      }
    )
  }

    
  sell_items() {
    for (let i in character.items) {
      let slot = character.items[i];
      if (slot != null && !slot.p) {
        let item_name = slot.name;
        if (whitelist_sell.includes(item_name)) {
          sell(i, 9999);
        }
      }
    }
  }


  // if full, call merchant. if merchant, manage inv
  manage_inv() {
    if (character.esize <= 5 || this.dry()) {
      this.get_pot();
      };
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
      if (!is_on_cooldown("regen_hp") && character.hp <= character.max_hp - 400) use(locate_item(desired_hp_pot));
      if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp - 500) use(locate_item(desired_mp_pot));
    }
    if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp) use_skill("regen_mp").then(s => {return}, f=>{return});
    if (!is_on_cooldown("regen_hp") && character.hp < character.max_hp) use_skill("regen_hp").then(s => {return}, f=>{return});
  }
  

	buff(skill) {

		// do more dynamic character solution later
		let characters = ["VendorGuy", "camelCase", "cannaMace", "couplaGrapes"];
		for (let idx in characters) {
			let name = characters[idx]
			let target = get_player(name)
			if(!target) continue;
			if (!target.s.skill || target.s.skill.f !== character.name) {
				use_skill(skill, name).then(s => {return}, f=>{return})
			}
		}	
  }
  

  manage_buffs() { 
    switch (character.ctype) {
      case "paladin":
        this.buff("mshield")
    }
  }



  manage_combat() {
    if (character.ctype == "merchant") return;
    if (this.pvp) return;
    // if hit by player, focus the player & call the bois lul
    if (!this.pvp) {

      // until we have situational targets, define a target
      if (!this.mon_type) this.mon_type = "cgoo";

	this.target = get_nearest_monster({type: this.mon_type})
		
      // only targets without a target already
      if (!this.target || this.target.rip) {

        this.target = get_nearest_monster({ type: this.mon_type });
        
        if (!this.target) return;

        if ((!this.target.target == undefined) && (!is_friendly(this.target.target))) {
          change_target(null);
          return;
        }
        if (this.target) {
          change_target(this.target)
        }

        // if still no target, smart_move to monster
        if (!target) {
          set_message('No Monsters');

          // if moving/limiters: halt
          if (character.moving || smart.moving || this.thinking) return;
          this.thinking = true;

          smart_move(this.mon_type).then(
            success => {
              this.thinking = false;
            },
            failure => {
              this.thinking = false;
            }
          );
          return;
        }
      } // CODE BELOW HERE ASSUMES THERE IS A TARGET

      if (smart.moving || this.thinking) return;

      if (distance(character, this.target) > character.range * 0.9) {
        if (can_move_to(this.target.real_x, this.target.real_y)) {
          let half_x = character.real_x + (this.target.real_x - character.real_x) / 2;
          let half_y = character.real_y + (this.target.real_y - character.real_y) / 2;
          move(half_x, half_y);
        }
      }
      if (can_attack(this.target) && !parent.is_disabled(character)) {
        set_message('Attacking');
        manage_combat_skills(this.target);
        if (!is_on_cooldown('attack')) attack(this.target);
      }
      loot();
    }
  }


  sequence() {
    this.handle_death()
    if (!character.rip) {
      this.manage_inv()
      this.manage_task()
      this.manage_healing()
      //this.manage_buffs()
      this.manage_combat()
    }
  }


  loop() {
    this.sequence()
        
    // loop timeout
    setTimeout(() => {
      this.loop()
    }, 200);
  };
}



char = new Character;
char.mon_type = 'bigbird'
char.loop();