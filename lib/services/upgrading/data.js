const isUpBlacklisted = (itemName) => {
  if (badList.includes(itemName)) return true;
  if (destroyList.includes(itemName)) return true;
  if (failList.includes(itemName)) return true;
  if (vendorList.includes(itemName)) return true;
  if (specialList.includes(itemName)) return true;
  return false;
};

module.exports = {
  
    isUpBlacklisted,
};