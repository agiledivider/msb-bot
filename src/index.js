const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { join } = require('path')
const { TrashService, icsTrashRepository, RealDateService } = require('./Services/TrashService')
const { DiscordHandler } = require('./DiscordHandler/DiscordHandler')
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import * as schema from "./db/schema";
import pino from 'pino'
import { drizzle } from 'drizzle-orm/node-postgres';
import { TrashDiscordService } from './Services/trashDiscordService'
const config = require('../msb.config.json')

// check environment variables
// check config
// migrate DB
// initialize services
// - logger
// - trashService
// - trashDiscordService
// - discordHandler
// initialize client
// start client


async function migrateDB() {
  logger.info("migrating")
  const db = await drizzle(process.env.DATABASE_URL, {schema})
  await migrate(db, {
    migrationsFolder: __dirname + "/db/migrations/",
    migrationsTable: "migrations",
    migrationsSchema: "makerspace_bot"
  });
  logger.info("migration done")
}



const logger = pino({
  level: 'trace',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})


try {
  await migrateDB();
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
    GatewayIntentBits.DirectMessages,

  ],
  'partials': [Partials.Channel]
});



const discordHandler = new DiscordHandler({
  client,
  handlerPath: join(__dirname, '/handlers/'),
  registerCommands: true,
  config,
  logger
})


const realDateService = new RealDateService()
const trashRepository = new icsTrashRepository(__dirname + '/muell.ics', realDateService)
const trashService = new TrashService(trashRepository, realDateService)

discordHandler.addService('dateService', realDateService)
discordHandler.addService('trashService', trashService)
discordHandler.addService('config', config)
discordHandler.addService('logger', logger)


client.on('ready', () => {
  logger.info('Client Ready! ---------------------');
  const trashDiscordService = new TrashDiscordService(client, trashService, logger)
  logger.debug("discord trash service registered")
  discordHandler.addService('trashDiscordService', trashDiscordService)

  const guilds = client.guilds.cache.map(guild => guild);
  for (const guildInfo of guilds) {
    // console.log(guildInfo.id, guildInfo.name)
    // console.log(guildInfo.members.me.permissions.serialize())
  }
  logger.info(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

let callAmount = 0;
process.on('SIGINT', function() {
  if(callAmount < 1) {
    logger.info(`✅ The server has been stopped, This shutdown was initiated by CTRL+C.'`);
    setTimeout(() => process.exit(0), 1000);
  } else {
    logger.info(`trying to stop for ${callAmount} times`)
  }
  callAmount++;
  client.destroy();
});