function send_telegram(key, message) {
  console.log("Sending message to Telegram");
  let xhr = new XMLHttpRequest();
  // prepend message with character name
  message = `[${character.name}] ${message}`;
  message = `${message}`;
  xhr.open(
    "POST",
    `https://api.telegram.org/bot${key}/sendMessage?chat_id=${CHAT_ID}&text=${message}`,
    true,
  );
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send();
}
