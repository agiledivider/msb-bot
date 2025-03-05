module.exports = {
  data: {
    name: 'muell',
    description: 'Nennt die nächsten Mülltermine.',
  },

  run: async ({ interaction, client }) => {
    x = await client.services.trashService.getNextTrashDates()
    message = "die nächsten Termine sind: \n"
    x.forEach(trashDate => {
      message += `${trashDate.timeString()} - ${trashDate.type}\n`
    })

    interaction.reply({
      content: message
    });
  },
  options: {
    devOnly: false,
    deleted: false,
  },
};