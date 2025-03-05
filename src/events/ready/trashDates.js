const ical = require('node-ical')
const nodeSchedule = require('node-schedule');
const { TrashDiscordService } = require('../../Services/trashDiscordService')

var guild;
var channel;
var events = ical.sync.parseFile(__dirname + '/../../muell.ics')
var trashDates;

var daysInAdvance = 3



module.exports = async (client) => {

  client.services.trashDiscordService = new TrashDiscordService(client)

}
