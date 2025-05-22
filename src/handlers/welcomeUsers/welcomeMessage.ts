import {DiscordHandler, GuildMemberAddHandler} from "../../DiscordHandler/DiscordHandler";
import {Client, Events, GuildMember} from "discord.js";


export default class WelcomeMessage implements GuildMemberAddHandler{
    private channel: any;


    getName(): string {
        return "Welcome Message";
    }

    eventType: Events = Events.GuildMemberAdd
    run(client: Client, handler: DiscordHandler, newMember: GuildMember) {
        const welcomeMessages: string[] = [
            "**Willkommen [user]**! Schön, dass Du da bist."

        ];

        try {
            this.channel = newMember.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID)
            const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)].replace(/\[user]/g, `<@${newMember.id}>`);
            this.channel.send({
                content: message
            })
        } catch (e) {
            console.log(e)
        }
    }
}