import {DiscordHandler, GuildMemberAddHandler, GuildMemberUpdateHandler} from "../../DiscordHandler/DiscordHandler";
import {Client, Events, GuildMember, TextChannel} from "discord.js";
const config = require('../../../msb.config')
import { readFile } from "fs/promises";

export default class MemberWelcomeMessage implements GuildMemberUpdateHandler {
    constructor() {
        this.run = this.run.bind(this);
    }

    getName(): string {
        return "Welcome Message";
    }

    eventType: Events = Events.GuildMemberUpdate

    run(client: Client, handler: DiscordHandler, oldMember: GuildMember, newMember: GuildMember) {
        console.log("member update called")
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            // Roles were added or removed
            this.handleRoleChange(oldMember, newMember);
        }
    }


    handleRoleChange(oldMember: GuildMember, newMember: GuildMember) : void {
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));

        addedRoles.forEach(async role => {
            if (role.id === config.newMemberWelcome.roleId) {
                const channel = newMember.guild.channels.cache.get(config.newMemberWelcome.channelId);
                if (channel && channel instanceof TextChannel) {
                    channel.send(`Begrüsst ${newMember} als neustes Mitglied im MakerSpace!`);
                }
                const welcomeMessage = await readFile(__dirname + "/welcomeDM.md", 'utf-8');
                try {
                    console.log("send DM")
                    await newMember.send({
                        content: welcomeMessage.replace('[user]', `<@${newMember.id}>`)
                    })
                    console.log("DM sent")
                } catch (e) {
                    console.log(e)
                }

            }
        });

    }

}