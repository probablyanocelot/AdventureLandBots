// ! TODO: MAKE BLOCKABLE ACTIONS DICT (for 'exchange', 'craft', etc)
log("3 - Merchant"); // display load_code() page number for debugging purposes

load_code("16Relations");
load_code("1Main"); // main
load_code("11Npcs"); // NPCS - buyFromPonty()/Goblin
load_code("14Partying");
load_code("19Management");
load_code("40Gui");
load_code("46BankOverview");
load_code("98Telegram");

//load_code(53) // upgrade_all2 WILL ADD MORE
//performance_trick();

const { webFrame } = require("electron");
webFrame.setZoomFactor(0.75);

class Merchant extends Character {
  constructor() {
    super();
    // !!! NEED LOGIC TO USE PICK/ROD, IF EXISTS
    this.rod;
    this.pick;
    this.stand;
    this.counter = 0;
    this.exchange;

    // loops on init
    setInterval(this.regen, 500);
    setInterval(this.buff("mluck"), 1000);
  }

  loop() {
    // in-game status report
    if (this.current_action && this.counter % 5 == 0)
      log(`Processing loop with action: ${this.current_action}`);

    this.stander(); // close stand if moving

    // if we ripped, respawn and reset
    if (character.rip) {
      respawn();
      log("Rip! Respawn clear");
      this.clear_current_action();
      this.thinking = false; // most blocking state
    } else {
      simple_craft();
      craft_master();

      buyScrolls();
      // this.gatheringHelper();
      if (character.moving) this.idle_counter = 0;
      this.fixActionStuck();
      this.incrementCounter();

      // loot();

      this.merch_pots();

      this.go_exchange();

      if (!this.current_action) {
        this.manage_slots();
        doBankUpdate();

        //below, add if(this.rod/pick) fish/mine
        if (
          locate_item("rod") >= 0 ||
          (character.slots.mainhand && character.slots.mainhand.name == "rod")
        )
          this.do_action("fishing");
        if (
          locate_item(
            "pickaxe" ||
              (character.slots.mainhand &&
                character.slots.mainhand.name == "pickaxe"),
          ) >= 0
        )
          this.do_action("mining");
        this.bank_mining();
      }

      if (character.bank && this.idle_counter > 30 && !smart.moving)
        smart_move(this.home);

      // if (this.idle_counter / 90 == 0 ) buyFromPonty()

      if (this.idle_counter > 60 * 3) {
        this.do_runs();
      }
    }

    setTimeout(() => {
      this.loop();
    }, 1000);
  }

  incrementCounter() {
    // reset idle if exchanging
    // if (character.q.exchange) this.idle_counter = 0 // only without computer
    // increment counter when we're doing nothing
    if (
      !this.current_action ||
      this.current_action == "unpacking" ||
      this.current_action == "banking"
    ) {
      this.idle_counter += 1;
      // log(`Idle: ${this.idle_counter}`);
      set_message(`Idle: ${this.idle_counter}`);
    }
  }

  fixActionStuck() {
    if (this.current_action != "unpacking" && this.current_action != "banking")
      return;
    if (this.idle_counter >= 20) this.clear_current_action();
  }

  manage_slots() {
    let broom = "broom";
    // broom when no action, or not mining/fishing
    if (this.current_action != "fishing" && this.current_action != "mining")
      this.equipItem(broom, "mainhand");
  }

  merch_pots() {
    if (character.esize == 0) return;
    if (parent.character.q.upgrade || parent.character.q.compound) {
      if (locate_item("mpot1") > -1) return;
      buy_with_gold("mpot1", 9999);
      return;
    }
  }

  async get_pots(pots) {
    if (this.current_action == "get_pots") return;
    let lastAction = this.current_action;

    // if (smart.moving) return
    let HP_TYPE = pots.h.type;
    let HP_DESIRED = pots.h.qty;
    let MP_TYPE = pots.m.type;
    let MP_DESIRED = pots.m.qty;

    let HP_TO_BUY = HP_DESIRED - quantity(HP_TYPE);
    let MP_TO_BUY = MP_DESIRED - quantity(MP_TYPE);

    // don't have enough potions -> go get some
    if (HP_TO_BUY > 0 || MP_TO_BUY > 0) {
      if (locate_item("computer") < 0) {
        if (this.current_action != "get_pots")
          this.set_current_action("get_pots");
        await smart_move("potions");
        log("at potions");
        // get potions since we're out of one of them
      }
      if (HP_TO_BUY > 0) buy_with_gold(HP_TYPE, HP_TO_BUY);
      if (MP_TO_BUY > 0) buy_with_gold(MP_TYPE, MP_TO_BUY);
      if (lastAction == "unpacking") {
        this.set_current_action("unpacking");
      } else {
        this.clear_current_action();
      }
      return;
    }
  }
}
