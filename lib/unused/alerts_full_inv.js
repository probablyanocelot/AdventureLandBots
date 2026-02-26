let full_time = 0;
let max_full_time = 180;

function alertSystem() {
  fullTimer();
}

function fullTimer() {
  // increment/reset if/not full
  if (character.esize > 1) full_time = 0;
  if (character.esize <= 1) full_time += 1;

  // schedule alert if full for longer than (s)
  if (full_time >= max_full_time) fullAlert();

  setTimeout(fullTimer, 1000);
}

let last_full_alert;

function fullAlert() {
  clear_last_full_alert();
  // 30 minute cooldown between alerts
  // let full_alert_cd = 3000
  let full_alert_cd = 30 * 60 * 1000;

  // don't send message if not enough full time has passed
  if (full_time <= 3 * 60) return;

  // don't send if still on cooldown
  if (last_full_alert && new Date() - last_full_alert < full_alert_cd) return;

  send_tg_bot_message(`I'm FULL as fuck dude, cmon man!`);
  last_full_alert = new Date();
}

function clear_last_full_alert() {
  if (last_full_alert && character.esize > 1) last_full_alert = undefined;
}

module.exports = {
  alertSystem,
  fullTimer,
  fullAlert,
  clear_last_full_alert,
};
