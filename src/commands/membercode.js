const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { drizzle } = require('drizzle-orm/node-postgres')
const schema = require('../db/schema')
const appConfig = require('../../msb.config.json')
const { eq } = require('drizzle-orm')
const { MembercodeCommandHandler } = require('../handlers/memberCode/membercodeCommand')



const membercodeCommandHandler = new MembercodeCommandHandler()

module.exports = {
  data: membercodeCommandHandler.command,

  run: async ({ interaction, client, handler }) => {
    await membercodeCommandHandler.run(client, interaction)
  },

  options: {
    devOnly: false,
    deleted: false,
  },
};