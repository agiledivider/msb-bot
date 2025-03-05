// Require the necessary discord.js classes
require('dotenv').config()
const { Client, Events, GatewayIntentBits, MessageFlagsStrings, MessageFlagsBitField } = require('discord.js');
const { CommandKit } = require('commandkit');
const { join } = require('path')
const { TrashService, icsTrashRepository, RealDateService } = require('./Services/TrashService')
const { TrashDiscordService } = require('./Services/trashDiscordService')

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ]
});

var commandKit = new CommandKit({
  client,
  devGuildIds: ['1209460505706766376'],
  devUserIds: ['529022599469203476'],
  eventsPath: `${__dirname}/events`,
  commandsPath: join(__dirname, 'commands'),
  bulkRegister: true,
})

// services
realDateService = new RealDateService()
client.services = {
  trashService:  new TrashService(new icsTrashRepository(__dirname + '/muell.ics', realDateService), realDateService),
}


let callAmount = 0;
process.on('SIGINT', function() {
  if(callAmount < 1) {
    console.log(`✅ The server has been stopped`, 'Shutdown information', 'This shutdown was initiated by CTRL+C.');
    setTimeout(() => process.exit(0), 1000);
  }
  callAmount++;
});


client.login(process.env.DISCORD_BOT_TOKEN);

process.on('SIGINT', function() {
  console.log('Do something useful here.');
  client.destroy();
});