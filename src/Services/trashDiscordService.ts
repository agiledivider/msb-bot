import { scheduleJob } from "node-schedule";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Message} from "discord.js";
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



    async informAboutTrash() {
        console.log('trash task ', new Date())
        var trashDates = await this.client.services.trashService.getNextTrashDates();
        if (
            trashDates &&
            await this.thereHasBeenNoInfoInTheLastDayOrNumberOfMessages()
        ) {
            this.sendTrashInfo(trashDates)
        }
        this.askForAction(trashDates)
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


/*

const { ButtonBuilder, ActionRowBuilder, ButtonStyle, MessageCollector } = require('discord.js')
module.exports = {
    data: {
        name: 'testmuell',
        description: 'Provides information about the server.',
    },

    run: async ({ interaction, client, handler }) => {
        const firstButton = new ButtonBuilder()
            .setLabel('Hab ich gemacht')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('muell-gemacht');

        const actionRow = new ActionRowBuilder().addComponents(firstButton)

        const response = await interaction.reply({
            content: `Hast du den Muell gemacht?`,
            components: [actionRow],
            withResponse: true,
        });


        const collectorFilter = i => i.user.id === interaction.user.id;
        try {
            //console.log(response.resource)
            const confirmation = await response.resource.message.awaitMessageComponent({
                filter: collectorFilter,
                time: 10_000
            });

            if (confirmation.customId === 'muell-gemacht') {
                await confirmation.update({
                    content: `${interaction.user.username} hat den Müll rausgestellt. Danke sehr!`,
                    components: []
                });
            } else {
                await confirmation.deleteReply();
            }
        } catch (error) {
            console.log('Error', error);
            console.log(JSON.stringify(error))
            //await interaction.editReply({ content: 'Confirmation not received within time, cancelling', components: [] });
            //interaction.deleteReply()
        }
    },

    options: {
        devOnly: true,
        userPermissions: [],
        botPermissions: [],
        deleted: false,
    },
};

*/
