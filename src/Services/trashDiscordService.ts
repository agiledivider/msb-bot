import { scheduleJob } from "node-schedule";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Interaction, Message, MessageFlags} from "discord.js";
import {TrashDate, TrashService} from "./TrashService";
import {BaseLogger, Logger} from "pino";

export class TrashDiscordService {
    client: Client
    conf
    guild
    channel
    job
    logger: Logger
    private actionRequest: any
    actionDone: boolean = false
    currentText: number = 0
    private responses = [
        `Öhm, Du willst auch nur einfach Knöpfe drücken, oder [username]?`,
        `Wenn du oft genug clickst [username], dann fällt Dir vielleicht der Finger ab.`,
        `War klar, dass Du den Knopf drückst [username]. Du weisst halt nichts.`,
        `Lustig [username], genau so hat Skynet angefangen…`,
        `Drück weiter [username], vielleicht kommt ein neuer Highscore dabei raus!`,
        `Wenn du noch dreimal drückst [username], erscheint vielleicht ein Zauberer und gibt dir einen Keks.`,
        `Oh wow, du hast den nutzlosen Knopf gefunden. Herzlichen Glückwunsch, [username]!`,
        `Noch ein paar Mal und du beschwörst entweder einen Müll-Dämon oder Du musst vobeikommen und mal echt den Müll rausstellen,  [username].`,
        `Hmm, Du bist also ein Katzenmensch, [username]: Einfach mal alles antippen, was sich bewegt!`,
        `Glückwunsch [username], du hast das geheime Menü für Leute mit zu viel Langeweile gefunden.`,
        `Hör auf zu drücken, [username]! Knöpfe haben auch Gefühle!`,
        `Super [username], du hast den versteckten Cheat-Code aktiviert! Leider macht er nur, dass ich dich verspotte, Du Buttonista.`,
        `Ich weiss nicht, wie ich es Dir sagen soll, [username], aber Du hast nichts durchs Knopf drücken erreicht`,
        `Warum drückst Du den Knopf noch selbst, [username]? Du könntest es auch mit einem Servo und einem Pi automatisieren, Du faules Stück.`,
        `Herzlichen Glückwunsch, [username]! Du bist gerade zum Müllbeauftragen des Makerspaces geworden. Jetzt komm vorbei und stell den Müll raus.`
    ]
    private trashService: TrashService;

    constructor(client : Client, trashService: TrashService, logger: Logger) {
        this.client = client
        this.trashService = trashService
        this.logger = logger.child({}, {msgPrefix: `[${this.constructor.name}] `})
        this.responses
        var msb = {
            channelId: '600337356712575007', // #allgemein
            guildId: '600336147142410254',
            jobSchedule: "*/10 * * * *", // alle 10 minuten
            messageLimit: 30,
            reminderLimit: 10
        }
        const config = require('../../msb.config.json');
        if (this.client?.user?.id == '1319391085641994280') {
            this.conf = config.trashInfo
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
        this.logger.debug('trash task %o', new Date())
        var trashDates = await this.trashService.getNextTrashDates();
        if (
            trashDates &&
            await this.thereHasBeenNoInfoInTheLastDayOrNumberOfMessages()
        ) {
            this.sendTrashInfo(trashDates)
        }
        await this.askForAction(trashDates)
        if (this.actionRequest) {
            this.logger.debug("%o, %s, %s",
                new Date(this.actionRequest.createdTimestamp).getDate() != new Date().getDate(),
                new Date(this.actionRequest.createdTimestamp).getDate(),
                new Date().getDate()
            )
        }
        if (this.actionRequest != null && new Date(this.actionRequest.createdTimestamp).getDate() != new Date().getDate()) {
            this.logger.debug("removing old request")
            if (this.actionRequest.components.length > 0) {
                this.actionRequest.edit({
                    content: this.actionRequest.content + "\nhat sich wohl niemand gekümmert :(",
                    components: []
                })
            }
            this.actionDone = false
            this.actionRequest = null
        }
    }

    private async askForAction(trashDates: TrashDate[]) {
        const trashTomorrow = trashDates.filter(trashDate => trashDate.daysUntil(new Date()) == 1)
        if (trashTomorrow.length > 0 && !this.actionDone) {
            const trashTypes = trashTomorrow.map(t => t.type).join(', ')
            this.logger.debug("Today needs to be done something")
            if (this.actionRequest == null) {
                this.sendRequestForAction(trashTypes)
            } else {
                this.bringRequestToFront(trashTypes)
            }
        }
    }

    async bringRequestToFront(trashTypes) {
        const messages = await this.channel.messages.fetch({ limit: 50 })
        const firstThreeMessages = Array.from(messages.values()).splice(0,3)

        let informedInTheLastMessages = false
        for (const message of firstThreeMessages as Message[]) {
            if (message.author.bot && message.content.match(/Hast Du den Müll/i)) {
                informedInTheLastMessages = true
            }
        }
        if (informedInTheLastMessages) return
        for (const messageTuple of messages) {
            let message = messageTuple [1]
            if (message.author.bot && message.content.match(/Hast Du den Müll/i)) {
                try {
                    await message.delete()
                } catch (e) {
                    this.logger.error("delete error", e)
                }
            }
        }
        this.sendRequestForAction(trashTypes)
    }

    async sendRequestForAction(trashTypes: string = null) {
        const firstButton = new ButtonBuilder()
            .setLabel('Hab ich gemacht')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('muell-gemacht');

        const secondButton = new ButtonBuilder()
            .setLabel('Hat jemand anderes gemacht')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('muell-gemacht-anders');

        const thirdButton = new ButtonBuilder()
            .setLabel('Weiß nicht')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('muell-gemacht-keine-ahnung');

        const actionRow = new ActionRowBuilder().addComponents(firstButton, secondButton, thirdButton)
        trashTypes = trashTypes ? ` (${trashTypes})` : ''
        this.actionRequest = await this.channel.send({
            content: `**Hast du den Müll rausgestellt?** Denn morgen kommt die Müllabfuhr! ${trashTypes}`,
            components: [actionRow]
        });
    }


    sendTrashInfo (trashDates: TrashDate[]) {
        this.logger.debug('Send trash info')
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
                this.actionRequest.edit({content: this.actionRequest.content + "\nDone ✔", components: []})
                this.actionDone = true
            } else if (interaction.customId == 'muell-gemacht-anders') {
                await interaction.reply("**Danke sehr**, für's  Müll rausbringen, wer immer es auch gemacht hat.");
                this.actionRequest.edit({content: this.actionRequest.content + "\nDone ✔", components: []})
                this.actionDone = true
            } else if (interaction.customId == 'muell-gemacht-keine-ahnung') {
                const responses = [
                    `Öhm, Du willst auch nur einfach Knöpfe drücken, oder ${interaction.user.globalName}?`,
                    `Wenn du oft genug clickst ${interaction.user.globalName}, dann fällt Dir vielleicht der Finger ab.`,
                    `War klar, dass Du den Knopf drückst ${interaction.user.globalName}. Du weisst halt nichts.`,
                    `Lustig ${interaction.user.globalName}, genau so hat Skynet angefangen…`,
                    `Drück weiter ${interaction.user.globalName}, vielleicht kommt ein neuer Highscore dabei raus!`,
                    `Wenn du noch dreimal drückst ${interaction.user.globalName}, erscheint vielleicht ein Zauberer und gibt dir einen Keks.`,
                    `Oh wow, du hast den nutzlosen Knopf gefunden. Herzlichen Glückwunsch, ${interaction.user.globalName}!`,
                    `Noch ein paar Mal und du beschwörst entweder einen Müll-Dämon oder Du musst vobeikommen und mal echt den Müll rausstellen,  ${interaction.user.globalName}.`,
                    `Hmm, Du bist also ein Katzenmensch, ${interaction.user.globalName}: Einfach mal alles antippen, was sich bewegt!`,
                    `Glückwunsch ${interaction.user.globalName}, du hast das geheime Menü für Leute mit zu viel Langeweile gefunden.`,
                    `Hör auf zu drücken, ${interaction.user.globalName}! Knöpfe haben auch Gefühle!`,
                    `Super ${interaction.user.globalName}, du hast den versteckten Cheat-Code aktiviert! Leider macht er nur, dass ich dich verspotte, Du Buttonista.`,
                    `Ich weiss nicht, wie ich es Dir sagen soll, ${interaction.user.globalName}, aber Du hast nichts durchs Knopf drücken erreicht`,
                    `Warum drückst Du den Knopf noch selbst, ${interaction.user.globalName}? Du könntest es auch mit einem Servo und einem Pi automatisieren, Du faules Stück.`,
                    `Herzlichen Glückwunsch, ${interaction.user.globalName}! Du bist gerade zum Müllbeauftragen des Makerspaces geworden. Jetzt komm vorbei und stell den Müll raus.`
                ]
                const response = responses[this.currentText]
                this.currentText = (this.currentText + 1) % responses.length
                await interaction.reply({
                    content: response,
                    flags: MessageFlags.Ephemeral
                })
            }
        } catch (e) {

        }
    }
}

