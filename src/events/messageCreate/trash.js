var stickyMessageId = '1345154394613878918';
module.exports = async (message) => {
  if (message.author.bot) return;

  const fetchedMessages = await message.channel.messages.fetch();
  const stickyMessage = fetchedMessages.find(m => m.author.id === '1319391085641994280' && m.id === stickyMessageId);

  if (stickyMessage) {
    await stickyMessage.delete()
    const newMessage = await message.channel.send({
      content: stickyMessage.content,
      components: stickyMessage.components
    });
    stickyMessageId = newMessage.id
  }
};