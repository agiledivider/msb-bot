const ical = require('node-ical')
const nodeSchedule = require('node-schedule');

var guild;
var channel;
var events = ical.sync.parseFile(__dirname + '/../../muell.ics')
var trashDates;

var daysInAdvance = 3


function findNextTrashDates () {
  trashDates = []
  for (const event of Object.values(events)) {
    if (event.summary?.val.match(/Bio|Gross/)) continue
    if (event.type !== 'VEVENT') continue
    const diff = (new Date()).valueOf() - (new Date(event.start)).valueOf()
    const daysUntil = Math.floor(diff / 1000 / 60 / 60 / 24)
    if (daysUntil < 0 && daysUntil > (-1 - daysInAdvance)) {
      var date = (new Date(event.start)).toLocaleString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Berlin'
      })

      trashDates.push({
        date: date,
        type: event.summary?.val,
        daysUntil
      })
    }
  }
  return trashDates.length > 0 ? trashDates : false
}

async function thereHasBeenNoInfoInTheLastDayOrNumberOfMessages () {
  if (!channel) {
    console.log('no channel')
    return
  }
  let found = false
  let messages = await channel.messages.fetch({ limit: 50 })
  messages.forEach(message => {

    if (message.author.id === guild.members.me.id && message.content.includes('[Müll]')) {
      yesterday = new Date(Date.now() - 86400000);
      if (new Date(message.createdTimestamp) > yesterday) {
        found = true
      }
    }
  })

  return !found
}

function sendTrashInfo () {
  trashDates.forEach(trashDate => {
    channel.send(`[Müll] Die Abfuhr von **${trashDate.type}** ist am **${trashDate.date}** in ${-trashDate.daysUntil} Tagen!`)
  })
  console.log('Send trash info')
}

async function informAboutTrash (guild, channel) {
  console.log('trash task')
  if (
    (trashDates = findNextTrashDates()) &&
    await thereHasBeenNoInfoInTheLastDayOrNumberOfMessages()
  ) {
    sendTrashInfo()
  }

}

const job = nodeSchedule.scheduleJob('*/10  * * * *', function(){
  informAboutTrash(guild, channel)
})




module.exports = async (client) => {

  var msb = {
    channelId: '600337356712575007',
    guildId: '600336147142410254'
  }
  var test = {
    channelId: '1209460505706766381',
    guildId: '1209460505706766376'
  }

  if (client.user.id == '1319391085641994280') {
    conf = test
  } else {
    conf = msb
  }

  guild = client.guilds.cache.get(conf.guildId)
  channel = guild.channels.cache.get(conf.channelId)
}
