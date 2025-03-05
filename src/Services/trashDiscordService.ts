import { scheduleJob } from "node-schedule";
import { Client } from "discord.js";
import { TrashDate } from "./TrashService";

export class TrashDiscordService {
    client: any
    conf
    guild
    channel
    job


    constructor(client : Client) {
        this.client = client



        var msb = {
            channelId: '600337356712575007', // #allgemein
            guildId: '600336147142410254',
            everyMinutes: 10,
            messageLimit: 30
        }
        var test = {
            channelId: '1209460505706766381', // #allgemein
            guildId: '1209460505706766376',
            everyMinutes: 1,
            messageLimit: 5
        }

        if (this.client?.user?.id == '1319391085641994280') {
            this.conf = test
        } else {
            this.conf = msb
        }
        this.guild = this.client.guilds.cache.get(this.conf.guildId)
        this.channel = this.guild.channels.cache.get(this.conf.channelId)
        var informAboutTrash = this.informAboutTrash.bind(this)
        this.job = scheduleJob(`*/${this.conf.everyMinutes} * * * *`, function(){
            informAboutTrash()
        })

    }

    async informAboutTrash() {
        console.log('trash task ', new Date())
        var trashDates = await this.client.services.trashService.getNextTrashDates();
        if (
            trashDates &&
            await this.thereHasBeenNoInfoInTheLastDayOrNumberOfMessages()
        ) {
            this.sendTrashInfo(trashDates)
        }
    }

    sendTrashInfo (trashDates: TrashDate[]) {
        console.log('Send trash info')
        trashDates.forEach(trashDate => {
            if (trashDate.daysUntil(new Date()) > 3) return
            this.channel.send(`[Müll] Die Abfuhr von **${trashDate.type}** ist am **${trashDate.timeString()}** in ${trashDate.daysUntil(new Date())} Tagen!`)
        })
    }

    async thereHasBeenNoInfoInTheLastDayOrNumberOfMessages () {
        if (!this.channel) {
            console.log('no channel')
            return
        }
        let found = false
        let messages = await this.channel.messages.fetch({ limit: this.conf.messageLimit })
        messages.forEach(message => {
            if (message.author.id === this.guild.members.me.id && message.content.includes('[Müll]')) {
                var yesterday = new Date(Date.now() - 86400000);
                if (new Date(message.createdTimestamp) > yesterday) {
                    found = true
                }
            }
        })

        return !found
    }


}
