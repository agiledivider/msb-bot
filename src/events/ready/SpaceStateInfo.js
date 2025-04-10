const mqtt = require('mqtt')
var guild
var channel
var lastState
var statechanges = []

const client = mqtt.connect('mqtt://status.makerspacebonn.de', {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD
})

function checkChangeAbuse () {
  if (statechanges.length > 4) {
    statechanges = statechanges.filter(state => state.lastchange > (Date.now() / 1000 - 3600))
    console.log('statechanges', statechanges)
    if (statechanges.length > 4) {
      channel.send({
        content: 'Hör auf dauernd den Knopf zu drücken!'
      })
    }
  }
}

client.on('message', (topic, message) => {
  state = JSON.parse(message.toString())
  if (lastState === undefined) {
    lastState = state
    return
  }

  if (lastState.open === state.open && lastState.openUntil === state.openUntil) return

  statechanges.push(state)
  lastState = state
  statesting = state.open ? 'geöffnet.' : 'geschlossen.'
  if (state.open && state.openUntil) {
    channel.send({
      content: 'Der Makerspace ist ziemlich sicher bis ' + state.openUntil + ' ' + statesting
    })
  } else {
    channel.send({
      content: 'Der Makerspace ist nun ' + statesting
    })
  }

  console.log(message.toString())

  checkChangeAbuse()
})

client.on('connect', () => {
  console.log('connected to mqtt')
  client.subscribe('msb/state', (err) => {
    console.log('subscribed', err)
  })
})

client.on('error', (err) => {
  console.log('error', err)
})

client.on('close', () => {
  console.log('mqtt connection closed')
})

client.on('reconnect', () => {
  console.log('mqtt connection reconnected')
})

module.exports = async (client) => {

  var msb = {
    channelId: '1243903891951714394', // öffnungszeiten kanal
    guildId: '600336147142410254'
  }
  var test = {
    channelId: '1209460505706766381',
    guildId: '1209460505706766376'
  }

  if (client.user.id === '1319391085641994280') {
    conf = test
  } else {
    conf = msb
  }

  guild = client.guilds.cache.get(conf.guildId)
  channel = guild.channels.cache.get(conf.channelId)
}
