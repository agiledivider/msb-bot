import { scheduleJob } from "node-schedule";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Interaction, Message} from "discord.js";
import { TrashDate } from "./TrashService";

export class TrashDiscordService {
    client: Client
    conf
    guild
    channel
    job
    private actionRequest: any;


    constructor(client : Client) {
        this.client = client

        var msb = {
            channelId: '600337356712575007', // #allgemein
            guildId: '600336147142410254',
            jobSchedule: "*/10 * * * *", // alle 10 minuten
            messageLimit: 30,
            reminderLimit: 10
        }
        var test = {
            channelId: '1209460505706766381', // #allgemein
            guildId: '1209460505706766376',
            jobSchedule: "*/10 * * * * *", // alle 10 sekunden
            messageLimit: 5,
            reminderLimit: 3
        }

        if (this.client?.user?.id == '1319391085641994280') {
            this.conf = test
        } else {
            this.conf = msb
        }
        this.guild = this.client.guilds.cache.get(this.conf.guildId)
        this.channel = this.guild.channels.cache.get(this.conf.channelId)
        const informAboutTrash = this.informAboutTrash.bind(this)
        this.job = scheduleJob(`${this.conf.jobSchedule}`, function(){
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
        await this.askForAction(trashDates)
        if (this.actionRequest != null && new Date(this.actionRequest.createdTimestamp).getDate() != new Date().getDate()) {
            if (this.actionRequest.components.length > 0) {
                this.actionRequest.edit({
                    content: this.actionRequest.content + "\nhat sich wohl niemand gekümmert :(",
                    components: []
                })
            }
            this.actionRequest = null
        }
    }

    private async askForAction(trashDates: TrashDate[]) {
        const trashTomorrow = trashDates.filter(trashDate => trashDate.daysUntil(new Date()) == 1)
        if (trashTomorrow.length > 0) {
            console.log("Today needs to be done something")
            if (this.actionRequest == null) {
                this.sendRequestForAction()
            } else {
                this.bringRequestToFront()
            }
        }
        return
    }

    async bringRequestToFront() {
        const messages = await this.channel.messages.fetch({ limit: 50 })
        const firstThreeMessages = Array.from(messages.values()).splice(0,3)

        let informedInTheLastMessages = false
        for (const message of firstThreeMessages) {
            if (message.author.bot && message.content.match(/Hast Du den Müll/i)) {
                informedInTheLastMessages = true
            }
        }
        if (informedInTheLastMessages) return
        for (const messageTuple of messages) {
            let [id, message] = messageTuple
            if (message.author.bot && message.content.match(/Hast Du den Müll/i)) {
                await message.delete()
            }
        }
        this.actionRequest = null
        this.sendRequestForAction()
    }

    async sendRequestForAction() {
        const firstButton = new ButtonBuilder()
            .setLabel('Hab ich gemacht')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('muell-gemacht');

        const secondButton = new ButtonBuilder()
            .setLabel('Hat jemand anderes gemacht')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('muell-gemacht-anders');

        const actionRow = new ActionRowBuilder().addComponents(firstButton, secondButton)

        this.actionRequest = await this.channel.send({
            content: `**Hast du den Müll rausgestellt?**`,
            components: [actionRow]
        });
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


    async handleButtonClick(interaction: Interaction) {
        if (!interaction.isButton())  return

        try {
            if (interaction.customId == 'muell-gemacht') {
                await interaction.reply(`**Danke sehr**, für's  Müll rausbringen, **${interaction.user.globalName}**`);
                this.actionRequest.edit({content: "Hast du den Müll rausgestellt?\nDone ✔", components: []})
            } else if (interaction.customId == 'muell-gemacht-anders') {
                await interaction.reply("**Danke sehr**, für's  Müll rausbringen, wer immer es auch gemacht hat.");
                this.actionRequest.edit({content: "Hast du den Müll rausgestellt?\nDone ✔", components: []})
            }
        } catch (e) {

        }
    }
}

