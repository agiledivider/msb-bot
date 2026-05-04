import { Client, Events, GuildMember, Interaction, Message } from "discord.js";

export type DiscordEventMap = {
    [Events.ClientReady]: [client: Client];
    [Events.GuildMemberAdd]: [member: GuildMember];
    [Events.MessageCreate]: [message: Message];
    [Events.InteractionCreate]: [interaction: Interaction];
    // Add any other events you need
};
