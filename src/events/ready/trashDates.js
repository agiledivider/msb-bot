const { TrashDiscordService } = require('../../Services/trashDiscordService')

module.exports = async (client) => {
  client.services.trashDiscordService = new TrashDiscordService(client)
}
