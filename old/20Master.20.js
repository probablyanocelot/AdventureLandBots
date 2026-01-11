
function is_friendly(char_name) {
  
  //check if it's one of the accounts characters
  for(char of get_characters()){
      if(char.name === char_name){
          return true;
      }
  }

  return false;

}


character.on("cm", function(data) {

  if (!is_friendly(data.name)) return;

  log(data);


  switch (character.ctype) {

    case 'merchant':
      switch (data.message) {

        case data.message["unpack"]:
          if (character.moving || smart.moving || char.thinking) return;

          char.thinking = true;
          set_current_action('unpacking')
          smart_move(data.message["unpack"]).then(() => {
            char.do_cm(data.name, 'merch_arrived')
            // char.thinking = false;
          })
          break;
      }
    default:
      switch (data) {

        case 'merch_arrived':
          if (character.gold - 1000000 > 0) send_gold(merchant, character.gold - 1000000)
          // if (character.gold < 600000) ask_gold()
          unpack_to_merch()
          break;
      }
  }
}
)


function unpack_to_merch() {

  for (let i in character.items) {

    let slot = character.items[i];
    if (slot == null) continue;

    let item_name = slot.name;
    if (!whitelist_keep.includes(item_name) && !playBook[character.ctype]['keep'].includes(item_name)) {
      send_item(merchant, i, 9999);
    }
  }
}


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

function set_current_action(action) {
  log(`Requesting to update '${char.current_action}' to '${action}'`);
  if (!char.current_action && action) {
    char.current_action = action;
    char.idle_counter = 0;
  }	
}


function clear_current_action() {
  log(`Requesting to clear: ${char.current_action}`);
  if (char.current_action) {
    char.current_action = ""
  }
}


const merchant = 'VendorGuy';

const desired_potion_count = 500;
const desired_mp_pot = "mpot1"
const desired_hp_pot = "hpot1"


let whitelist_keep = ['hpot0', 'hpot1', 'mpot0', 'mpot1', 'tracker',]
let whitelist_sell = ['wattire', 'wbreeches', 'what', 'wgloves', 'wshoes']


let playBook = {

  'merchant': {},

  'paladin': {
    'keep': ['ololipop',],
  },

  'priest': {
    'keep': '',
  },

  'ranger': {
    'keep': '',
  },

  'rogue': {
    'keep': '',
  },

  'warrior': {
    'keep': '',
  },

};


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
    this.mon_type;
  
  }
  

  do_cm(name, code) {
    if (this.last_cm != null && new Date() - this.last_cm < 5000) {
      return;
    };
  
    if (character.ctype != "merchant") {
      switch (code) {
  
        case 'unpack':
          // let coordinates = { 'map': character.map, 'x': character.real_x, 'y': character.real_y }
          savePosition()
          let data = { "unpack": getPosition(character.id) };
          send_cm(merchant, data);
          this.last_cm = new Date();
          break;
        
        case 'merch_arrived':
          send_cm(name, code);
  
      }
    }
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
    if (character.moving || smart.moving || this.thinking) return;

    // get potions since we're out of one of them
    // determine how many we need to buy
    let HP_TO_BUY = desired_potion_count - quantity(desired_hp_pot);
    let MP_TO_BUY = desired_potion_count - quantity(desired_mp_pot);

    // go to the nearest potion seller & buy
    smart_move("potions").then(() => {
      this.sell_items();
      if (HP_TO_BUY > 0) buy_with_gold(desired_hp_pot,HP_TO_BUY);
      if (HP_TO_BUY > 0) buy_with_gold(desired_mp_pot, MP_TO_BUY);
      return;
    })
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
    if (character.esize <= 11 || this.dry()) {
      switch (character.ctype) {
        case 'merchant':
          this.get_pot();
          break;
        default:
          this.do_cm(merchant, 'unpack');
      };
    }
  }
  

  manage_healing() {
    if (character.ctype == "paladin") {
      if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp - 500) use(locate_item(desired_mp_pot));
      if (!is_on_cooldown("selfheal") && character.hp < character.max_hp - 200 && character.slots.mainhand.name != "ololipop") {
        if (character.mp > 100) {
            use_skill("selfheal", character)
        } else {
            use(locate_item(desired_mp_pot));
        }
        if (is_on_cooldown("selfheal") && !is_on_cooldown("regen_mp") && character.hp <= character.max_hp - 500) use(locate_item(desired_hp_pot)) 
      }
      if (character.slots.mainhand.name == "ololipop") {
            if (!is_on_cooldown("regen_hp") && character.hp <= character.max_hp - 400) use(locate_item(desired_hp_pot));
        }
        if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp) use_skill("regen_mp");
        return;
    } else {
      if (!is_on_cooldown("regen_hp") && character.hp <= character.max_hp - 400) use(locate_item(desired_hp_pot));
      if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp - 500) use(locate_item(desired_mp_pot));
    }
    if (!is_on_cooldown("regen_mp") && character.mp < character.max_mp) use_skill("regen_mp");
    if (!is_on_cooldown("regen_hp") && character.hp < character.max_hp) use_skill("regen_hp");
  }
  

  manage_combat() {
    if (character.ctype == "merchant") return;
    if (this.pvp) return;
       // if hit by player, focus the player & call the bois lul
    if (!this.pvp) {

      // until we have situational targets, define a target
      if (!this.mon_type) this.mon_type = "squig";

      let target = get_targeted_monster();
      if (!target) {

        // only targets without a target already
        target = get_nearest_monster({ type: this.mon_type, no_target: true, });
        if (target) {
          change_target(target)
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

      if (distance(character,target) > character.range * 0.9) {
        if (can_move_to(target.real_x, target.real_y)) {
          let half_x = character.real_x + (target.real_x - character.real_x) / 2;
          let half_y = character.real_y + (target.real_y - character.real_y) / 2;
          xmove(half_x, half_y);
        }
      }
      if (can_attack(target) && !is_on_cooldown('attack') && !parent.is_disabled(character)) {
        set_message('Attacking');
        attack(target);
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
char.loop();