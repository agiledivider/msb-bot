import {
    Client,
    Events,
    GuildMember,
    Interaction,
    Message,
    Presence,
} from "discord.js";

export type DiscordEventMap = {
    [Events.ClientReady]: [client: Client];
    [Events.GuildMemberAdd]: [member: GuildMember];
    [Events.MessageCreate]: [message: Message];
    [Events.InteractionCreate]: [interaction: Interaction];
    [Events.PresenceUpdate]: [oldPresence: Presence | null, newPresence: Presence];
    // Add any other events you need
};
