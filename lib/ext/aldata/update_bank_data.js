const { getEnv } = await require("../../al_env_config");

const ALDATA_KEY = getEnv("ALDATA_KEY") || "thisisnotmyrealkey";

const url = `https://aldata.earthiverse.ca/bank/${character.owner}/${ALDATA_KEY}`;
const settings = {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(character.bank),
};
// if response.status == 200, it was successfully updated
fetch(url, settings).then((response) => show_json(response.status));

module.exports = {
  update_bank_data: () =>
    fetch(url, settings).then((response) => show_json(response.status)),
};
