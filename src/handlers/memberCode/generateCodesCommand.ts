import {
    ApplicationCommandData,
    Client,
    Interaction,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import {CommandHandler} from "../../DiscordHandler/DiscordHandler";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema";
import {eq, and, isNull} from "drizzle-orm";

/* TODO
    - add a check if the user is allowed to use this command
    - remove db to repository
 */

export class GenerateCodesCommandHandler implements CommandHandler {

    command = new SlashCommandBuilder()
        .setName("generatemembercodes")
        .setDescription("generate new codes for people to become members in discord")
        .setDescriptionLocalizations({
            "de": "neue Mitgliedscodes generieren"
        })
        .addIntegerOption(option =>

            option.setName("amount")
                .setDescription("the amount of codes to generate (1-10")
                .setDescriptionLocalizations({
                    "de": "die Anzahl der Codes (1-10)"
                })
                .setMaxValue(10)
                .setMinValue(1)
                .setRequired(true)
        )
        .toJSON() as ApplicationCommandData

    async execute({ interaction, config }) {
        if (!interaction.isChatInputCommand()) return
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        if (!config.membercodes.allowedUsers.includes(interaction.user.id)) {
            interaction.editReply({content: "You are not allowed to use this command"});
            return
        }

        const amount = interaction.options.getInteger('amount')
        const db = drizzle(process.env.DATABASE_URL, {schema, logger: true});
        const codes = []
        for (let i = 0; i < amount; i++) {
            const memberCode = await db.insert(schema.memberCodesTable).values({
                code: this.generateVoucherCode(),
                guildId: interaction.guild.id,
            }).returning()
            console.log(memberCode)
            codes.push(memberCode[0].code + '-' +memberCode[0].id)
        }

        const codeList = codes.join("\n")
        interaction.editReply({content: `Ich habe folgende Codes generiert: \n\n${codeList}`});
    }

    async run(client: Client, interaction: Interaction): Promise<void> {
       console.log("colled the wrong listunusedcodes command handler")
    }

    getName(): string {
        return this.command.name
    }

    private generateVoucherCode(): string {
        const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const length = 6;
        let voucherCode = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            voucherCode += characters[randomIndex];
        }

        return voucherCode;
    }
}
