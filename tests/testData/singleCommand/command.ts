import {ApplicationCommandData, Client, Events, Interaction, SlashCommandBuilder} from "discord.js";
import {CommandHandler,DiscordHandler} from "../../../src/DiscordHandler/DiscordHandler";

class MembercodeCommandHandler implements CommandHandler {
    command = new SlashCommandBuilder()
        .setName("membercode")
        .setDescription("a member can use a code to get the member role")
        .addStringOption(option => 
            option.setName("code")
                .setDescription("the code")
                .setRequired(true)
        )
        .toJSON() as ApplicationCommandData;


    async run(client: Client, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return
        await interaction.reply("test")
    }

    getName(): string {
        return "member code handler"
    }

    commandJson() {
        return this.command
    }

}

export default MembercodeCommandHandler