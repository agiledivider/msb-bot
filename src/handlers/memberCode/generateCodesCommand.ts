import {
    ApplicationCommandData, AttachmentBuilder,
    Client,
    Interaction,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import {CommandHandler} from "../../DiscordHandler/DiscordHandler";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema";
import {CodePdf} from "./codePdf";

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
        .setContexts([
            InteractionContextType.Guild
        ])
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
        if (
            !config.membercodes.allowedUsers.includes(interaction.user.id) &&
            !interaction.member.roles.cache.has(config.membercodes.allowedRole)
        ) {
            interaction.editReply({content: "You are not allowed to use this command"});
            return
        }

        const amount = interaction.options.getInteger('amount')
        const db = drizzle(process.env.DATABASE_URL, {schema, logger: true});
        const codes = []
        let from,to
        for (let i = 0; i < amount; i++) {
            const memberCode = await db.insert(schema.memberCodesTable).values({
                code: this.generateVoucherCode(),
                guildId: interaction.guild.id,
            }).returning()
            console.log(memberCode)
            codes.push(memberCode[0].code + '-' +memberCode[0].id)
            if (i == 0) from = memberCode[0].id
            if (i == amount-1) to = memberCode[0].id
        }

        const codeList = codes.join("\n")

        const doc = new CodePdf(codes)
        const attachment = new AttachmentBuilder(await doc.getPdfBuffer(), { name: `MSB-membercodes-${from}-${to}.pdf` });

        await interaction.editReply({
            content: 'Here are the codes and a PDF:\n'+codeList,
            files: [attachment]
        });

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
