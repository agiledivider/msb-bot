const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { drizzle } = require('drizzle-orm/node-postgres')
const schema = require('../db/schema')
const config = require('../../msb.config.json')

function generateVoucherCode() {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const length = 6;
  let voucherCode = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    voucherCode += characters[randomIndex];
  }

  return voucherCode;
}

module.exports = {
  data:  new SlashCommandBuilder()
    .setName("generatemembercodes")
    .setDescription("a member can use a code to get the member role")
    .addIntegerOption(option =>

      option.setName("amount")
        .setDescription("the amount of codes to generate")
        .setMaxValue(10)
        .setMinValue(1)
        .setRequired(true)
    ),

  run: async ({ interaction, client, handler }) => {
    if (!interaction.isChatInputCommand()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    if (!config.membercodes.allowedUsers.includes(interaction.user.id)) {
      interaction.editReply({content: "You are not allowed to use this command"});
      return
    }

    const amount = interaction.options.getInteger('amount')
    const db = drizzle(process.env.DATABASE_URL, {schema, logger: true});
    const codes = []
    for (let i = 0; i < amount; i++) {
      const memberCode = await db.insert(schema.memberCodesTable).values({
        code: generateVoucherCode(),
        guildId: interaction.guild.id,
      }).returning()
      console.log(memberCode)
      codes.push(memberCode[0].code + '-' +memberCode[0].id)
    }

    const codeList = codes.join("\n")
    interaction.editReply({content: `Things have changed for you. \n${codeList}\nWelcome to the makerspace`});



  },

  options: {
    devOnly: false,
    deleted: false,
  },
};





