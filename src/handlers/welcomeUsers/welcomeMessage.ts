import {DiscordHandler, GuildMemberAddHandler} from "../../DiscordHandler";
import {Client, Events, GuildMember} from "discord.js";

export default class WelcomeMessage implements GuildMemberAddHandler{
    private channel: any;
    getName(): string {
        return "Welcome Message";
    }
    eventType: Events.GuildMemberAdd = Events.GuildMemberAdd
    run(client: Client, handler: DiscordHandler, newMember: GuildMember) {
        try {
            this.channel = newMember.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID)
            this.channel.send({
                content: `**Willkommen ${newMember.displayName}**! Schön, dass Du da bist.`
            })
        } catch (e) {
            console.log(e)
        }
    }
}