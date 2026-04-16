function upgradeCost(itemName, basePrice) {
  const url = `https://aldata.earthiverse.ca/upgrade/${itemName}/${basePrice}`;

  fetch(url)
    .then((response) => response.json())
    .then((rawData) => {
      // Create a new object with formatted values
      const formattedData = {};

      for (const level in rawData) {
        const entry = rawData[level];
        formattedData[level] = {
          new_price: Math.round(entry.new_price).toLocaleString(),
          resulting_chance: entry.resulting_chance.toFixed(4),
          resulting_grace: entry.resulting_grace.toFixed(2),
          scroll: entry.scroll,
          offering: entry.offering,
          stacks: entry.stacks,
        };
      }

      show_json({
        item: itemName,
        basePrice: basePrice.toLocaleString(),
        upgradeData: formattedData,
      });
    })
    .catch((err) => {
      console.log(`Error fetching upgrade cost: ${err}`);
    });
}

module.exports = {
  upgradeCost,
};
