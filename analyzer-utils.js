// analyzer-utils.js — shared helpers

function getDaysSinceLastTx(timestamp) {
  if (!timestamp) return null;
  const nowInSeconds = Date.now() / 1000;
  return Math.floor((nowInSeconds - timestamp) / 86400);
}

module.exports = { getDaysSinceLastTx };