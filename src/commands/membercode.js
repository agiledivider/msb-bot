const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { drizzle } = require('drizzle-orm/node-postgres')
const schema = require('../db/schema')
const appConfig = require('../../config')
const { eq } = require('drizzle-orm')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercode')
    .setDescription('Enter your member code and instantly get accepted as full makerspace member in discord')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('the code')
        .setRequired(true)
    ),

  run: async ({ interaction, client, handler }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const code = interaction.options.getString('code')
    let [code_part1, code_part2] = code.split("-")
    if ( parseInt(code_part2).toString() != code_part2) {
      interaction.editReply({content: `Der Code **${code}** ist ungueltig.`})
      return
    }

    const db = drizzle(process.env.DATABASE_URL, {schema, logger: true})

    const memberCode = await db.query.memberCodesTable.findFirst({where: (codes, {eq}) =>eq(codes.code, code_part1) && eq(codes.id, code_part2)})

    if(interaction.member.roles.cache.has(appConfig.membercodes.roleId)) {
      interaction.editReply({
        content: 'Du bist doch schon Mitglied. Hör auf rumzuspielen.'
      })
      return
    }

    if (!memberCode) {
      interaction.editReply({content: `Den Code **${code}** haben wir leider nicht gefunden.`});
      return;
    }
    if(memberCode.userId) {
      interaction.editReply({content: `Der Code **${code}** wurde bereits verwendet.`});
      return
    }

    console.log(code_part2)
    const x = await db.update(schema.memberCodesTable)
      .set({userId: interaction.user.id, usedAt: new Date()})
      .where(eq(schema.memberCodesTable.id, code_part2))
    console.log(x)


    interaction.guild.members.cache.get(interaction.user.id).roles.add(appConfig.membercodes.roleId)


    interaction.editReply({content: `Es haben sich Dinge für Dich verändert, <@${interaction.user.id}>. Willkommen im Mitgliederbereich! Ab nun solltest Du mehr sehen können bei den Discord Kanälen. Und noch mehr Info schickt Dir TinkerBlade.`});
  },

  options: {
    devOnly: false,
    deleted: false,
  },
};