import {Client, Events, Interaction, MessageFlags, SlashCommandBuilder} from "discord.js";
import {CommandHandler,DiscordHandler} from "../../DiscordHandler/DiscordHandler";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema";

class MembercodeCommandHandler implements CommandHandler {
    command = new SlashCommandBuilder()
        .setName("membercode")
        .setDescription("a member can use a code to get the member role")
        .addStringOption(
            option => option.setName("code").setDescription("the code").setRequired(true)
        );


    async run(client: Client, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        const code = interaction.options.getString('code')
        const db = drizzle(process.env.DATABASE_URL as string, {schema, logger: true});
        const memberCode = await db.query.memberCodesTable.findFirst({with: {code: code}})
        console.log(memberCode)
        if (!memberCode) {
            interaction.editReply({content: "code not found"});
            return;
        }


        interaction.editReply({content: `Things have changed for you. Welcome to the makerspace`});



    }

    getName(): string {
        return "some test ready handler"
    }
}

export default MembercodeCommandHandler