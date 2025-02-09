module.exports = (client) => {
  console.log(`${client.user.username} is ready!`);

  const Guilds = client.guilds.cache.map(guild => guild.id + " - " + guild.name);


  //const MSB_ID = '600336147142410254';
  //var me = client.guilds.cache.get(MSB_ID).members.me;
  console.log(Guilds);
  //console.log(me.permissions.serialize())

};