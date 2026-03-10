function update_char_data() {
  const ALDATA_KEY = "thisisnotmyrealkey";
  const url = `https://aldata.earthiverse.ca/character/${character.id}/${ALDATA_KEY}`;
  const update = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      in: character.in,
      items: character.items,
      party: character.party,
      rip: character.rip,
      serverIdentifier: parent.server_identifier,
      serverRegion: parent.server_region,
      slots: character.slots,
      s: character.s,
      x: character.x,
      y: character.y,
    }),
  };
  // if response.status == 200, it was successfully updated
  return fetch(url, update).then((response) => show_json(response.status));
}

module.exports = {
  update_char_data,
};
