const ical = require('node-ical')
var events = ical.sync.parseFile(__dirname + '/../../muell.ics')

module.exports = {
  data: {
    name: 'muell',
    description: 'Nennt die nächsten Mülltermine.',
  },

  run: ({ interaction, client, handler }) => {
    let trashDates = {}

    for (const event of Object.values(events)) {
      if (event.summary?.val.match(/Bio|Gross/)) continue
      if (event.type !== 'VEVENT') continue
      if (event.start < Date.now()) continue

      let type = event.summary?.val.trim().toLowerCase()
      if (type && !trashDates[type]) {
        trashDates[type] = {
          type: event.summary?.val.trim(),
          date: event.start,
        }
      } else if (type && trashDates[type].date > event.start) {
        trashDates[type] = {
          type: event.summary?.val.trim(),
          date: event.start,
        }
      }
    }

    x = []
    for (const event of Object.values(trashDates)) {
      x.push(event)
    }
    x.sort((a, b) => a.date - b.date)

    message = "die nächsten Termine sind: \n"
    x.forEach(trashDate => {
      message += `${(new Date(trashDate.date)).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' , day: '2-digit', month: '2-digit'})} - ${trashDate.type}\n`
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