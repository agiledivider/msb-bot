module.exports = (oldPresence, presence) => {
  if (oldPresence?.status === presence?.status) return
  console.log(`${presence.user.globalName} ist nun ${presence?.status} (${oldPresence?.status}) at ${(new Date()).toLocaleString('de-DE')}`);
};