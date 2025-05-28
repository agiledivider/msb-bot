// Require the necessary discord.js classes
import { ChannelFlagsBitField } from 'discord.js'

require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js');
const { CommandKit } = require('commandkit');
const { join } = require('path')
const { TrashService, icsTrashRepository, RealDateService } = require('./Services/TrashService')
const { DiscordHandler } = require('./DiscordHandler/DiscordHandler')
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import * as schema from "./db/schema";

async function migrateDB() {
  console.log("migrating")
  const db = drizzle(process.env.DATABASE_URL, {schema})
  await migrate(db, {
    migrationsFolder: __dirname + "/db/migrations/",
    migrationsTable: "migrations",
    migrationsSchema: "makerspace_bot"
  });
  console.log("migration done")
}


try {
  //await migrateDB();
} catch (e) {
  console.log(e)
}

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



new CommandKit({
  client,
  devGuildIds: ['1209460505706766376'],
  devUserIds: ['529022599469203476'],
  eventsPath: `${__dirname}/events`,
  commandsPath: join(__dirname, 'commands'),
  bulkRegister: true,
})

const discordHandler = new DiscordHandler({
  client,
  handlerPath: join(__dirname, '/handlers/')
})

const realDateService = new RealDateService()
const trashService = new TrashService(new icsTrashRepository(__dirname + '/muell.ics', realDateService))

discordHandler.addService('dateService', realDateService)
discordHandler.addService('trashService', trashService)

import { drizzle } from 'drizzle-orm/node-postgres';
const db = drizzle(process.env.DATABASE_URL);



// services
client.services = {
  trashService,
  realDateService
}

client.on('ready', () => {
  console.log('Ready! ---------------------');
  const guilds = client.guilds.cache.map(guild => guild);
  for (const guildInfo of guilds) {
    console.log(guildInfo.id, guildInfo.name)
    console.log(guildInfo.members.me.permissions.serialize())
  }
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

let callAmount = 0;
process.on('SIGINT', function() {
  if(callAmount < 1) {
    console.log(`✅ The server has been stopped`, 'Shutdown information', 'This shutdown was initiated by CTRL+C.');
    setTimeout(() => process.exit(0), 1000);
  } else {
    console.log(`trying to stop for ${callAmount} times`)
  }
  callAmount++;
  client.destroy();
});