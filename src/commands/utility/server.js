module.exports = {
  data: {
    name: 'server',
    description: 'Provides information about the server.',
  },

  run: ({ interaction, client, handler }) => {
    interaction.reply({ content: `This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`,  ephemeral: true });
  },

  options: {
    devOnly: false,
    userPermissions: ['AddReactions'],
    botPermissions: ['AddReactions'],
    deleted: false,
  },
};