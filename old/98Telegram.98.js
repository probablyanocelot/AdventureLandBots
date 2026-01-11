load_code('99Secrets')
// ! FOR USE OUTSIDE OF GAME
// let { CHAT_ID, http_token } = require('./99secrets.99.js');
// let XMLHttpRequest = require('xhr2');
// console.log(CHAT_ID)
// console.log(http_token)

// let { CHAT_ID, http_token } = require_code('99Secrets');

function send_tg_bot_message(message) {
    console.log("Sending message to Telegram");
    let xhr = new XMLHttpRequest();
    // prepend message with character name
    message = `[${character.name}] ${message}`;
    message = `${message}`;
    xhr.open("POST", `https://api.telegram.org/bot${http_token}/sendMessage?chat_id=${CHAT_ID}&text=${message}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
}
// send_tg_bot_message('hello')