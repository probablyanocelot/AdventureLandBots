// Implemented in architecture:
// - Window zoom preference: lib/bootstrap/index.js (applyZoomPreference)
// - Merchant keybind installer: lib/services/merchant/keybinds.js
// - Merchant mass exchange upkeep: lib/services/merchant/mass_exchange.js
// - Merchant mluck upkeep + near-expiry refresh: lib/services/merchant/mluck.js
// - Merchant emotion emitter: lib/services/merchant/emotion_emitter.js
// - Bot coordination boundaries: lib/services/cm/*, lib/services/party/*, lib/services/orchestrator/*
// - Bank/inventory management + crafting: lib/services/merchant_role/bank_crafting.js
// - Bank overview GUI bootstrap: lib/services/merchant/bank_overview_loader.js
// - Telegram notifier (secrets-driven): lib/services/merchant/telegram_notifier.js
// - Bank hanoi compaction: lib/services/merchant/bank_hanoi.js
// - Inventory compounding: lib/services/merchant/compounder.js
// - citizen0 search+lure integration: lib/services/farming/kane.js + merchant behavior hook
// - Rare mob search/alerts: lib/services/merchant/rare_mob_scanner.js
// - Discount buys from nearby player stands: lib/services/merchant/discount_buyer.js
