import {
    ApplicationCommandData,
    Client,
    Interaction, InteractionContextType,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import {CommandHandler} from "../../DiscordHandler/DiscordHandler";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema";
import {eq, and, isNull} from "drizzle-orm";

export class ListUnusedCodesCommandHandler implements CommandHandler {

    command = new SlashCommandBuilder()
        .setName("listunusedcodes")
        .setDescription("Show the unused codes")
        .setDescriptionLocalizations({
            "de": "Zeigt die unbenutzten Codes an"
        })
        .setContexts([
            InteractionContextType.Guild
        ])
        .toJSON() as ApplicationCommandData

    async execute({ interaction, config, logger }) {
        if (!interaction.isChatInputCommand()) return
        if (interaction.context !== InteractionContextType.Guild) {
            interaction.reply({content: "This command can only be used in a guild"});
            return
        }
        if (!config.membercodes && !config.membercodes.allowedRole) {
             interaction
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        if (
            !config.membercodes?.allowedUsers.includes(interaction.user.id) &&
            !interaction.member.roles.cache.has(config.membercodes?.allowedRole)
        ) {
            interaction.editReply({content: "You are not allowed to use this command"});
            return
        }

        const db = drizzle(process.env.DATABASE_URL, {schema, logger: true});
        const unusedCodes = await db.query.memberCodesTable.findMany({where: (codes) =>
                and(
                    isNull(codes.usedAt),
                    isNull(codes.userId),
                    eq(codes.guildId, interaction.guild.id)
                )
        })

        let text = "";
        if (unusedCodes.length === 0) {
            interaction.editReply({content: "Keine Codes gefunden"});
            return
        }

        for (let i = 0; i < unusedCodes.length; i++) {
            text += unusedCodes[i].code + "-" + unusedCodes[i].id + "\n";
        }

        interaction.editReply({content: `Diese Codes sind noch nicht genutzt: \n${text}`});
    }

    async run(client: Client, interaction: Interaction): Promise<void> {
       console.log("colled the wrong listunusedcodes command handler")
    }

    getName(): string {
        return this.command.name
    }
}
