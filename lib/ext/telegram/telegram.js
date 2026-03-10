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
/**
 * Example code to use in your Adventure Land bot to send messages to Telegram
 *
 * Replace YOUR_SERVER_URL with your actual webhook server URL
 */

// Configuration
const TELEGRAM_WEBHOOK_URL = "http://0.0.0.0:8000/post";

/**
 * Send a message to Telegram
 * @param {string} message - The message to send
 * @param {string} type - Message type (info, warning, error, loot, combat, etc.)
 */
function sendToTelegram(message, type = "info") {
  const payload = {
    message: message,
    character: character.name,
    type: type,
  };

  // Adventure Land provides the fetch_url helper
  fetch_url(TELEGRAM_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// Example usage in your Adventure Land bot:

// Send info message
sendToTelegram("Bot started successfully!", "info");

// Send loot notification
on("hit", (data) => {
  if (data.kill) {
    const gold = data.gold || 0;
    if (gold > 1000) {
      sendToTelegram(`💰 Killed ${data.monster} and got ${gold} gold!`, "loot");
    }
  }
});

// Send error notification
try {
  // your code
} catch (error) {
  sendToTelegram(`❌ Error: ${error.message}`, "error");
}

// Send level up notification
on("player", (data) => {
  if (data.level > character.level) {
    sendToTelegram(`🎉 Level up! Now level ${data.level}`, "info");
  }
});

// Send rare item notification
on("chest", (data) => {
  const item = get_entity(data.id);
  if (item && item.items) {
    const rare_items = item.items.filter((i) => i.level && i.level > 5);
    if (rare_items.length > 0) {
      const item_names = rare_items.map((i) => i.name).join(", ");
      sendToTelegram(`🎁 Found rare items: ${item_names}`, "loot");
    }
  }
});

// Death notification
on("death", (data) => {
  sendToTelegram(`💀 ${character.name} died!`, "error");
});

// Party invite notification
on("invite", (data) => {
  sendToTelegram(`📨 Party invite from ${data.name}`, "info");
});
