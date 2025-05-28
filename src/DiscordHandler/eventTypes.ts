import {Events, GuildMember} from "discord.js";

export type ClientReadyEvent = {
    eventType: Events.ClientReady
}

export type GuildMemberAddEvent = {
    eventType: Events.GuildMemberAdd,
    newMember: GuildMember
}

