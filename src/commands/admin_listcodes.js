const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { drizzle } = require('drizzle-orm/node-postgres')
const schema = require('../db/schema')
const config = require('../../msb.config.json')
const { isNull } = require('drizzle-orm')
const {eq, and} = require("drizzle-orm")


module.exports = {
  data:  new SlashCommandBuilder()
    .setName("listunusedcodes")
    .setDescription("Show the unused codes"),

  run: async ({ interaction }) => {
    if (!interaction.isChatInputCommand()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    if (!config.membercodes.allowedUsers.includes(interaction.user.id)) {
      interaction.editReply({content: "You are not allowed to use this command"});
      return
    }


    const db = drizzle(process.env.DATABASE_URL, {schema, logger: true});
    const unusedCodes = await db.query.memberCodesTable.findMany({where: (codes) =>
      and(
        isNull(codes.usedAt),
        isNull(codes.userId),
        eq(codes.guildId, interaction.guild.id)
      )
    })
    console.log(unusedCodes)

    let text = "";
    if (unusedCodes.length === 0) {
      interaction.editReply({content: "Keine Codes gefunden"});
      return
    }

    for (let i = 0; i < unusedCodes.length; i++) {
      text += unusedCodes[i].code + "-" + unusedCodes[i].id + "\n";
    }

    interaction.editReply({content: `Diese Codes sind noch nicht genutzt: \n${text}\n`});
  },

  options: {
    devOnly: false,
    deleted: false,
  },
};





